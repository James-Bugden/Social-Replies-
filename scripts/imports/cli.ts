#!/usr/bin/env node
/**
 * The private import CLI (SR-007 #8, C04).
 *
 * It runs on the owner's own machine, against files the owner already has, and
 * writes through a direct connection because there is no browser session behind
 * an import. It is deliberately not a route: a lifetime archive is not something
 * to push through an HTTP endpoint built for one reply at a time.
 *
 *   PRIVATE_SOURCE_ROOT=... SUPABASE_DB_URL=... \
 *     npm run import -- dry-run --source drive --file history/replies.jsonl
 *
 * Modes:
 *   validate  read and classify the file, touch no database
 *   dry-run   classify against the database, write nothing
 *   import    write, restarting a finished batch so every record is re-identified
 *   resume    continue an interrupted batch from its checkpoint, and refuse if
 *             there is nothing open to continue
 *   report    print the coverage ledger already in the database
 *
 * Everything it prints is a count, a vocabulary value or a warning code. It never
 * prints a path, a locator, an author or a word the owner wrote, because the
 * likeliest place for that output to end up is a terminal recording or a pasted
 * issue comment.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { connectAsAdmin } from '../lib/db';
import { adapterFor, runImport, transactionalDatabase } from '@/lib/imports';
import { IMPORT_LIMITS, resolveWithinRoot } from '@/lib/imports/safety';
import { formatCoverageReport, loadCoverage } from '@/lib/imports/report';
import type { ImportDatabase, SqlRunner } from '@/lib/imports/types';
import { importSourceTypeSchema } from '@/lib/contracts/vocabulary';

type Mode = 'validate' | 'dry-run' | 'import' | 'resume' | 'report';

const MODES: readonly Mode[] = ['validate', 'dry-run', 'import', 'resume', 'report'];

export interface CliDependencies {
  env: Readonly<Record<string, string | undefined>>;
  out: (line: string) => void;
  /** Injected so a test can drive the whole CLI without opening a connection. */
  connect: () => Promise<{ db: ImportDatabase; close: () => Promise<void> }>;
}

interface Options {
  mode: Mode;
  source: string | null;
  file: string | null;
  chunkSize: number;
  ownerId: string | null;
}

function parseArgs(argv: readonly string[]): Options | { error: string } {
  const [first, ...rest] = argv;
  const mode = MODES.find((candidate) => candidate === first);
  if (!mode) return { error: `usage: import <${MODES.join('|')}> [--source s] [--file p]` };

  const options: Options = {
    mode,
    source: null,
    file: null,
    chunkSize: IMPORT_LIMITS.defaultChunkSize,
    ownerId: null,
  };

  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (flag === '--source' && value) {
      options.source = value;
      i += 1;
    } else if (flag === '--file' && value) {
      options.file = value;
      i += 1;
    } else if (flag === '--chunk' && value) {
      options.chunkSize = Math.max(1, Number.parseInt(value, 10) || IMPORT_LIMITS.defaultChunkSize);
      i += 1;
    } else if (flag === '--owner' && value) {
      options.ownerId = value;
      i += 1;
    } else {
      return { error: `unrecognised argument at position ${i + 1}` };
    }
  }
  return options;
}

/**
 * Hashes the file by streaming it.
 *
 * The hash is part of batch identity, so it has to be the hash of every byte;
 * reading the whole file into memory first would make the identity of a large
 * archive depend on having enough memory to hold it.
 */
async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(path, { highWaterMark: 1024 * 1024 });
  for await (const chunk of stream) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

export async function runCli(argv: readonly string[], deps: CliDependencies): Promise<number> {
  const parsed = parseArgs(argv);
  if ('error' in parsed) {
    deps.out(parsed.error);
    return 2;
  }

  if (parsed.mode === 'report') {
    const connection = await deps.connect();
    try {
      const report = await loadCoverage(connection.db, {
        ...(parsed.ownerId ? { ownerId: parsed.ownerId } : {}),
      });
      for (const line of formatCoverageReport(report)) deps.out(line);
      return 0;
    } finally {
      await connection.close();
    }
  }

  const source = importSourceTypeSchema.safeParse(parsed.source);
  if (!source.success) {
    deps.out('error=unknown_source');
    return 2;
  }
  if (!parsed.file) {
    deps.out('error=missing_file');
    return 2;
  }

  const root = deps.env.PRIVATE_SOURCE_ROOT;
  if (!root) {
    deps.out('error=private_source_root_not_configured');
    return 2;
  }

  // The path came from a command line, so it is resolved inside the staging root
  // and rejected rather than echoed if it points anywhere else.
  const path = resolveWithinRoot(root, parsed.file);
  if (!path) {
    deps.out('error=path_outside_private_root');
    return 2;
  }

  let sizeBytes: number;
  try {
    const info = await stat(path);
    sizeBytes = info.size;
  } catch {
    deps.out('error=file_unreadable');
    return 2;
  }

  if (sizeBytes > IMPORT_LIMITS.maxFileBytes) {
    // Refused rather than partly read: a truncated archive would import as a
    // complete one and the missing half would look like history that never existed.
    deps.out(`error=file_too_large limit_bytes=${IMPORT_LIMITS.maxFileBytes}`);
    return 2;
  }

  const adapter = adapterFor(source.data);
  const sourceFileHash = await hashFile(path);
  const text = await readFile(path, 'utf8');
  const ownerAuthorIds = (deps.env.PRIVATE_OWNER_AUTHOR_IDS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  const input = {
    text,
    sourceFileHash,
    ...(ownerAuthorIds.length > 0 ? { ownerAuthorIds } : {}),
  };

  deps.out(
    `source=${adapter.sourceType} adapter_version=${adapter.adapterVersion}` +
      ` status=${adapter.validationStatus} file_hash=${sourceFileHash.slice(0, 12)}` +
      ` size_bytes=${sizeBytes}`,
  );
  deps.out(`schema_note: ${adapter.schemaNote}`);

  const inspection = adapter.inspect(input);
  deps.out(`schema_match=${inspection.matches}`);
  for (const note of inspection.notes) deps.out(`note: ${note}`);

  if (parsed.mode === 'validate') {
    // Validation never touches the database, so an unfamiliar file can be checked
    // before anything is allowed near the archive.
    const counts = { record: 0, needs_review: 0, invalid: 0 };
    const codes = new Map<string, number>();
    for (const item of adapter.parse(input)) {
      counts[item.outcome === 'record' ? 'record' : item.outcome] += 1;
      const warnings = item.outcome === 'record' ? item.record.warnings : item.warnings;
      for (const code of warnings) codes.set(code, (codes.get(code) ?? 0) + 1);
    }
    deps.out(
      `records=${counts.record} needs_review=${counts.needs_review} invalid=${counts.invalid}`,
    );
    deps.out(
      `warnings: ${
        codes.size > 0
          ? [...codes.entries()].sort().map(([code, n]) => `${code}=${n}`).join(' ')
          : 'none'
      }`,
    );
    return inspection.matches ? 0 : 1;
  }

  if (!inspection.matches) {
    deps.out('error=unsupported_schema');
    return 1;
  }

  const connection = await deps.connect();
  try {
    if (parsed.mode === 'resume') {
      const open = await connection.db.transaction(async (q: SqlRunner) => {
        const { rows } = await q.query<{ n: string }>(
          `select count(*)::text as n from public.import_batches
           where user_id = coalesce($1::uuid, (select auth.uid()))
             and source_file_hash = $2 and adapter_version = $3 and status = 'open'`,
          [parsed.ownerId, sourceFileHash, adapter.adapterVersion],
        );
        return Number(rows[0]?.n ?? '0');
      });
      if (open === 0) {
        deps.out('error=no_open_batch');
        return 1;
      }
    }

    const result = await runImport({
      db: connection.db,
      adapter,
      records: adapter.parse(input),
      sourceFileHash,
      chunkSize: parsed.chunkSize,
      dryRun: parsed.mode === 'dry-run',
      ...(parsed.ownerId ? { ownerId: parsed.ownerId } : {}),
    });

    deps.out(`run_status=${result.status} resumed_after=${result.resumedAfterOrdinal}`);
    deps.out(
      `seen=${result.counts.seen} imported=${result.counts.imported}` +
        ` duplicate=${result.counts.duplicate} needs_review=${result.counts.needsReview}` +
        ` invalid=${result.counts.invalid}`,
    );
    deps.out(
      `unknown_dates=${result.unknownDates} missing_context=${result.missingContext}` +
        ` known_range=${result.dateRange.earliest ?? 'none'}..${result.dateRange.latest ?? 'none'}`,
    );
    const codes = Object.entries(result.warningCodes).sort(([a], [b]) => a.localeCompare(b));
    deps.out(
      `warnings: ${codes.length > 0 ? codes.map(([c, n]) => `${c}=${n}`).join(' ') : 'none'}`,
    );
    deps.out(
      'coverage: one file is one file. This run says nothing about records the export did not contain.',
    );
    return 0;
  } finally {
    await connection.close();
  }
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/imports/cli.ts');

if (invokedDirectly) {
  const exitCode = await runCli(process.argv.slice(2), {
    env: process.env,
    out: (line) => console.log(line),
    connect: async () => {
      // An import has no browser session to run under, which is the one case C01
      // allows a direct connection. Every statement it issues still carries an
      // explicit owner predicate rather than relying on row level security.
      //
      // The connection itself comes from the one helper that owns it. A boundary
      // test asserts that no second file in scripts/ constructs a client, because
      // two places to get a database connection is two places to get one wrong.
      const connection = await connectAsAdmin();
      return { db: transactionalDatabase(connection), close: () => connection.close() };
    },
  });
  process.exitCode = exitCode;
}
