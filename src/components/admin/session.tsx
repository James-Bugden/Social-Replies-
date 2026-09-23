import 'server-only';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getOwnerSession, type OwnerSession } from '@/lib/auth/owner';
import { isTestMode, TEST_OWNER_ID } from '@/lib/server/test-mode';
import { getStore } from '@/lib/server/get-store';
import { publicConfig } from '@/lib/config/env';
import { AppHeader } from '@/components/replies/AppHeader';
import { NAV, PAGES } from '@/lib/workspace/copy';
import type { Progress } from '@/lib/contracts/api';

/**
 * Shared plumbing for the four utility pages (SR-018).
 *
 * Each page needs the same three things the workspace page already establishes: a
 * verified owner session, the header with today's counts, and an honest
 * signed-out state rather than an empty shell that lets every action on the page
 * fail silently. Centralising it here means the four pages cannot quietly drift on
 * how they answer "who is looking at this" (C01).
 */

export async function resolvePageSession(): Promise<OwnerSession | null> {
  if (isTestMode()) return { userId: TEST_OWNER_ID, supabase: null as never };
  return getOwnerSession();
}

export async function loadProgress(session: OwnerSession): Promise<Progress | null> {
  const store = getStore(session);
  // A stale counter here is cosmetic. The page underneath must still render.
  return store.dailyCounts(publicConfig().timezone).catch(() => null);
}

export function SignedOutPage() {
  return (
    <main className="mx-auto max-w-[750px] px-4 py-16">
      <h1 className="text-xl font-semibold text-ink">{NAV.title}</h1>
      <p className="mt-2 text-ink-soft">{PAGES.signedOut}</p>
      <Link href="/login" className="mt-4 inline-block text-green underline">
        {PAGES.signIn}
      </Link>
    </main>
  );
}

export function PageShell({ progress, children }: { progress: Progress | null; children: ReactNode }) {
  return (
    <>
      <AppHeader progress={progress} />
      <main className="mx-auto max-w-[750px] px-4 py-4 xl:max-w-[1100px]">{children}</main>
    </>
  );
}
