import { ownerRoute, unwrapRpc } from '@/lib/server/owner-route';
import { jsonResponse } from '@/lib/server/http';
import { publicConfig } from '@/lib/config/env';
import { progressSchema, type Progress } from '@/lib/contracts/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/progress (C07, DAY-01).
 *
 * The response carries counts and targets and nothing else. There is no private
 * body here on purpose: this is the one endpoint polled on every window focus, and
 * a poll that carried reply text would put the owner's writing into far more
 * request logs than a save does.
 *
 * The local day is computed on the server from the configured timezone. A browser
 * in another timezone therefore sees the same Taipei day the counter uses.
 */
export const GET = ownerRoute(async (_request, { session }) => {
  const timezone = publicConfig().timezone;

  const result = unwrapRpc<Progress>(
    await session.supabase.rpc('daily_counts', { p_timezone: timezone }),
  );

  return jsonResponse(progressSchema.parse(result));
});
