import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createRequestClient } from '@/lib/supabase/server';
import { AppError } from '@/lib/contracts/errors';

/**
 * The server-side half of the owner boundary (C01).
 *
 * Two checks, both required. The session must be a real verified session, and it
 * must belong to the one enabled owner. The database enforces the same pair, so
 * this layer is a fast, clear rejection rather than the only line of defence:
 * a route that forgot to call it still cannot read a row.
 */

export interface OwnerSession {
  userId: string;
  supabase: SupabaseClient;
}

export async function getOwnerSession(): Promise<OwnerSession | null> {
  const supabase = await createRequestClient();

  // getUser() re-validates the token with the auth server. getSession() alone
  // trusts whatever is in the cookie, which is not good enough for a boundary.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: isOwner, error: ownerError } = await supabase.rpc('is_app_owner');
  if (ownerError || isOwner !== true) return null;

  return { userId: data.user.id, supabase };
}

/**
 * Throws instead of returning null. Both failures return the same shape on the
 * wire so that a non-owner cannot tell a rejected account from a missing one.
 */
export async function requireOwner(): Promise<OwnerSession> {
  const session = await getOwnerSession();
  if (!session) {
    throw new AppError('unauthenticated', 'Sign in to continue.');
  }
  return session;
}
