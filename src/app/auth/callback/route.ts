import { NextResponse, type NextRequest } from 'next/server';
import { createRequestClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * The sign-in link lands here.
 *
 * It exchanges the one-time code for a session and then redirects to a path on
 * this origin only. An open redirect here would let a link that looks like a
 * sign-in carry the owner somewhere else entirely, so the destination is taken
 * from the request's own origin and never from a parameter.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createRequestClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(error ? `${origin}/login` : origin, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
