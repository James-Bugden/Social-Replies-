import 'server-only';
import type { OwnerSession } from '@/lib/auth/owner';
import type { Store } from './store';
import { createMemoryStore } from './memory-store';
import { createSupabaseStore } from './supabase-store';

/**
 * Selects the data layer.
 *
 * The in-memory double is reachable only when `SR_TEST_MODE` is exactly `e2e`, a
 * value nothing sets outside the browser-journey harness and CI. Everywhere else
 * this returns the Supabase-backed store built from the caller's own session, so
 * every query runs under that session's row-level security.
 *
 * The test double is also a module-level singleton, deliberately: a browser journey
 * spans several requests and has to see its own writes.
 */

let memorySingleton: Store | null = null;

export function isTestMode(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.SR_TEST_MODE === 'e2e';
}

export function getStore(session: OwnerSession): Store {
  if (isTestMode()) {
    memorySingleton ??= createMemoryStore();
    return memorySingleton;
  }
  return createSupabaseStore(session);
}

/** Test seam. Lets a journey start from a known state. */
export function resetMemoryStore(): void {
  memorySingleton = null;
}
