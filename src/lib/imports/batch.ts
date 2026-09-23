import { codePointLength, contentHash, searchText } from '@/lib/contracts/text';
import type {
  DatePrecision,
  ImportDisposition,
  ImportSourceType,
  Provenance,
  PublicationEvidence,
} from '@/lib/contracts/vocabulary';
import { candidateIdentities, reconcile, type ReconcilableReply } from './identity';
import { IMPORT_LIMITS } from '@/lib/contracts/limits';
import type {
  AdapterValidationStatus,
  ImportAdapter,
  ImportDatabase,
  ImportRecord,
  ImportWarningCode,
  ParsedRecord,
  SqlRunner,
} from './types';

/**
 * Resumable, bounded, idempotent batching (C04, IMP-01, IMP-04).
 *
 * Three decisions carry this module:
 *
 *   * **a batch is identified by the file, not by the run.** A file hash plus an
 *     adapter version names the same batch on every attempt, so a second run of
 *     the same file continues or repeats that batch instead of starting a rival
 *     one whose counts would double the first one's;
 *   * **a chunk is the unit of commitment.** Each bounded chunk writes its rows,
 *     its dispositions and its checkpoint in one transaction, so a crash leaves
 *     a checkpoint that is true rather than one that is ahead of the data;
 *   * **a bad row is a disposition, not an exception.** Nothing about one
 *     unparsable record discards the records on either side of it.
 *
 * Idempotency is not delegated to the checkpoint. A rerun of a finished batch
 * restarts from the beginning deliberately, so that every record has to be
 * recognised again through the identity rules. A checkpoint that skips the work
 * would make the import look idempotent without ever testing whether it is.
 */

export interface ImportRunOptions {
  db: ImportDatabase;
  adapter: ImportAdapter;
  records: Iterable<ParsedRecord>;
  sourceFileHash: string;
  /**
   * Explicit owner scoping for a connection that has no session. Omitted under a
   * session, where `auth.uid()` and row level security already answer this.
   */
  ownerId?: string;
  chunkSize?: number;
  /** Reads and classifies, writes nothing. */
  dryRun?: boolean;
  /**
   * Stops after this many chunks, leaving the batch open at its checkpoint. Used
   * to reproduce an interrupted import without killing the process.
   */
  stopAfterChunks?: number;
}

export interface ImportCounts {
  seen: number;
  imported: number;
  duplicate: number;
  needsReview: number;
  invalid: number;
}

export interface ImportRunResult {
  batchId: string | null;
  sourceType: ImportSourceType;
  adapterVersion: string;
  adapterStatus: AdapterValidationStatus;
  status: 'completed' | 'interrupted' | 'dry_run';
  /** Ordinal the run started after. Non-zero means it continued a checkpoint. */
  resumedAfterOrdinal: number;
  counts: ImportCounts;
  warningCodes: Partial<Record<ImportWarningCode, number>>;
  /** Earliest and latest dates the records themselves proved. */
  dateRange: { earliest: string | null; latest: string | null };
  unknownDates: number;
  missingContext: number;
}

interface BatchRow {
  id: string;
  status: string;
  checkpoint: { last_ordinal?: number } | null;
}

interface ExistingReplyRow {
  id: string;
  provenance: Provenance;
  publication_evidence: PublicationEvidence;
  date_precision: DatePrecision;
  posted_at: string | null;
  posted_date: string | null;
  source_timezone: string | null;
  native_reply_id: string | null;
  reply_url: string | null;
}

/** Always aliased, because one of the lookups below joins a table that also has `id`. */
const REPLY_COLUMNS = `
  r.id,
  r.provenance::text as provenance,
  r.publication_evidence::text as publication_evidence,
  r.date_precision::text as date_precision,
  r.posted_at,
  r.posted_date,
  r.source_timezone,
  r.native_reply_id,
  r.reply_url
`;

/**
 * The key an import item is filed under.
 *
 * An export-issued record id is used when there is one, so that the same record
 * arriving in a second export file resolves to the row the first file created.
 * Otherwise the key falls back to the file hash and the position inside it,
 * which identifies a rerun of the same file and nothing else.
 */
function itemLocator(sourceType: ImportSourceType, fileHash: string, locator: string): string {
  return `${sourceType}#loc:${fileHash.slice(0, 16)}:${locator}`;
}

function recordLocator(record: ImportRecord): string {
  if (record.sourceRecordId) return `${record.sourceType}#rec:${record.sourceRecordId}`;
  return itemLocator(record.sourceType, record.sourceFileHash, record.locator);
}

/** Dates and precision must agree, because the database check will not fix them. */
function dateShapeIsValid(record: ImportRecord): boolean {
  switch (record.datePrecision) {
    case 'timestamp':
      return record.postedAt !== null && record.postedDate === null;
    case 'date_only':
      return record.postedDate !== null && record.postedAt === null;
    case 'unknown':
      return record.postedAt === null && record.postedDate === null;
  }
}

/** Everything worth flagging about an otherwise importable record. */
function qualityWarnings(record: ImportRecord): ImportWarningCode[] {
  const warnings: ImportWarningCode[] = [...record.warnings];
  const add = (code: ImportWarningCode): void => {
    if (!warnings.includes(code)) warnings.push(code);
  };

  if (record.datePrecision === 'unknown') add('unknown_date');
  if (record.datePrecision === 'date_only' && !record.sourceTimezone) {
    add('date_only_unknown_timezone');
  }
  if (record.targetText === null) add('missing_target_context');
  if (record.targetKind === 'comment' && record.parentText === null) add('missing_parent_text');
  if (record.publicationEvidence === 'unknown') add('missing_publication_evidence');
  if (record.replyUrl !== null && !record.replyUrlVerified) add('reply_url_unverified');

  const tier = candidateIdentities(record)[0]?.tier;
  if (tier === 'file_locator') add('no_stable_identity');
  if (tier === 'source_record_id') add('weak_identity_only');

  return warnings;
}

interface RunContext {
  ownerId: string;
  dryRun: boolean;
  /** Target posts created during this run, so one target is not created twice. */
  targets: Map<string, string>;
}

async function resolveOwner(q: SqlRunner, ownerId: string | undefined): Promise<string> {
  const { rows } = await q.query<{ owner_id: string | null }>(
    `select coalesce($1::uuid, (select auth.uid()))::uuid as owner_id`,
    [ownerId ?? null],
  );
  const resolved = rows[0]?.owner_id ?? null;
  if (!resolved) {
    throw new Error(
      'No owner for this import. A session-less connection must be given an owner id explicitly.',
    );
  }
  return resolved;
}

async function findExistingReply(
  q: SqlRunner,
  ctx: RunContext,
  record: ImportRecord,
): Promise<ExistingReplyRow | null> {
  for (const identity of candidateIdentities(record)) {
    if (identity.tier === 'native_reply_id' && record.nativeReplyId) {
      const { rows } = await q.query<ExistingReplyRow>(
        `select ${REPLY_COLUMNS} from public.reply_library r
         where r.user_id = $1 and r.platform = $2::public.platform and r.native_reply_id = $3
         limit 1`,
        [ctx.ownerId, record.platform, record.nativeReplyId],
      );
      if (rows[0]) return rows[0];
    }
    if (identity.tier === 'verified_reply_url' && record.replyUrl) {
      const { rows } = await q.query<ExistingReplyRow>(
        `select ${REPLY_COLUMNS} from public.reply_library r
         where r.user_id = $1 and r.reply_url = $2
         limit 1`,
        [ctx.ownerId, record.replyUrl],
      );
      if (rows[0]) return rows[0];
    }
    if (identity.tier === 'source_record_id' || identity.tier === 'file_locator') {
      // Tier three and tier four both resolve through the item ledger, which is
      // the only place a source-issued id or a file position is remembered.
      const { rows } = await q.query<ExistingReplyRow>(
        `select ${REPLY_COLUMNS} from public.reply_library r
         join public.import_items i on i.user_id = r.user_id and i.reply_id = r.id
         where i.user_id = $1 and i.source_locator = $2
         limit 1`,
        [
          ctx.ownerId,
          identity.tier === 'source_record_id'
            ? `${record.sourceType}#rec:${record.sourceRecordId}`
            : itemLocator(record.sourceType, record.sourceFileHash, record.locator),
        ],
      );
      if (rows[0]) return rows[0];
    }
  }
  return null;
}

async function ensureTargetPost(
  q: SqlRunner,
  ctx: RunContext,
  record: ImportRecord,
): Promise<string | null> {
  // With no reference and no text there is nothing to record about the target,
  // and inventing a placeholder row would claim context the export did not have.
  if (!record.targetRef && !record.targetText && !record.sourceUrl) return null;

  const cacheKey = record.targetRef ?? record.sourceUrl ?? `${record.sourceType}:${record.locator}`;
  const cached = ctx.targets.get(cacheKey);
  if (cached) return cached;

  if (record.sourceUrl) {
    const { rows } = await q.query<{ id: string }>(
      `select id from public.source_posts
       where user_id = $1 and source_url = $2 and from_import
       limit 1`,
      [ctx.ownerId, record.sourceUrl],
    );
    if (rows[0]) {
      ctx.targets.set(cacheKey, rows[0].id);
      return rows[0].id;
    }
  }

  const { rows } = await q.query<{ id: string }>(
    `insert into public.source_posts
       (user_id, platform, target_kind, source_text, parent_text, source_url, from_import)
     values ($1, $2::public.platform, $3::public.target_kind, $4, $5, $6, true)
     returning id`,
    [
      ctx.ownerId,
      record.platform,
      record.targetKind,
      record.targetText,
      record.parentText,
      record.sourceUrl,
    ],
  );
  const id = rows[0]!.id;
  ctx.targets.set(cacheKey, id);
  return id;
}

async function insertReply(
  q: SqlRunner,
  ctx: RunContext,
  record: ImportRecord,
  provenance: Provenance,
): Promise<string> {
  const sourcePostId = await ensureTargetPost(q, ctx, record);
  const { rows } = await q.query<{ id: string }>(
    `insert into public.reply_library (
       user_id, source_post_id, platform, final_text, search_text, provenance,
       publication_evidence, posted_at, posted_date, date_precision, source_timezone,
       native_reply_id, reply_url, content_hash
     ) values (
       $1, $2::uuid, $3::public.platform, $4, $5, $6::public.provenance,
       $7::public.publication_evidence, $8::timestamptz, $9::date,
       $10::public.date_precision, $11, $12, $13, $14
     )
     returning id`,
    [
      ctx.ownerId,
      sourcePostId,
      record.platform,
      record.exactText,
      searchText(record.exactText),
      provenance,
      record.publicationEvidence,
      record.postedAt,
      record.postedDate,
      record.datePrecision,
      record.sourceTimezone,
      record.nativeReplyId,
      record.replyUrl,
      contentHash(record.exactText),
    ],
  );
  const replyId = rows[0]!.id;

  // Lexical search has to work the moment a reply exists, or an imported archive
  // is invisible to the feature it was imported for. The vector for it is the
  // embedding worker's job and its absence changes nothing here.
  await q.query(
    `insert into public.search_documents (user_id, entity_kind, entity_id, text_hash, search_text)
     values ($1, 'reply'::public.search_entity_kind, $2, $3, $4)
     on conflict (user_id, entity_kind, entity_id)
     do update set text_hash = excluded.text_hash, search_text = excluded.search_text`,
    [ctx.ownerId, replyId, contentHash(record.exactText), searchText(record.exactText)],
  );

  return replyId;
}

async function applyReconciliation(
  q: SqlRunner,
  ctx: RunContext,
  existing: ExistingReplyRow,
  changes: Partial<ReconcilableReply>,
): Promise<void> {
  const assignments: string[] = [];
  const params: unknown[] = [ctx.ownerId, existing.id];
  const push = (column: string, value: unknown, cast = ''): void => {
    params.push(value);
    assignments.push(`${column} = $${params.length}${cast}`);
  };

  if (changes.provenance !== undefined) push('provenance', changes.provenance, '::public.provenance');
  if (changes.publicationEvidence !== undefined) {
    push('publication_evidence', changes.publicationEvidence, '::public.publication_evidence');
  }
  if (changes.datePrecision !== undefined) {
    push('date_precision', changes.datePrecision, '::public.date_precision');
    push('posted_at', changes.postedAt ?? null, '::timestamptz');
    push('posted_date', changes.postedDate ?? null, '::date');
    push('source_timezone', changes.sourceTimezone ?? null);
  }
  if (changes.nativeReplyId !== undefined) push('native_reply_id', changes.nativeReplyId);
  if (changes.replyUrl !== undefined) push('reply_url', changes.replyUrl);

  if (assignments.length === 0) return;

  await q.query(
    `update public.reply_library set ${assignments.join(', ')}
     where user_id = $1 and id = $2`,
    params,
  );
}

async function disposeRecord(
  q: SqlRunner,
  ctx: RunContext,
  parsed: ParsedRecord,
): Promise<{ disposition: ImportDisposition; warnings: ImportWarningCode[]; replyId: string | null }> {
  if (parsed.outcome === 'invalid') {
    return { disposition: 'invalid', warnings: parsed.warnings, replyId: null };
  }
  if (parsed.outcome === 'needs_review') {
    return { disposition: 'needs_review', warnings: parsed.warnings, replyId: null };
  }

  const record = parsed.record;
  const warnings = qualityWarnings(record);

  if (record.exactText.trim() === '') {
    return { disposition: 'invalid', warnings: [...warnings, 'empty_text'], replyId: null };
  }
  if (codePointLength(record.exactText) > IMPORT_LIMITS.maxRecordTextCodePoints) {
    return { disposition: 'invalid', warnings: [...warnings, 'text_too_long'], replyId: null };
  }
  if (!dateShapeIsValid(record)) {
    return { disposition: 'invalid', warnings: [...warnings, 'malformed_record'], replyId: null };
  }
  if (record.provenance === null) {
    // An unrecognised provenance is the case C02 reserves for review. Choosing the
    // nearest canonical value here is how an AI draft becomes a posted reply.
    return { disposition: 'needs_review', warnings: [...warnings, 'unknown_provenance'], replyId: null };
  }

  const existing = await findExistingReply(q, ctx, record);
  if (existing) {
    const result = reconcile(
      {
        provenance: existing.provenance,
        publicationEvidence: existing.publication_evidence,
        datePrecision: existing.date_precision,
        postedAt: existing.posted_at,
        postedDate: existing.posted_date,
        sourceTimezone: existing.source_timezone,
        nativeReplyId: existing.native_reply_id,
        replyUrl: existing.reply_url,
      },
      record,
    );
    if (result.conflict) {
      return {
        disposition: 'needs_review',
        warnings: [...warnings, ...result.warnings],
        replyId: existing.id,
      };
    }
    if (!ctx.dryRun) await applyReconciliation(q, ctx, existing, result.changes);
    return {
      disposition: 'duplicate',
      warnings: [...warnings, ...result.warnings],
      replyId: existing.id,
    };
  }

  if (ctx.dryRun) return { disposition: 'imported', warnings, replyId: null };

  const replyId = await insertReply(q, ctx, record, record.provenance);
  return { disposition: 'imported', warnings, replyId };
}

function countWarnings(
  into: Partial<Record<ImportWarningCode, number>>,
  codes: readonly ImportWarningCode[],
): void {
  for (const code of codes) into[code] = (into[code] ?? 0) + 1;
}

function chunked<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** The date the record itself proved, for the coverage range. Null when unproven. */
function provenDate(record: ImportRecord): string | null {
  if (record.datePrecision === 'timestamp' && record.postedAt) {
    return record.postedAt.slice(0, 10);
  }
  if (record.datePrecision === 'date_only' && record.postedDate) {
    return record.postedDate.slice(0, 10);
  }
  return null;
}

export async function runImport(options: ImportRunOptions): Promise<ImportRunResult> {
  const { db, adapter, records, sourceFileHash } = options;
  const chunkSize = options.chunkSize ?? IMPORT_LIMITS.defaultChunkSize;
  const dryRun = options.dryRun ?? false;

  const counts: ImportCounts = { seen: 0, imported: 0, duplicate: 0, needsReview: 0, invalid: 0 };
  const warningCodes: Partial<Record<ImportWarningCode, number>> = {};
  let earliest: string | null = null;
  let latest: string | null = null;
  let unknownDates = 0;
  let missingContext = 0;

  // Materialised here rather than inside a transaction so that parsing a large
  // file never holds one open, and so an ordinal is stable across a resume.
  const all = [...records];

  let batchId: string | null = null;
  let resumedAfterOrdinal = 0;

  if (!dryRun) {
    const prepared = await db.transaction(async (q) => {
      const ownerId = await resolveOwner(q, options.ownerId);
      const { rows } = await q.query<BatchRow>(
        `select id, status::text as status, checkpoint from public.import_batches
         where user_id = $1 and source_type = $2::public.import_source_type
           and source_file_hash = $3 and adapter_version = $4
         order by created_at desc limit 1`,
        [ownerId, adapter.sourceType, sourceFileHash, adapter.adapterVersion],
      );

      const found = rows[0];
      if (!found) {
        const created = await q.query<{ id: string }>(
          `insert into public.import_batches (user_id, source_type, source_file_hash, adapter_version)
           values ($1, $2::public.import_source_type, $3, $4)
           returning id`,
          [ownerId, adapter.sourceType, sourceFileHash, adapter.adapterVersion],
        );
        return { ownerId, id: created.rows[0]!.id, startAfter: 0, restarted: false };
      }

      if (found.status === 'open') {
        return {
          ownerId,
          id: found.id,
          startAfter: found.checkpoint?.last_ordinal ?? 0,
          restarted: false,
        };
      }

      // A finished batch is run again from the start, with its counters cleared,
      // so the counts describe this run and every record is re-identified.
      await q.query(
        `update public.import_batches
         set status = 'open'::public.import_status, checkpoint = '{}'::jsonb,
             count_seen = 0, count_imported = 0, count_duplicate = 0,
             count_needs_review = 0, count_invalid = 0, completed_at = null
         where user_id = $1 and id = $2`,
        [ownerId, found.id],
      );
      return { ownerId, id: found.id, startAfter: 0, restarted: true };
    });

    batchId = prepared.id;
    resumedAfterOrdinal = prepared.startAfter;
    if (prepared.startAfter > 0) countWarnings(warningCodes, ['checkpoint_resumed']);
    if (prepared.restarted) countWarnings(warningCodes, ['batch_restarted']);

    const pending = all
      .map((parsed, index) => ({ ordinal: index + 1, parsed }))
      .filter((entry) => entry.ordinal > prepared.startAfter);

    const chunks = chunked(pending, chunkSize);
    let processedChunks = 0;

    for (const chunk of chunks) {
      if (options.stopAfterChunks !== undefined && processedChunks >= options.stopAfterChunks) {
        return {
          batchId,
          sourceType: adapter.sourceType,
          adapterVersion: adapter.adapterVersion,
          adapterStatus: adapter.validationStatus,
          status: 'interrupted',
          resumedAfterOrdinal,
          counts,
          warningCodes,
          dateRange: { earliest, latest },
          unknownDates,
          missingContext,
        };
      }

      const chunkResult = await db.transaction(async (q) => {
        const ctx: RunContext = { ownerId: prepared.ownerId, dryRun: false, targets: new Map() };
        const local: ImportCounts = {
          seen: 0,
          imported: 0,
          duplicate: 0,
          needsReview: 0,
          invalid: 0,
        };
        const localWarnings: ImportWarningCode[] = [];
        const localDates: string[] = [];
        let localUnknownDates = 0;
        let localMissingContext = 0;
        let lastOrdinal = prepared.startAfter;

        for (const entry of chunk) {
          const outcome = await disposeRecord(q, ctx, entry.parsed);
          local.seen += 1;
          if (outcome.disposition === 'imported') local.imported += 1;
          if (outcome.disposition === 'duplicate') local.duplicate += 1;
          if (outcome.disposition === 'needs_review') local.needsReview += 1;
          if (outcome.disposition === 'invalid') local.invalid += 1;
          localWarnings.push(...outcome.warnings);

          if (entry.parsed.outcome === 'record') {
            const day = provenDate(entry.parsed.record);
            if (day) localDates.push(day);
            else localUnknownDates += 1;
            if (entry.parsed.record.targetText === null) localMissingContext += 1;
          }

          const locator =
            entry.parsed.outcome === 'record'
              ? recordLocator(entry.parsed.record)
              : itemLocator(adapter.sourceType, sourceFileHash, entry.parsed.locator);
          const sourceHash =
            entry.parsed.outcome === 'record'
              ? contentHash(entry.parsed.record.exactText)
              : contentHash(locator);

          await q.query(
            `insert into public.import_items
               (user_id, batch_id, source_locator, source_hash, disposition, reply_id, warning_codes)
             values ($1, $2, $3, $4, $5::public.import_disposition, $6::uuid, $7::text[])
             on conflict (user_id, batch_id, source_locator) do update
             set disposition = excluded.disposition,
                 source_hash = excluded.source_hash,
                 reply_id = coalesce(excluded.reply_id, public.import_items.reply_id),
                 warning_codes = excluded.warning_codes`,
            [
              ctx.ownerId,
              prepared.id,
              locator,
              sourceHash,
              outcome.disposition,
              outcome.replyId,
              outcome.warnings,
            ],
          );

          lastOrdinal = entry.ordinal;
        }

        // Counters and checkpoint move with the rows, inside the same transaction.
        // A checkpoint written separately would eventually be ahead of the data.
        await q.query(
          `update public.import_batches
           set count_seen = count_seen + $3, count_imported = count_imported + $4,
               count_duplicate = count_duplicate + $5, count_needs_review = count_needs_review + $6,
               count_invalid = count_invalid + $7, checkpoint = $8::jsonb
           where user_id = $1 and id = $2`,
          [
            ctx.ownerId,
            prepared.id,
            local.seen,
            local.imported,
            local.duplicate,
            local.needsReview,
            local.invalid,
            JSON.stringify({ last_ordinal: lastOrdinal }),
          ],
        );

        return {
          local,
          localWarnings,
          localDates,
          localUnknownDates,
          localMissingContext,
        };
      });

      counts.seen += chunkResult.local.seen;
      counts.imported += chunkResult.local.imported;
      counts.duplicate += chunkResult.local.duplicate;
      counts.needsReview += chunkResult.local.needsReview;
      counts.invalid += chunkResult.local.invalid;
      countWarnings(warningCodes, chunkResult.localWarnings);
      unknownDates += chunkResult.localUnknownDates;
      missingContext += chunkResult.localMissingContext;
      for (const day of chunkResult.localDates) {
        if (earliest === null || day < earliest) earliest = day;
        if (latest === null || day > latest) latest = day;
      }

      processedChunks += 1;
    }

    await db.transaction(async (q) => {
      await q.query(
        `update public.import_batches
         set status = 'completed'::public.import_status, completed_at = now()
         where user_id = $1 and id = $2`,
        [prepared.ownerId, prepared.id],
      );
    });

    return {
      batchId,
      sourceType: adapter.sourceType,
      adapterVersion: adapter.adapterVersion,
      adapterStatus: adapter.validationStatus,
      status: 'completed',
      resumedAfterOrdinal,
      counts,
      warningCodes,
      dateRange: { earliest, latest },
      unknownDates,
      missingContext,
    };
  }

  await db.transaction(async (q) => {
    const ownerId = await resolveOwner(q, options.ownerId);
    const ctx: RunContext = { ownerId, dryRun: true, targets: new Map() };
    for (const parsed of all) {
      const outcome = await disposeRecord(q, ctx, parsed);
      counts.seen += 1;
      if (outcome.disposition === 'imported') counts.imported += 1;
      if (outcome.disposition === 'duplicate') counts.duplicate += 1;
      if (outcome.disposition === 'needs_review') counts.needsReview += 1;
      if (outcome.disposition === 'invalid') counts.invalid += 1;
      countWarnings(warningCodes, outcome.warnings);

      if (parsed.outcome === 'record') {
        const day = provenDate(parsed.record);
        if (day) {
          if (earliest === null || day < earliest) earliest = day;
          if (latest === null || day > latest) latest = day;
        } else {
          unknownDates += 1;
        }
        if (parsed.record.targetText === null) missingContext += 1;
      }
    }
  });

  return {
    batchId: null,
    sourceType: adapter.sourceType,
    adapterVersion: adapter.adapterVersion,
    adapterStatus: adapter.validationStatus,
    status: 'dry_run',
    resumedAfterOrdinal: 0,
    counts,
    warningCodes,
    dateRange: { earliest, latest },
    unknownDates,
    missingContext,
  };
}

/**
 * Turns a plain SQL connection into a transaction factory.
 *
 * The verification harness supplies its own, because a PGlite transaction is a
 * callback. A script holding one client gets this instead, and a failure rolls
 * back rather than leaving a chunk half written.
 */
export function transactionalDatabase(runner: SqlRunner): ImportDatabase {
  return {
    async transaction<T>(fn: (q: SqlRunner) => Promise<T>): Promise<T> {
      await runner.query('begin');
      try {
        const result = await fn(runner);
        await runner.query('commit');
        return result;
      } catch (error) {
        await runner.query('rollback');
        throw error;
      }
    },
  };
}
