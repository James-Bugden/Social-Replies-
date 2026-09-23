'use client';

import { useState } from 'react';
import { Button, Meta, StatusLine } from '@/components/replies/primitives';
import { SETTINGS } from '@/lib/workspace/copy';
import { forgetDraft } from '@/lib/workspace/recovery';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Explicit sign-out (SEC-05).
 *
 * The acceptance matrix asks for one specific thing: an explicit logout that
 * clears tab-local recovery. Before this, the app had no sign-out at all, while
 * `recovery.ts` documented itself as cleared "on Next reply, on an explicit
 * discard, and on sign-out". Only the first was real. A comment that asserts a
 * security behaviour nothing implements is worse than silence, because it
 * answers the question a reviewer came to ask.
 *
 * The draft is cleared *before* the network call and regardless of its outcome.
 * That ordering is deliberate: the versioned server draft is the source of
 * truth, so the tab-local copy is expendable, and keeping it because sign-out
 * failed would leave the owner's writing in the tab they just tried to secure.
 */
export function SignOutButton() {
  const [failed, setFailed] = useState(false);

  async function signOut() {
    // First, and unconditionally.
    forgetDraft();

    const client = getBrowserClient();
    if (!client) {
      window.location.assign('/login');
      return;
    }

    try {
      await client.auth.signOut();
      window.location.assign('/login');
    } catch {
      // The local session is gone either way; say so rather than pretending the
      // whole sign-out succeeded.
      setFailed(true);
    }
  }

  return (
    <div className="mt-6">
      <Button variant="secondary" onClick={signOut}>
        {SETTINGS.signOut}
      </Button>
      <Meta className="mt-1">{SETTINGS.signOutNote}</Meta>
      {failed ? <StatusLine tone="error">{SETTINGS.signOutFailed}</StatusLine> : null}
    </div>
  );
}
