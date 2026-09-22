import type { SqlRunner } from './types';

/**
 * Who an import is allowed to write as (C01, C04).
 *
 * An import has no browser session, so it runs on an administrative connection
 * where row level security is not the boundary. That makes `--owner` a very
 * sharp tool: the policies on every owned table require both
 * `user_id = auth.uid()` and the private owner check, so a uuid that is not the
 * enabled owner produces rows that commit cleanly and are then unreadable by
 * everyone, including the owner. The archive lands somewhere nobody can ever
 * see it, and nothing in the run says so.
 *
 * A uuid that is not the enabled owner is therefore a refusal, not a warning,
 * and the check happens before the first write rather than after the last one.
 */

export type OwnerCheck =
  | { ok: true; ownerId: string }
  | {
      ok: false;
      reason:
        | 'invalid_owner'
        | 'owner_not_resolved'
        | 'not_the_enabled_owner'
        | 'owner_lookup_failed';
    };

/** Shape only. Whether the id names the enabled owner is a database question. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function verifyImportOwner(
  q: SqlRunner,
  requested: string | null,
): Promise<OwnerCheck> {
  if (requested !== null && !UUID.test(requested)) {
    // Checked before it reaches a cast, so the refusal is a code rather than a
    // database error message quoting the value back into the terminal.
    return { ok: false, reason: 'invalid_owner' };
  }

  let resolved: string | null;
  try {
    const { rows } = await q.query<{ owner_id: string | null }>(
      `select coalesce($1::uuid, (select auth.uid()))::uuid as owner_id`,
      [requested],
    );
    resolved = rows[0]?.owner_id ?? null;
  } catch {
    return { ok: false, reason: 'owner_lookup_failed' };
  }

  // No `--owner` and no session is the administrative case with nothing to scope
  // to. Previously this reached the inserts and failed on a not-null violation
  // partway through a run; refusing here keeps a half-written batch off the disk.
  if (!resolved) return { ok: false, reason: 'owner_not_resolved' };

  if (requested === null) {
    // Under a session the authenticated role can ask the one public question the
    // private schema exposes. It is the same predicate the policies apply, so a
    // pass here is not a weaker check than the writes themselves face.
    try {
      const { rows } = await q.query<{ is_owner: boolean | null }>(
        `select public.is_app_owner() as is_owner`,
      );
      return rows[0]?.is_owner === true
        ? { ok: true, ownerId: resolved }
        : { ok: false, reason: 'not_the_enabled_owner' };
    } catch {
      return { ok: false, reason: 'owner_lookup_failed' };
    }
  }

  // With `--owner` the connection is administrative by definition, so the owner
  // table itself is readable and is the only authority worth asking. A session
  // that somehow reaches here cannot read it and is refused rather than waved
  // through on an unreadable answer.
  try {
    const { rows } = await q.query<{ enabled: boolean }>(
      `select o.enabled from private.app_owner o where o.user_id = $1::uuid`,
      [resolved],
    );
    return rows[0]?.enabled === true
      ? { ok: true, ownerId: resolved }
      : { ok: false, reason: 'not_the_enabled_owner' };
  } catch {
    return { ok: false, reason: 'owner_lookup_failed' };
  }
}
