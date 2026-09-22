import { ownerRoute } from '@/lib/server/owner-route';
import { jsonResponse, readJson } from '@/lib/server/http';
import { AppError } from '@/lib/contracts/errors';
import { sessionPatchRequestSchema } from '@/lib/contracts/api';
import { contentHash } from '@/lib/contracts/text';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/reply/session (C07, C10).
 *
 * The versioned server draft. `expected_editor_version` is what stops a second tab,
 * or a slow request that overtook a fast one, from writing older text over newer
 * text: a mismatch is a 409 and the caller keeps what it has.
 *
 * Saving a draft never touches the English meaning itself. It reports whether the
 * meaning has gone stale so the client can say so, because the Chinese is the
 * posting text and only the owner changes it.
 */
export const PATCH = ownerRoute(async (request, { session }) => {
  const body = await readJson(request, sessionPatchRequestSchema);
  const hash = contentHash(body.draft_text);

  const { data: current, error: readError } = await session.supabase
    .from('reply_sessions')
    .select('editor_version, state, meaning_source_hash')
    .eq('id', body.session_id)
    .maybeSingle();

  if (readError) throw new AppError('internal_error', 'Something went wrong. Your text is still here.');
  if (!current) throw new AppError('not_found', 'That is not available.');

  if (current.state !== 'draft') {
    throw new AppError('version_conflict', 'This reply was already recorded.');
  }
  if (current.editor_version !== body.expected_editor_version) {
    throw new AppError('version_conflict', 'This changed somewhere else. Check the latest version before saving.');
  }

  const nextVersion = current.editor_version + 1;

  const { error: writeError } = await session.supabase
    .from('reply_sessions')
    .update({ draft_text: body.draft_text, draft_hash: hash, editor_version: nextVersion })
    .eq('id', body.session_id)
    .eq('editor_version', current.editor_version);

  if (writeError) {
    // The row moved between the read and the write, which is the same race the
    // version check exists for.
    throw new AppError('version_conflict', 'This changed somewhere else. Check the latest version before saving.');
  }

  return jsonResponse({
    session_id: body.session_id,
    editor_version: nextVersion,
    draft_hash: hash,
    meaning_is_stale:
      current.meaning_source_hash !== null && current.meaning_source_hash !== hash,
  });
});
