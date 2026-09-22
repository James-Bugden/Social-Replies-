import { ownerRoute } from '@/lib/server/owner-route';
import { getStore } from '@/lib/server/get-store';
import { jsonResponse, readJson } from '@/lib/server/http';
import { AppError } from '@/lib/contracts/errors';
import { manualReplyRequestSchema, progressSchema } from '@/lib/contracts/api';
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

  const store = getStore(session);

  const result = await store.recordManualReply({
    operationKey,
    fingerprint,
    platform: body.platform,
    finalText: body.final_text,
    contentHash: contentHash(body.final_text),
    searchText: searchText(body.final_text),
    datePrecision: body.date_precision,
    postedAt: body.posted_at ?? null,
    postedDate: body.posted_date ?? null,
    sourceTimezone: body.source_timezone ?? null,
    sourceText: body.source_text ?? null,
    parentText: body.parent_text ?? null,
    sourceUrl: body.source_url ?? null,
    replyUrl: body.reply_url ?? null,
    embeddingModel,
  });

  const progress = progressSchema.parse(await store.dailyCounts(publicConfig().timezone));

  return jsonResponse({
    reply_id: result.replyId,
    replayed: result.replayed,
    recorded_at: result.recordedAt,
    progress,
    embedding_status: embeddingModel === 'unconfigured' ? 'unavailable' : 'queued',
  });
});
