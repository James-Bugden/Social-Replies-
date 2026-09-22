'use client';

import { useId, useState } from 'react';
import { Button, StatusLine } from '@/components/replies/primitives';
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
 */
export function LoginForm() {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const client = getBrowserClient();
    if (!client) {
      setState('failed');
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
    setState(error ? 'sent' : 'sent');
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
      {state === 'failed' ? (
        <StatusLine tone="error">Sign-in is not configured yet.</StatusLine>
      ) : null}
    </form>
  );
}
