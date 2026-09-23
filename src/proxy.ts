import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Session refresh, and nothing else that matters.
 *
 * Named `proxy` because Next 16 renamed the convention; it is the same hook.
 * It runs before every matched request and is the only place that can
 * write a refreshed auth cookie. It deliberately does **not** decide who may read
 * what: navigation-level gating is a convenience, and C01 is explicit that the
 * real boundary is in RLS and in each route's own owner check. A middleware bug
 * must not be able to expose a row.
 */
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the token when it is close to expiry and writes the new cookie.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the favicon. API routes are included
     * so that a long editing session does not lose its token mid-save.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
