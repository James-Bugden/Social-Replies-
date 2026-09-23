import { LoginForm } from '@/components/auth/LoginForm';
import { publicConfig } from '@/lib/config/env';
import { NAV } from '@/lib/workspace/copy';

export const dynamic = 'force-dynamic';

/**
 * Sign in.
 *
 * There is no sign-up. This app has exactly one enabled owner, bootstrapped
 * privately against the database, and a second account that somehow authenticates
 * still reads nothing (C01). So this page offers one thing: send a link to an
 * address that is already the owner's.
 */
export default function LoginPage() {
  const configured = publicConfig().authConfigured;

  return (
    <main className="mx-auto max-w-[480px] px-4 py-16">
      <h1 className="text-xl font-semibold">{NAV.title}</h1>
      {configured ? (
        <LoginForm />
      ) : (
        <p className="mt-4 text-ink-soft">
          Sign-in is not configured yet. Add the project URL and publishable key, then reload.
        </p>
      )}
    </main>
  );
}
