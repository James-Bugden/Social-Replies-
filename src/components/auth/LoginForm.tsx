'use client';

import { useId, useState } from 'react';
import { Button, StatusLine } from '@/components/replies/primitives';
import { classifyOtpOutcome } from '@/components/auth/otp-outcome';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * A one-address sign-in.
 *
 * A link rather than a password, because a password field in a single-user app is
 * one more secret to store badly for no benefit.
 *
 * The response is deliberately the same whether or not the address is the owner's.
 * Saying "that is not the owner" would turn this form into a way to test addresses
 * against the account, and the owner already knows which address is theirs.
 *
 * That sameness covers refusals about the address, and nothing else. A send that
 * never happened is reported as a send that never happened: every outcome below
 * saying "a link is on its way" left the owner waiting for an email that a rate
 * limit, a broken mailer or a rejected redirect had already stopped.
 */
export function LoginForm() {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<
    'idle' | 'sending' | 'sent' | 'rate_limited' | 'unavailable' | 'not_configured'
  >('idle');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const client = getBrowserClient();
    if (!client) {
      setState('not_configured');
      return;
    }

    setState('sending');
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // No account is ever created from this form. An address that is not the
        // owner's simply gets nothing.
        shouldCreateUser: false,
      },
    });
    const outcome = classifyOtpOutcome(error);
    setState(outcome === 'accepted' ? 'sent' : outcome);
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <label htmlFor={emailId} className="mb-1 block text-meta font-medium">
        Email address
      </label>
      <input
        id={emailId}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-md border border-border-input bg-card px-3 py-2"
      />

      <Button
        type="submit"
        variant="primary"
        size="primary"
        className="mt-3"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Sending...' : 'Send a sign-in link'}
      </Button>

      {state === 'sent' ? (
        <StatusLine>If that address can sign in, a link is on its way.</StatusLine>
      ) : null}
      {state === 'rate_limited' ? (
        <StatusLine tone="error">Too many sign-in attempts just now. Wait a minute and try again.</StatusLine>
      ) : null}
      {state === 'unavailable' ? (
        <StatusLine tone="error">
          That could not be sent. The email service did not accept the request, so try again in a
          moment.
        </StatusLine>
      ) : null}
      {state === 'not_configured' ? (
        <StatusLine tone="error">Sign-in is not configured yet.</StatusLine>
      ) : null}
    </form>
  );
}
