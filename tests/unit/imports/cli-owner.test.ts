import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { runCli } from '../../../scripts/imports/cli';
import type { ImportDatabase, SqlRunner } from '@/lib/imports/types';
import { createTestDatabase, OWNER_ID, OTHER_USER_ID, type TestDatabase } from '../../support/db';
import { FIXTURES } from './helpers';

/**
 * `--owner` over an administrative connection (C01, C04).
 *
 * The connection here is the superuser one on purpose. That is what
 * `connectAsAdmin` gives the CLI: no session, `auth.uid()` null, row-level
 * security not applied. Under those conditions an unchecked `--owner` writes a
 * whole archive under a uuid that every policy will then refuse to return,
 * because reads require `user_id = auth.uid()` *and* the private owner check.
 * The rows commit, the run reports success, and the writing is gone.
 *
 * So the assertions come in pairs: the run is refused, and nothing was written.
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

/** The CLI's real connection shape: direct, privileged, sessionless. */
const adminDb: ImportDatabase = {
  transaction: <T,>(fn: (q: SqlRunner) => Promise<T>): Promise<T> =>
    db.raw.transaction(async (tx) =>
      fn({
        query: (sql: string, params?: unknown[]) =>
          tx.query(sql, params) as Promise<{ rows: never[] }>,
      } as SqlRunner),
    ) as Promise<T>,
};

function harness() {
  const lines: string[] = [];
  return {
    lines,
    deps: {
      env: { PRIVATE_SOURCE_ROOT: FIXTURES, PRIVATE_OWNER_AUTHOR_IDS: 'owner-synthetic' },
      out: (line: string) => lines.push(line),
      connect: async () => ({ db: adminDb, close: async () => {} }),
    },
  };
}

const FILE = ['--source', 'drive', '--file', 'drive-history.sample.jsonl'];

async function libraryRows(): Promise<number> {
  const { rows } = await db.raw.query<{ n: string }>(
    `select count(*)::text as n from public.reply_library`,
  );
  return Number(rows[0]!.n);
}

describe('owner verification before any write', () => {
  it('refuses a uuid that is not the enabled owner, and writes nothing', async () => {
    const { deps, lines } = harness();

    const code = await runCli(['import', ...FILE, '--owner', OTHER_USER_ID], deps);

    expect(code).toBe(2);
    expect(lines).toContain('error=not_the_enabled_owner');
    expect(await libraryRows()).toBe(0);
  });

  it('refuses a dry run under the wrong owner too, because it still reads the archive', async () => {
    const { deps, lines } = harness();
    const code = await runCli(['dry-run', ...FILE, '--owner', OTHER_USER_ID], deps);
    expect(code).toBe(2);
    expect(lines).toContain('error=not_the_enabled_owner');
  });

  it('refuses when there is no owner to resolve, rather than writing an ownerless batch', async () => {
    const { deps, lines } = harness();

    // No `--owner`, and `auth.uid()` is null on a direct connection. Before the
    // check this reached the inserts and failed partway through a run.
    const code = await runCli(['import', ...FILE], deps);

    expect(code).toBe(2);
    expect(lines).toContain('error=owner_not_resolved');
    expect(await libraryRows()).toBe(0);
  });

  it('refuses a malformed uuid without letting it reach a cast', async () => {
    const { deps, lines } = harness();
    const code = await runCli(['import', ...FILE, '--owner', 'not-a-uuid'], deps);
    expect(code).toBe(2);
    expect(lines).toContain('error=invalid_owner');
  });

  it('refuses a coverage report for a uuid that is not the owner', async () => {
    const { deps, lines } = harness();
    const code = await runCli(['report', '--owner', OTHER_USER_ID], deps);
    expect(code).toBe(2);
    expect(lines).toContain('error=not_the_enabled_owner');
  });

  it('imports under the enabled owner, and the owner can then read what landed', async () => {
    const { deps, lines } = harness();

    const code = await runCli(['import', ...FILE, '--owner', OWNER_ID], deps);

    expect(code).toBe(0);
    expect(lines.join('\n')).toContain('run_status=completed');
    expect(await libraryRows()).toBeGreaterThan(0);

    // The point of the whole check: these rows are readable through the policies
    // the app actually uses, not merely present in the table.
    const visible = await db.asOwner(async (q) => {
      const { rows } = await q.query<{ n: string }>(
        `select count(*)::text as n from public.reply_library`,
      );
      return Number(rows[0]!.n);
    });
    expect(visible).toBe(await libraryRows());
  });

  it('never echoes the uuid it refused', async () => {
    const { deps, lines } = harness();
    await runCli(['import', ...FILE, '--owner', OTHER_USER_ID], deps);
    expect(lines.join('\n')).not.toContain(OTHER_USER_ID);
  });

  it('runs the runbook commands as written', async () => {
    // The runbook is an operational instruction, so a command in it that does
    // not parse is a defect in the same sense as a wrong query. Each of these is
    // copied from it.
    const dryRun = harness();
    expect(await runCli(['dry-run', ...FILE, '--owner', OWNER_ID], dryRun.deps)).toBe(0);
    expect(dryRun.lines.join('\n')).toContain('run_status=dry_run');

    const imported = harness();
    expect(await runCli(['import', ...FILE, '--owner', OWNER_ID], imported.deps)).toBe(0);

    // `resume` takes the same source and file, because the batch is identified
    // by the file's hash. It correctly finds nothing open after a completed run.
    const resumed = harness();
    expect(await runCli(['resume', ...FILE, '--owner', OWNER_ID], resumed.deps)).toBe(1);
    expect(resumed.lines).toContain('error=no_open_batch');

    const reported = harness();
    expect(await runCli(['report', '--owner', OWNER_ID], reported.deps)).toBe(0);
    expect(reported.lines.join('\n')).toContain('source=drive');
  });

  it('rejects the --batch flag the runbook used to document', async () => {
    const { deps, lines } = harness();
    const code = await runCli(['resume', '--batch', 'anything'], deps);
    expect(code).toBe(2);
    expect(lines.join('\n')).toContain('unrecognised argument');
  });

  it('still validates a file with no owner and no database at all', async () => {
    const { deps, lines } = harness();
    const code = await runCli(['validate', ...FILE], deps);
    expect(code).toBe(0);
    expect(lines.join('\n')).toContain('records=');
  });
});
