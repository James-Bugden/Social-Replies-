import { ownerRoute } from '@/lib/server/owner-route';
import { jsonResponse, readJson } from '@/lib/server/http';
import { getStore } from '@/lib/server/get-store';
import { AppError } from '@/lib/contracts/errors';
import { meaningRequestSchema, type MeaningResponse } from '@/lib/contracts/api';
import { createGenerator } from '@/lib/ai';
import { assembleTranslationInstruction, parseTranslationOutput } from '@/lib/ai/tasks';
import { contentHash } from '@/lib/contracts/text';
import { GENERATION } from '@/lib/contracts/limits';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reply/meaning (D09, ZH-01).
 *
 * The English meaning is a review aid. This endpoint reads the Chinese and returns
 * English; it never writes to the draft, so refreshing the meaning cannot change
 * what the owner is about to post.
 *
 * The response carries the hash of the exact text it describes. If the owner typed
 * while it was in flight, the client compares hashes and discards this answer
 * rather than showing an English sentence that describes text that no longer exists.
 *
 * The answer is validated against the shape this task asks for, not merely checked
 * for being non-empty. Anything the provider returns here is saved to the session
 * and shown as what the owner's Chinese says, so text that is plainly not a
 * translation is a failure to report rather than a meaning to store.
 */
export const POST = ownerRoute(async (request, { session }) => {
  const body = await readJson(request, meaningRequestSchema);
  const store = getStore(session);

  if (!body.session_id) {
    throw new AppError('validation_failed', 'That request was not valid.');
  }

  const replySession = await store.getSession(body.session_id);
  if (!replySession) throw new AppError('not_found', 'That is not available.');

  const currentHash = contentHash(replySession.draft_text);
  if (currentHash !== body.text_hash) {
    // The client is asking about text the server no longer holds. Translating the
    // newer text under the older hash would attach a meaning to the wrong version.
    throw new AppError('version_conflict', 'Your reply changed. Refresh the English meaning.');
  }

  const generator = createGenerator();
  if (!generator) {
    throw new AppError('not_configured', 'Translation is not set up yet. Your reply is unchanged.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATION.attemptDeadlineMs);
  try {
    const attempt = await generator.complete(
      assembleTranslationInstruction(),
      replySession.draft_text,
      { signal: controller.signal, maxOutputTokens: 800, task: 'translation' },
    );

    const parsed = parseTranslationOutput(attempt.rawText);
    if (!parsed.ok) {
      throw new AppError('provider_invalid_response', 'Could not refresh the English meaning.');
    }
    const meaning = parsed.value.english_meaning.trim();

    await store.setSessionMeaning(body.session_id, meaning, currentHash);

    const response: MeaningResponse = { english_meaning: meaning, source_hash: currentHash };
    return jsonResponse(response);
  } finally {
    clearTimeout(timer);
  }
});
