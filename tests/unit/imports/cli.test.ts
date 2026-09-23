import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../../support/db';
import { runCli } from '../../../scripts/imports/cli';
import type { ImportDatabase, SqlRunner } from '@/lib/imports/types';
import { FIXTURES } from './helpers';

/**
 * The private CLI.
 *
 * Two things are being checked. First, that a path argument cannot reach outside
 * the staging root, because the argument comes from a command line and the
 * staging root is the only place the owner agreed to read from. Second, that the
 * output is safe to paste anywhere: counts and codes, never a path and never a
 * reply.
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

function harness(env: Record<string, string | undefined> = {}) {
  const lines: string[] = [];
  return {
    lines,
    deps: {
      env: { PRIVATE_SOURCE_ROOT: FIXTURES, PRIVATE_OWNER_AUTHOR_IDS: 'owner-synthetic', ...env },
      out: (line: string) => lines.push(line),
      connect: async () => ({ db: importDb, close: async () => {} }),
    },
  };
}

describe('argument handling', () => {
  it('refuses a mode it does not have', async () => {
    const { deps, lines } = harness();
    expect(await runCli(['obliterate'], deps)).toBe(2);
    expect(lines.join('\n')).toContain('usage:');
  });

  it('refuses a path that climbs out of the private root, without echoing it', async () => {
    const { deps, lines } = harness();
    const code = await runCli(
      ['validate', '--source', 'drive', '--file', '../../package.json'],
      deps,
    );
    expect(code).toBe(2);
    expect(lines).toEqual(['error=path_outside_private_root']);
  });

  it('refuses to run at all when no private root is configured', async () => {
    const { deps, lines } = harness({ PRIVATE_SOURCE_ROOT: undefined });
    const code = await runCli(['validate', '--source', 'drive', '--file', 'x.jsonl'], deps);
    expect(code).toBe(2);
    expect(lines).toEqual(['error=private_source_root_not_configured']);
  });
});

describe('validate', () => {
  it('classifies the file without touching the database', async () => {
    const { deps, lines } = harness();
    const code = await runCli(
      ['validate', '--source', 'drive', '--file', 'drive-history.sample.jsonl'],
      deps,
    );

    expect(code).toBe(0);
    const text = lines.join('\n');
    expect(text).toContain('status=synthetic-tested');
    expect(text).toContain('records=5 needs_review=1 invalid=0');

    const { rows } = await db.raw.query<{ n: string }>(
      `select count(*)::text as n from public.reply_library`,
    );
    expect(rows[0]!.n).toBe('0');
  });

  it('reports a file no adapter was written for as a schema mismatch', async () => {
    const { deps, lines } = harness();
    const code = await runCli(
      ['validate', '--source', 'threads', '--file', 'unknown-schema.sample.json'],
      deps,
    );
    expect(code).toBe(1);
    expect(lines.join('\n')).toContain('schema_match=false');
  });
});

describe('import, dry-run and resume', () => {
  it('a dry run writes nothing and still reports what would happen', async () => {
    const { deps, lines } = harness();
    const code = await runCli(
      ['dry-run', '--source', 'drive', '--file', 'drive-history.sample.jsonl'],
      deps,
    );
    expect(code).toBe(0);
    expect(lines.join('\n')).toContain('run_status=dry_run');

    const { rows } = await db.raw.query<{ n: string }>(
      `select count(*)::text as n from public.reply_library`,
    );
    expect(rows[0]!.n).toBe('0');
  });

  it('imports, and then reports coverage that admits what is missing', async () => {
    const { deps, lines } = harness();
    expect(
      await runCli(['import', '--source', 'drive', '--file', 'drive-history.sample.jsonl'], deps),
    ).toBe(0);

    const text = lines.join('\n');
    expect(text).toContain('seen=6 imported=5 duplicate=0 needs_review=1 invalid=0');
    expect(text).toContain('coverage: one file is one file.');

    const report = harness();
    expect(await runCli(['report'], report.deps)).toBe(0);
    const reportText = report.lines.join('\n');
    expect(reportText).toContain('source=drive');
    expect(reportText).toContain('unavailable_sources: linkedin threads x');
  });

  it('refuses to resume when there is no interrupted batch to continue', async () => {
    const { deps, lines } = harness();
    const code = await runCli(
      ['resume', '--source', 'drive', '--file', 'drive-history.sample.jsonl'],
      deps,
    );
    expect(code).toBe(1);
    expect(lines).toContain('error=no_open_batch');
  });
});

describe('output safety', () => {
  it('prints no reply text, no path and no author across every mode', async () => {
    const collected: string[] = [];
    for (const argv of [
      ['validate', '--source', 'drive', '--file', 'drive-history.sample.jsonl'],
      ['import', '--source', 'drive', '--file', 'drive-history.sample.jsonl'],
      ['report'],
    ]) {
      const { deps, lines } = harness();
      await runCli(argv, deps);
      collected.push(...lines);
    }

    const text = collected.join('\n');
    expect(text).not.toContain('drive-history');
    expect(text).not.toContain(FIXTURES);
    expect(text).not.toContain('owner-synthetic');
    expect(text).not.toContain('Synthetic reply');
    expect(text).not.toMatch(/https?:\/\//);
    // The file is named only by a short prefix of its hash.
    expect(text).toMatch(/file_hash=[0-9a-f]{12}\b/);
  });
});
