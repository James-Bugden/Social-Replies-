import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicConfig } from '@/lib/config/env';
import { AppError } from '@/lib/contracts/errors';

/**
 * The server-side Supabase client for ordinary requests.
 *
 * It is built from the publishable key and the caller's own session cookies, so
 * every query runs under that session's row-level security. There is deliberately
 * no service-role client in this module: C01 requires ordinary requests to use the
 * verified user session, and the easiest way to keep that true is to make the
 * bypass unavailable here.
 */
export async function createRequestClient() {
  const config = publicConfig();
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    throw new AppError('not_configured', 'The database is not configured yet.');
  }

  const cookieStore = await cookies();

  return createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. Session
          // refresh happens in middleware instead; swallowing here is correct.
        }
      },
    },
  });
}
