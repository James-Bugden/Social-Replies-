import { ownerRoute, unwrapRpc } from '@/lib/server/owner-route';
import { jsonResponse, readJson } from '@/lib/server/http';
import { AppError } from '@/lib/contracts/errors';
import { manualReplyRequestSchema, progressSchema, type Progress } from '@/lib/contracts/api';
import { contentHash, payloadFingerprint, searchText } from '@/lib/contracts/text';
import { publicConfig, serverConfig } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

/**
 * POST /api/replies/manual (D11, IMP-03).
 *
 * Add past reply, and replies written entirely outside the app.
 *
 * The date defaults to unknown, not to now. An undated reply that quietly became
 * "posted today" would inflate today's count and then be wrong forever, since
 * nothing later can tell the difference between a real today and a defaulted one.
 */
export const POST = ownerRoute(async (request, { session }) => {
  const operationKey = request.headers.get('idempotency-key');
  if (!operationKey || !/^[0-9a-f-]{36}$/i.test(operationKey)) {
    throw new AppError('validation_failed', 'That request was not valid.');
  }

  const body = await readJson(request, manualReplyRequestSchema);

  const fingerprint = payloadFingerprint({
    platform: body.platform,
    final_text: body.final_text,
    date_precision: body.date_precision,
    posted_at: body.posted_at ?? null,
    posted_date: body.posted_date ?? null,
    reply_url: body.reply_url ?? null,
  });

  const embeddingModel =
    serverConfig().embedding.mode === 'live' ? serverConfig().embedding.model : 'unconfigured';

  const result = unwrapRpc<{ reply_id: string; replayed: boolean; recorded_at: string }>(
    await session.supabase.rpc('record_manual_reply', {
      p_operation_key: operationKey,
      p_fingerprint: fingerprint,
      p_platform: body.platform,
      p_final_text: body.final_text,
      p_content_hash: contentHash(body.final_text),
      p_search_text: searchText(body.final_text),
      p_date_precision: body.date_precision,
      p_posted_at: body.posted_at ?? null,
      p_posted_date: body.posted_date ?? null,
      p_source_timezone: body.source_timezone ?? null,
      p_source_text: body.source_text ?? null,
      p_parent_text: body.parent_text ?? null,
      p_source_url: body.source_url ?? null,
      p_reply_url: body.reply_url ?? null,
      p_embedding_model: embeddingModel,
    }),
  );

  const progress = progressSchema.parse(
    unwrapRpc<Progress>(
      await session.supabase.rpc('daily_counts', { p_timezone: publicConfig().timezone }),
    ),
  );

  return jsonResponse({
    reply_id: result.reply_id,
    replayed: result.replayed,
    recorded_at: result.recorded_at,
    progress,
    embedding_status: embeddingModel === 'unconfigured' ? 'unavailable' : 'queued',
  });
});
