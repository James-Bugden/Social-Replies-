import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../../support/db';
import { runImport } from '@/lib/imports/batch';
import { loadCoverage } from '@/lib/imports/report';
import { adapterFor } from '@/lib/imports';
import type { ImportDatabase, ImportRecord, ParsedRecord, SqlRunner } from '@/lib/imports/types';
import { asParsed, FILE_HASH_A, FILE_HASH_B, fixture, makeRecord } from './helpers';

/**
 * IMP-01 to IMP-05 against a real Postgres (DATA-01).
 *
 * Creating a PGlite instance costs seconds, so the suite shares one and resets
 * between cases. Every case plants the failure first: a second import of the
 * same file, two replies that read identically, a year-old archive imported
 * today, a crash halfway through.
 */

let db: TestDatabase;

beforeAll(async () => {
  db = await createTestDatabase();
}, 120_000);

beforeEach(async () => {
  await db.reset();
});

afterAll(async () => {
  await db?.close();
});

const importDb: ImportDatabase = {
  transaction: <T,>(fn: (q: SqlRunner) => Promise<T>) => db.asOwner((q) => fn(q)),
};

const linkedin = adapterFor('linkedin');
const drive = adapterFor('drive');

interface ReplyRow {
  id: string;
  final_text: string;
  search_text: string;
  platform: string;
  provenance: string;
  publication_evidence: string;
  date_precision: string;
  posted_at: string | null;
  posted_date: string | null;
  source_timezone: string | null;
  native_reply_id: string | null;
  reply_url: string | null;
  source_post_id: string | null;
}

async function replies(): Promise<ReplyRow[]> {
  const { rows } = await db.raw.query<ReplyRow>(
    `select id, final_text, search_text, platform::text as platform,
            provenance::text as provenance, publication_evidence::text as publication_evidence,
            date_precision::text as date_precision, posted_at::text as posted_at,
            posted_date::text as posted_date, source_timezone, native_reply_id, reply_url,
            source_post_id
     from public.reply_library order by final_text, native_reply_id`,
  );
  return rows;
}

async function batchRow(): Promise<Record<string, unknown>> {
  const { rows } = await db.raw.query<Record<string, unknown>>(
    `select status::text as status, checkpoint, count_seen, count_imported, count_duplicate,
            count_needs_review, count_invalid
     from public.import_batches limit 1`,
  );
  return rows[0] ?? {};
}

type RunOptions = Partial<Parameters<typeof runImport>[0]>;

function run(records: readonly ParsedRecord[], options: RunOptions = {}) {
  return runImport({
    db: importDb,
    adapter: linkedin,
    records,
    sourceFileHash: FILE_HASH_A,
    ...options,
  });
}

describe('IMP-01 reimport and cross-export reconciliation', () => {
  const records = asParsed([
    makeRecord({ nativeReplyId: 'n-1', sourceRecordId: 'r-1', locator: 'row:2' }),
    makeRecord({
      nativeReplyId: 'n-2',
      sourceRecordId: 'r-2',
      locator: 'row:3',
      exactText: 'A second synthetic reply.',
      targetRef: 'post-2',
      sourceUrl: 'https://example.com/feed/post/2',
    }),
  ]);

  it('importing the same file twice produces no duplicate reply and no inflated count', async () => {
    const first = await run(records);
    expect(first.counts).toMatchObject({ seen: 2, imported: 2, duplicate: 0 });
    expect(await replies()).toHaveLength(2);

    const second = await run(records);
    expect(second.counts).toMatchObject({ seen: 2, imported: 0, duplicate: 2 });
    expect(await replies()).toHaveLength(2);

    // The batch counters describe the latest run rather than accumulating it.
    expect(await batchRow()).toMatchObject({
      status: 'completed',
      count_seen: 2,
      count_imported: 0,
      count_duplicate: 2,
    });
  });

  it('a file with no identities at all is still idempotent on a rerun', async () => {
    const anonymous = asParsed([
      makeRecord({ nativeReplyId: null, sourceRecordId: null, replyUrl: null, locator: 'row:9' }),
    ]);
    await run(anonymous);
    await run(anonymous);
    expect(await replies()).toHaveLength(1);
  });

  it('the same native id from a second export reconciles into one stronger record', async () => {
    await run(
      asParsed([
        makeRecord({
          nativeReplyId: 'n-shared',
          sourceRecordId: 'first-export-1',
          provenance: 'user_edited_unconfirmed',
          publicationEvidence: 'unknown',
          datePrecision: 'unknown',
          postedAt: null,
          postedDate: null,
          sourceTimezone: null,
          locator: 'row:2',
        }),
      ]),
    );

    const second = await run(
      asParsed([
        makeRecord({
          sourceFileHash: FILE_HASH_B,
          nativeReplyId: 'n-shared',
          sourceRecordId: 'second-export-1',
          provenance: 'posted_confirmed',
          publicationEvidence: 'platform_export',
          datePrecision: 'timestamp',
          postedAt: '2026-03-04T01:12:00.000Z',
          exactText: 'The second export rendered the same reply differently.',
          locator: 'row:77',
        }),
      ]),
      { sourceFileHash: FILE_HASH_B },
    );

    expect(second.counts).toMatchObject({ imported: 0, duplicate: 1 });

    const rows = await replies();
    expect(rows).toHaveLength(1);
    // The stronger proven status wins, and the first export's exact text stands:
    // there is no way to tell which rendering is the original.
    expect(rows[0]).toMatchObject({
      provenance: 'posted_confirmed',
      publication_evidence: 'platform_export',
      date_precision: 'timestamp',
      final_text: 'Synthetic reply text.',
    });

    // Both source references survive: one import item per batch, same reply.
    const { rows: items } = await db.raw.query<{ n: string }>(
      `select count(distinct batch_id)::text as n from public.import_items
       where reply_id = $1`,
      [rows[0]!.id],
    );
    expect(items[0]!.n).toBe('2');
  });

  it('refuses to reconcile a main post with a reply', async () => {
    await run(
      asParsed([
        makeRecord({
          nativeReplyId: 'n-conflict',
          sourceRecordId: 'rec-conflict',
          provenance: 'published_main_post',
          locator: 'row:2',
        }),
      ]),
    );
    const second = await run(
      asParsed([
        makeRecord({
          sourceFileHash: FILE_HASH_B,
          nativeReplyId: 'n-conflict',
          sourceRecordId: 'rec-conflict-2',
          provenance: 'posted_confirmed',
          locator: 'row:2',
        }),
      ]),
      { sourceFileHash: FILE_HASH_B },
    );
    expect(second.counts).toMatchObject({ needsReview: 1, duplicate: 0 });
    const rows = await replies();
    expect(rows[0]?.provenance).toBe('published_main_post');
  });
});

describe('IMP-02 identical wording under two different posts', () => {
  it('keeps two records rather than deduplicating by text', async () => {
    const text = 'Congratulations, well deserved.';
    const result = await run(
      asParsed([
        makeRecord({
          exactText: text,
          nativeReplyId: 'n-a',
          sourceRecordId: 'r-a',
          targetRef: 'post-1',
          sourceUrl: 'https://example.com/feed/post/1',
          locator: 'row:2',
        }),
        makeRecord({
          exactText: text,
          nativeReplyId: 'n-b',
          sourceRecordId: 'r-b',
          targetRef: 'post-2',
          sourceUrl: 'https://example.com/feed/post/2',
          locator: 'row:3',
        }),
      ]),
    );

    expect(result.counts).toMatchObject({ imported: 2, duplicate: 0 });
    const rows = await replies();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.source_post_id).not.toBe(rows[1]?.source_post_id);
  });
});

describe('IMP-03 dates', () => {
  async function dailyCounts(): Promise<Record<string, number>> {
    return db.asOwner(async (q) => {
      await q.query(`insert into public.app_settings (user_id) values ((select auth.uid()))
                     on conflict (user_id) do nothing`);
      const { rows } = await q.query<{ result: { counts: Record<string, number> } }>(
        `select public.daily_counts('Asia/Taipei') as result`,
      );
      return rows[0]!.result.counts;
    });
  }

  it('keeps an unknown date unknown and a date-only value date-only', async () => {
    await run(
      asParsed([
        makeRecord({
          nativeReplyId: 'n-unknown',
          sourceRecordId: 'r-unknown',
          datePrecision: 'unknown',
          postedAt: null,
          postedDate: null,
          sourceTimezone: null,
          locator: 'row:2',
        }),
        makeRecord({
          nativeReplyId: 'n-date-only',
          sourceRecordId: 'r-date-only',
          exactText: 'A date-only reply with no declared timezone.',
          datePrecision: 'date_only',
          postedAt: null,
          postedDate: '2026-03-05',
          sourceTimezone: null,
          locator: 'row:3',
        }),
        makeRecord({
          nativeReplyId: 'n-utc',
          sourceRecordId: 'r-utc',
          exactText: 'A reply with a known instant.',
          datePrecision: 'timestamp',
          postedAt: '2026-03-06T04:00:00.000Z',
          postedDate: null,
          locator: 'row:4',
        }),
      ]),
    );

    const rows = await replies();
    const byId = new Map(rows.map((row) => [row.native_reply_id, row]));

    expect(byId.get('n-unknown')).toMatchObject({
      date_precision: 'unknown',
      posted_at: null,
      posted_date: null,
    });
    // Import time is never posting time, so nothing was filled in here.
    expect(byId.get('n-date-only')).toMatchObject({
      date_precision: 'date_only',
      posted_at: null,
      posted_date: '2026-03-05',
      source_timezone: null,
    });
    expect(byId.get('n-utc')?.date_precision).toBe('timestamp');
  });

  it('an archive imported today does not inflate today’s counter', async () => {
    const before = await dailyCounts();
    expect(before).toEqual({ linkedin: 0, x: 0, threads: 0 });

    await run(
      asParsed([
        makeRecord({
          nativeReplyId: 'n-old',
          sourceRecordId: 'r-old',
          datePrecision: 'timestamp',
          postedAt: '2025-06-01T02:00:00.000Z',
          locator: 'row:2',
        }),
        makeRecord({
          nativeReplyId: 'n-no-date',
          sourceRecordId: 'r-no-date',
          exactText: 'An undated reply from the same archive.',
          datePrecision: 'unknown',
          postedAt: null,
          postedDate: null,
          sourceTimezone: null,
          locator: 'row:3',
        }),
        makeRecord({
          nativeReplyId: 'n-unzoned-day',
          sourceRecordId: 'r-unzoned-day',
          exactText: 'A reply whose local day nobody can prove.',
          datePrecision: 'date_only',
          postedAt: null,
          postedDate: new Date().toISOString().slice(0, 10),
          sourceTimezone: null,
          locator: 'row:4',
        }),
      ]),
    );

    expect(await dailyCounts()).toEqual({ linkedin: 0, x: 0, threads: 0 });
    expect(await replies()).toHaveLength(3);
  });
});

describe('IMP-04 hostile and interrupted input', () => {
  it('quarantines a malformed CSV row without losing its neighbours', async () => {
    const input = {
      text: fixture('linkedin-comments-malformed.sample.csv'),
      sourceFileHash: FILE_HASH_A,
      ownerAuthorIds: ['owner-synthetic'],
    };
    const result = await runImport({
      db: importDb,
      adapter: linkedin,
      records: linkedin.parse(input),
      sourceFileHash: FILE_HASH_A,
    });
    expect(result.counts).toMatchObject({ seen: 3, imported: 2, invalid: 1 });
    expect(await replies()).toHaveLength(2);
  });

  it('rejects an unknown schema without writing a reply', async () => {
    const threads = adapterFor('threads');
    const input = { text: fixture('unknown-schema.sample.json'), sourceFileHash: FILE_HASH_B };
    const result = await runImport({
      db: importDb,
      adapter: threads,
      records: threads.parse(input),
      sourceFileHash: FILE_HASH_B,
    });
    expect(result.counts).toMatchObject({ imported: 0, invalid: 1 });
    expect(await replies()).toHaveLength(0);
  });

  it('resumes an interrupted batch from its checkpoint without duplicate writes', async () => {
    const records: ParsedRecord[] = asParsed(
      Array.from({ length: 5 }, (_, index) =>
        makeRecord({
          nativeReplyId: `n-${index}`,
          sourceRecordId: `r-${index}`,
          exactText: `Synthetic reply number ${index}.`,
          targetRef: `post-${index}`,
          sourceUrl: `https://example.com/feed/post/${index}`,
          locator: `row:${index + 2}`,
        }),
      ),
    );

    const interrupted = await run(records, { chunkSize: 2, stopAfterChunks: 1 });
    expect(interrupted.status).toBe('interrupted');
    expect(interrupted.counts).toMatchObject({ seen: 2, imported: 2 });
    expect(await replies()).toHaveLength(2);
    expect(await batchRow()).toMatchObject({ status: 'open', checkpoint: { last_ordinal: 2 } });

    const resumed = await run(records, { chunkSize: 2 });
    expect(resumed.resumedAfterOrdinal).toBe(2);
    expect(resumed.counts).toMatchObject({ seen: 3, imported: 3, duplicate: 0 });
    expect(await replies()).toHaveLength(5);

    // Running the finished batch again re-identifies every record rather than
    // trusting the checkpoint to make the import look idempotent.
    const again = await run(records, { chunkSize: 2 });
    expect(again.counts).toMatchObject({ seen: 5, imported: 0, duplicate: 5 });
    expect(await replies()).toHaveLength(5);
  });

  it('a dry run classifies everything and writes nothing', async () => {
    const records = asParsed([makeRecord({ nativeReplyId: 'n-dry', sourceRecordId: 'r-dry' })]);
    const result = await run(records, { dryRun: true });
    expect(result.status).toBe('dry_run');
    expect(result.counts).toMatchObject({ seen: 1, imported: 1 });
    expect(await replies()).toHaveLength(0);

    const { rows } = await db.raw.query<{ n: string }>(
      `select count(*)::text as n from public.import_batches`,
    );
    expect(rows[0]!.n).toBe('0');
  });
});

describe('IMP-05 missing context and missing proof', () => {
  it('imports an AI draft with null context and no promotion to posted', async () => {
    const input = { text: fixture('drive-history.sample.jsonl'), sourceFileHash: FILE_HASH_B };
    const result = await runImport({
      db: importDb,
      adapter: drive,
      records: drive.parse(input),
      sourceFileHash: FILE_HASH_B,
    });

    expect(result.counts).toMatchObject({ seen: 6, needsReview: 1 });

    const rows = await replies();
    const draft = rows.find((row) => row.provenance === 'ai_draft');
    expect(draft).toBeDefined();
    expect(draft).toMatchObject({
      publication_evidence: 'unknown',
      date_precision: 'unknown',
      posted_at: null,
      source_post_id: null,
    });

    // The edited draft is not posted either, whatever the retrieval layer later
    // does with it.
    const edited = rows.find((row) => row.provenance === 'user_edited_unconfirmed');
    expect(edited?.publication_evidence).toBe('unknown');
  });
});

describe('exact text round trip', () => {
  it('stores the bytes as supplied and normalises only the search copy', async () => {
    const exact = '謝謝分享 🙏\r\n\r\n  第二段落，結尾留了空白。  ';
    await run(
      asParsed([
        makeRecord({
          platform: 'threads',
          exactText: exact,
          nativeReplyId: 'n-cjk',
          sourceRecordId: 'r-cjk',
        }),
      ]),
    );

    const rows = await replies();
    expect(rows[0]?.final_text).toBe(exact);
    expect(rows[0]?.search_text).toBe('謝謝分享 🙏 第二段落，結尾留了空白。');
    expect(rows[0]?.search_text).not.toContain('\r');

    // The search row carries the normalised copy and the hash of the exact text.
    const { rows: search } = await db.raw.query<{ search_text: string }>(
      `select search_text from public.search_documents where entity_kind = 'reply'`,
    );
    expect(search[0]?.search_text).toBe(rows[0]?.search_text);
  });
});

describe('coverage ledger', () => {
  it('reports per-source counts, the known date range and the sources with nothing', async () => {
    await run(
      asParsed([
        makeRecord({ nativeReplyId: 'n-1', sourceRecordId: 'r-1', locator: 'row:2' }),
        makeRecord({
          nativeReplyId: 'n-2',
          sourceRecordId: 'r-2',
          exactText: 'An older synthetic reply.',
          postedAt: '2025-11-02T03:00:00.000Z',
          locator: 'row:3',
        }),
      ]),
    );

    const report = await loadCoverage(importDb);
    const linkedInCoverage = report.sources.find((source) => source.sourceType === 'linkedin');

    expect(linkedInCoverage).toMatchObject({
      filesInspected: 1,
      recordsSeen: 2,
      imported: 2,
      duplicate: 0,
    });
    expect(linkedInCoverage?.earliestKnownDate).toBe('2025-11-02');
    expect(linkedInCoverage?.latestKnownDate).toBe('2026-03-04');
    // One file is one file: the other three sources are named as unavailable.
    expect(report.unavailableSources.sort()).toEqual(['drive', 'threads', 'x']);
  });

  it('counts one file once, however many times it is imported', async () => {
    const records: readonly ImportRecord[] = [
      makeRecord({ nativeReplyId: 'n-1', sourceRecordId: 'r-1' }),
    ];
    await run(asParsed(records));
    await run(asParsed(records));

    const report = await loadCoverage(importDb);
    expect(report.totals.filesInspected).toBe(1);
  });
});
