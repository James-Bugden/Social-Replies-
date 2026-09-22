import { ownerRoute } from '@/lib/server/owner-route';
import { jsonResponse, readJson } from '@/lib/server/http';
import { getStore } from '@/lib/server/get-store';
import { AppError } from '@/lib/contracts/errors';
import { refineRequestSchema, type RefineResponse } from '@/lib/contracts/api';
import { createGenerator } from '@/lib/ai';
import { GENERATION } from '@/lib/contracts/limits';

export const dynamic = 'force-dynamic';

const INSTRUCTIONS: Record<string, string> = {
  shorter: 'Make it shorter without losing the useful point. Do not add anything new.',
  more_direct: 'Make it more direct. Remove hedging. Do not make it blunt or rude.',
  warmer: 'Make it warmer. Do not add flattery, and do not add an opening compliment.',
  add_personal_example:
    'Add a first-person example ONLY if one of the supplied approved facts supports it, saying no more than that fact says. If none fits, return the text unchanged.',
};

/**
 * POST /api/reply/refine (D08).
 *
 * This returns a proposal and nothing else. It does not update the session, and
 * the editor is not touched until the owner presses Apply rewrite, because a
 * rewrite that lands while they are mid-sentence destroys work they cannot recover.
 *
 * `base_editor_version` travels back with the proposal so the client can tell
 * whether it is still about the text on screen.
 */
export const POST = ownerRoute(async (request, { session }) => {
  const body = await readJson(request, refineRequestSchema);
  const store = getStore(session);

  const replySession = await store.getSession(body.session_id);
  if (!replySession) throw new AppError('not_found', 'That is not available.');
  if (replySession.editor_version !== body.expected_editor_version) {
    throw new AppError('version_conflict', 'Your reply changed. Try that again.');
  }
  if (replySession.draft_text.trim() === '') {
    throw new AppError('validation_failed', 'Write a reply first.');
  }

  const generator = createGenerator();
  if (!generator) {
    throw new AppError('not_configured', 'Rewrites are not set up yet. Your reply is unchanged.');
  }

  const context = await store.generationContext(body.session_id, []);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATION.attemptDeadlineMs);
  try {
    const attempt = await generator.complete(
      [
        "You revise one social reply on its author's behalf.",
        INSTRUCTIONS[body.action] ?? INSTRUCTIONS.shorter,
        'Return only the revised reply text, with no commentary and no link.',
        context.facts.length > 0
          ? `Approved facts you may draw on:\n${context.facts.map((f) => `- ${f.text}`).join('\n')}`
          : 'There are no approved facts, so do not add a personal story.',
      ].join('\n\n'),
      replySession.draft_text,
      { signal: controller.signal, maxOutputTokens: GENERATION.outputTokenBudget },
    );

    const proposed = attempt.rawText.trim();
    if (proposed === '') throw new AppError('provider_invalid_response', 'Could not rewrite that.');

    const response: RefineResponse = {
      proposed_text: proposed,
      base_editor_version: replySession.editor_version,
      english_meaning: null,
    };
    return jsonResponse(response);
  } finally {
    clearTimeout(timer);
  }
});
