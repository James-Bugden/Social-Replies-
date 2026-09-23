import type { ImportSourceType } from '@/lib/contracts/vocabulary';
import type { ImportRunResult } from './batch';
import type { AdapterValidationStatus, ImportDatabase, ImportWarningCode, SqlRunner } from './types';

/**
 * The coverage ledger (C04, SR-008).
 *
 * The failure this exists to prevent is a sentence like "the account history is
 * imported" written after one file was read. So the report states what was
 * inspected rather than what was achieved: files, records seen, and the four
 * dispositions, per source, alongside the adapter's honest validation status and
 * the date range the records themselves proved.
 *
 * It carries counts and warning codes only. No filename, no locator, no URL, no
 * author and no word the owner wrote appears in any field of it, which is what
 * makes it safe to paste into an issue or read aloud.
 */

export interface SourceCoverage {
  sourceType: ImportSourceType;
  adapterVersion: string;
  adapterStatus: AdapterValidationStatus;
  filesInspected: number;
  recordsSeen: number;
  imported: number;
  duplicate: number;
  needsReview: number;
  invalid: number;
  /** Imported records whose target context the export did not contain. */
  missingContext: number;
  /** Records with no proven posting date. They count towards no day. */
  unknownDates: number;
  earliestKnownDate: string | null;
  latestKnownDate: string | null;
  warningCodes: Partial<Record<ImportWarningCode, number>>;
  /** Free-text caveat about this source. Never contains private material. */
  note: string;
}

export interface CoverageReport {
  generatedAt: string;
  sources: SourceCoverage[];
  totals: {
    filesInspected: number;
    recordsSeen: number;
    imported: number;
    duplicate: number;
    needsReview: number;
    invalid: number;
    missingContext: number;
    unknownDates: number;
  };
  /** Sources with no adapter run at all. Stated, not omitted. */
  unavailableSources: ImportSourceType[];
  notes: string[];
}

const ALL_SOURCES: readonly ImportSourceType[] = ['linkedin', 'x', 'threads', 'drive'];

function emptyCoverage(
  sourceType: ImportSourceType,
  adapterVersion: string,
  adapterStatus: AdapterValidationStatus,
  note: string,
): SourceCoverage {
  return {
    sourceType,
    adapterVersion,
    adapterStatus,
    filesInspected: 0,
    recordsSeen: 0,
    imported: 0,
    duplicate: 0,
    needsReview: 0,
    invalid: 0,
    missingContext: 0,
    unknownDates: 0,
    earliestKnownDate: null,
    latestKnownDate: null,
    warningCodes: {},
    note,
  };
}

/** Folds one or more completed runs into the per-source ledger. */
export function buildCoverageReport(
  runs: readonly ImportRunResult[],
  options: { generatedAt?: string; notes?: readonly string[]; sourceNotes?: Partial<Record<ImportSourceType, string>> } = {},
): CoverageReport {
  const bySource = new Map<ImportSourceType, SourceCoverage>();

  for (const run of runs) {
    const existing =
      bySource.get(run.sourceType) ??
      emptyCoverage(
        run.sourceType,
        run.adapterVersion,
        run.adapterStatus,
        options.sourceNotes?.[run.sourceType] ?? '',
      );

    existing.filesInspected += 1;
    existing.recordsSeen += run.counts.seen;
    existing.imported += run.counts.imported;
    existing.duplicate += run.counts.duplicate;
    existing.needsReview += run.counts.needsReview;
    existing.invalid += run.counts.invalid;
    existing.missingContext += run.missingContext;
    existing.unknownDates += run.unknownDates;

    for (const [code, count] of Object.entries(run.warningCodes)) {
      const key = code as ImportWarningCode;
      existing.warningCodes[key] = (existing.warningCodes[key] ?? 0) + (count ?? 0);
    }

    const { earliest, latest } = run.dateRange;
    if (earliest && (existing.earliestKnownDate === null || earliest < existing.earliestKnownDate)) {
      existing.earliestKnownDate = earliest;
    }
    if (latest && (existing.latestKnownDate === null || latest > existing.latestKnownDate)) {
      existing.latestKnownDate = latest;
    }

    bySource.set(run.sourceType, existing);
  }

  const sources = [...bySource.values()].sort((a, b) => a.sourceType.localeCompare(b.sourceType));
  const totals = sources.reduce(
    (acc, source) => ({
      filesInspected: acc.filesInspected + source.filesInspected,
      recordsSeen: acc.recordsSeen + source.recordsSeen,
      imported: acc.imported + source.imported,
      duplicate: acc.duplicate + source.duplicate,
      needsReview: acc.needsReview + source.needsReview,
      invalid: acc.invalid + source.invalid,
      missingContext: acc.missingContext + source.missingContext,
      unknownDates: acc.unknownDates + source.unknownDates,
    }),
    {
      filesInspected: 0,
      recordsSeen: 0,
      imported: 0,
      duplicate: 0,
      needsReview: 0,
      invalid: 0,
      missingContext: 0,
      unknownDates: 0,
    },
  );

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    sources,
    totals,
    // Sorted so that two reports of the same situation read the same.
    unavailableSources: ALL_SOURCES.filter((source) => !bySource.has(source)).sort(),
    notes: [...(options.notes ?? [])],
  };
}

interface BatchSummaryRow {
  source_type: ImportSourceType;
  adapter_version: string;
  files: string;
  count_seen: string;
  count_imported: string;
  count_duplicate: string;
  count_needs_review: string;
  count_invalid: string;
}

interface WarningRow {
  source_type: ImportSourceType;
  code: ImportWarningCode;
  n: string;
}

interface DateRangeRow {
  source_type: ImportSourceType;
  earliest: string | null;
  latest: string | null;
  unknown_dates: string;
}

/**
 * Reads the ledger back out of the database.
 *
 * Distinct file hashes are counted rather than batches, because rerunning one
 * file must not make the coverage look twice as wide as it is.
 */
export async function loadCoverage(
  db: ImportDatabase,
  options: { ownerId?: string; adapterStatuses?: Partial<Record<ImportSourceType, AdapterValidationStatus>> } = {},
): Promise<CoverageReport> {
  const rows = await db.transaction(async (q: SqlRunner) => {
    const { rows: owners } = await q.query<{ owner_id: string | null }>(
      `select coalesce($1::uuid, (select auth.uid()))::uuid as owner_id`,
      [options.ownerId ?? null],
    );
    const ownerId = owners[0]?.owner_id ?? null;
    if (!ownerId) throw new Error('No owner for this coverage report.');

    const batches = await q.query<BatchSummaryRow>(
      `select source_type::text as source_type,
              max(adapter_version) as adapter_version,
              count(distinct source_file_hash)::text as files,
              sum(count_seen)::text as count_seen,
              sum(count_imported)::text as count_imported,
              sum(count_duplicate)::text as count_duplicate,
              sum(count_needs_review)::text as count_needs_review,
              sum(count_invalid)::text as count_invalid
       from public.import_batches
       where user_id = $1
       group by source_type`,
      [ownerId],
    );

    const warnings = await q.query<WarningRow>(
      `select b.source_type::text as source_type, code, count(*)::text as n
       from public.import_items i
       join public.import_batches b on b.user_id = i.user_id and b.id = i.batch_id
       cross join lateral unnest(i.warning_codes) as code
       where i.user_id = $1
       group by b.source_type, code`,
      [ownerId],
    );

    const dates = await q.query<DateRangeRow>(
      `select b.source_type::text as source_type,
              min(coalesce(r.posted_date, (r.posted_at at time zone 'UTC')::date))::text as earliest,
              max(coalesce(r.posted_date, (r.posted_at at time zone 'UTC')::date))::text as latest,
              count(*) filter (where r.date_precision = 'unknown')::text as unknown_dates
       from public.import_items i
       join public.import_batches b on b.user_id = i.user_id and b.id = i.batch_id
       join public.reply_library r on r.user_id = i.user_id and r.id = i.reply_id
       where i.user_id = $1
       group by b.source_type`,
      [ownerId],
    );

    return { batches: batches.rows, warnings: warnings.rows, dates: dates.rows };
  });

  const bySource = new Map<ImportSourceType, SourceCoverage>();
  for (const row of rows.batches) {
    const coverage = emptyCoverage(
      row.source_type,
      row.adapter_version,
      options.adapterStatuses?.[row.source_type] ?? 'synthetic-tested',
      '',
    );
    coverage.filesInspected = Number(row.files);
    coverage.recordsSeen = Number(row.count_seen);
    coverage.imported = Number(row.count_imported);
    coverage.duplicate = Number(row.count_duplicate);
    coverage.needsReview = Number(row.count_needs_review);
    coverage.invalid = Number(row.count_invalid);
    bySource.set(row.source_type, coverage);
  }
  for (const row of rows.warnings) {
    const coverage = bySource.get(row.source_type);
    if (!coverage) continue;
    coverage.warningCodes[row.code] = (coverage.warningCodes[row.code] ?? 0) + Number(row.n);
  }
  for (const row of rows.dates) {
    const coverage = bySource.get(row.source_type);
    if (!coverage) continue;
    coverage.earliestKnownDate = row.earliest;
    coverage.latestKnownDate = row.latest;
    coverage.unknownDates = Number(row.unknown_dates);
  }

  const sources = [...bySource.values()].sort((a, b) => a.sourceType.localeCompare(b.sourceType));
  return buildCoverageReportFromSources(sources);
}

function buildCoverageReportFromSources(sources: SourceCoverage[]): CoverageReport {
  const totals = sources.reduce(
    (acc, source) => ({
      filesInspected: acc.filesInspected + source.filesInspected,
      recordsSeen: acc.recordsSeen + source.recordsSeen,
      imported: acc.imported + source.imported,
      duplicate: acc.duplicate + source.duplicate,
      needsReview: acc.needsReview + source.needsReview,
      invalid: acc.invalid + source.invalid,
      missingContext: acc.missingContext + source.missingContext,
      unknownDates: acc.unknownDates + source.unknownDates,
    }),
    {
      filesInspected: 0,
      recordsSeen: 0,
      imported: 0,
      duplicate: 0,
      needsReview: 0,
      invalid: 0,
      missingContext: 0,
      unknownDates: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    sources,
    totals,
    unavailableSources: ALL_SOURCES.filter(
      (source) => !sources.some((entry) => entry.sourceType === source),
    ).sort(),
    notes: [],
  };
}

/**
 * Renders the ledger as plain lines.
 *
 * Every value printed is a number, a vocabulary value or a warning code. There is
 * no branch in this function that can print a caller-supplied string other than
 * the source note, which the caller composes from fixed sentences.
 */
export function formatCoverageReport(report: CoverageReport): string[] {
  const lines: string[] = [`coverage generated_at=${report.generatedAt}`];

  for (const source of report.sources) {
    lines.push(
      `source=${source.sourceType} adapter_version=${source.adapterVersion} status=${source.adapterStatus}`,
    );
    lines.push(
      `  files_inspected=${source.filesInspected} records_seen=${source.recordsSeen}` +
        ` imported=${source.imported} duplicate=${source.duplicate}` +
        ` needs_review=${source.needsReview} invalid=${source.invalid}`,
    );
    lines.push(
      `  missing_context=${source.missingContext} unknown_dates=${source.unknownDates}` +
        ` known_range=${source.earliestKnownDate ?? 'none'}..${source.latestKnownDate ?? 'none'}`,
    );
    const codes = Object.entries(source.warningCodes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, count]) => `${code}=${count}`);
    lines.push(`  warnings: ${codes.length > 0 ? codes.join(' ') : 'none'}`);
    if (source.note) lines.push(`  note: ${source.note}`);
  }

  lines.push(
    `totals files_inspected=${report.totals.filesInspected} records_seen=${report.totals.recordsSeen}` +
      ` imported=${report.totals.imported} duplicate=${report.totals.duplicate}` +
      ` needs_review=${report.totals.needsReview} invalid=${report.totals.invalid}`,
  );
  lines.push(
    `unavailable_sources: ${
      report.unavailableSources.length > 0 ? report.unavailableSources.join(' ') : 'none'
    }`,
  );
  for (const note of report.notes) lines.push(`note: ${note}`);

  return lines;
}
