import { Client } from 'pg';

/**
 * A database connection for administrative scripts only.
 *
 * C01 divides the app in two. An ordinary web request runs under the owner's own
 * session, through PostgREST, with row-level security as the boundary: there is no
 * direct connection anywhere in `src/`, which is what makes that guarantee easy to
 * check. A background worker or a local import has no session to run under, so it
 * connects directly and does its own explicit owner scoping instead.
 *
 * That split is load-bearing, so it is enforced rather than described: a test
 * asserts that nothing under `src/` imports `pg`. If that test ever fails, a
 * request path has acquired a connection that RLS does not cover.
 *
 * The connection string is a server-side credential. It is never committed, never
 * logged, and never sent to a browser.
 */

export interface SqlResult<T> {
  rows: T[];
}

export interface SqlRunner {
  query<T>(sql: string, params?: unknown[]): Promise<SqlResult<T>>;
}

export interface AdminConnection extends SqlRunner {
  close(): Promise<void>;
}

export async function connectAsAdmin(connectionString?: string): Promise<AdminConnection> {
  const url = connectionString ?? process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      'SUPABASE_DB_URL is not set. Administrative scripts need a direct connection; ordinary requests do not.',
    );
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return { rows: result.rows as T[] };
    },
    close: () => client.end(),
  };
}
