// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignOutButton } from '@/components/admin/SignOutButton';
import { rememberDraft, recallDraft } from '@/lib/workspace/recovery';

/**
 * Signing out has to take the tab-local draft with it (SEC-05).
 *
 * The acceptance matrix asks for exactly one thing here: "explicit logout clears
 * tab-local recovery". Before this existed the app had no sign-out at all, and
 * `recovery.ts` nonetheless documented itself as cleared "on Next reply, on an
 * explicit discard, and on sign-out" -- two of those three were not real. A
 * comment claiming a security behaviour nothing implements is worse than no
 * comment, because it answers the question a reviewer came to ask.
 */

const signOut = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getBrowserClient: () => ({ auth: { signOut } }),
}));

const draft = {
  sessionId: 'session-1',
  platform: 'linkedin' as const,
  targetKind: 'post' as const,
  sourceText: 'the post being replied to',
  parentText: '',
  sourceUrl: '',
  draft: 'a half-written reply nobody else should read',
  editorVersion: 3,
  sourceVersion: 1,
  contextVersion: 1,
};

beforeEach(() => {
  signOut.mockReset();
  signOut.mockResolvedValue({ error: null });
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('signing out', () => {
  it('clears the tab-local draft and ends the session', async () => {
    rememberDraft(draft);
    expect(recallDraft()?.draft).toBe('a half-written reply nobody else should read');

    render(<SignOutButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(recallDraft()).toBeNull();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('clears the draft even when ending the session fails', async () => {
    // The server draft is the source of truth, so the tab-local copy is
    // expendable. Keeping it because sign-out failed would leave the owner's
    // writing in a tab they just tried to secure, which is the one outcome this
    // control exists to prevent.
    signOut.mockRejectedValue(new Error('network'));
    rememberDraft(draft);

    render(<SignOutButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(recallDraft()).toBeNull();
  });

  it('clears the draft before the session call, not after', async () => {
    // Ordering matters: an await that never resolves must not leave the draft
    // sitting in storage.
    let clearedBeforeSignOut = false;
    signOut.mockImplementation(async () => {
      clearedBeforeSignOut = recallDraft() === null;
      return { error: null };
    });
    rememberDraft(draft);

    render(<SignOutButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(clearedBeforeSignOut).toBe(true);
  });
});
