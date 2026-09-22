import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness only. It reveals no configuration values and no owner data: the browser
 * test harness needs a stable URL to wait on before the first navigation.
 */
export function GET() {
  return NextResponse.json(
    { status: 'ok' },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
