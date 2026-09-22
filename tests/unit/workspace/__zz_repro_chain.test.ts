import { describe, expect, it } from 'vitest';
import { initialState, workspaceReducer } from '@/lib/workspace/reducer';
import { createMemoryStore } from '@/lib/server/memory-store';
import { contentHash } from '@/lib/contracts/text';

function idea(text: string) {
  return { id: 'i1', reply_text: text, english_meaning: null } as never;
}

describe('repro', () => {
  it('case A: use_idea fills draft, server draft_text stays empty, editor_version stays 0', async () => {
    const store = createMemoryStore();
    const res = await store.analyse({
      requestKey: 'k1',
      platform: 'linkedin',
      targetKind: 'post',
      sourceText: 'hello world',
      parentText: '',
      sourceUrl: null,
    } as never);
    let s = initialState('linkedin');
    s = workspaceReducer(s, {
      type: 'analyse_succeeded',
      sessionId: res.sessionId,
      sourceVersion: res.sourceVersion,
      contextVersion: res.contextVersion,
      editorVersion: res.editorVersion,
      history: { state: 'empty', items: [], nextCursor: null, reason: null },
      resources: { state: 'empty', items: [], reason: null },
    });
    s = workspaceReducer(s, { type: 'use_idea', idea: idea('IDEA TEXT') });
    expect(s.draft).toBe('IDEA TEXT');
    const server = await store.getSession(res.sessionId);
    console.log('A: client draft=', JSON.stringify(s.draft), 'server draft_text=', JSON.stringify(server!.draft_text), 'clientVer=', s.editorVersion, 'serverVer=', server!.editor_version);
    // refine route precondition, verbatim from route.ts
    expect(server!.editor_version === s.editorVersion).toBe(true); // no 409
    expect(server!.draft_text.trim() === '').toBe(true);           // -> validation_failed
  });

  it('case B: accept_proposal advances client text but not server text or version', async () => {
    const store = createMemoryStore();
    const res = await store.analyse({
      requestKey: 'k2', platform: 'linkedin', targetKind: 'post',
      sourceText: 'hello world', parentText: '', sourceUrl: null,
    } as never);
    let s = initialState('linkedin');
    s = workspaceReducer(s, {
      type: 'analyse_succeeded', sessionId: res.sessionId, sourceVersion: res.sourceVersion,
      contextVersion: res.contextVersion, editorVersion: res.editorVersion,
      history: { state: 'empty', items: [], nextCursor: null, reason: null },
      resources: { state: 'empty', items: [], reason: null },
    });
    // owner types T1, debounced save lands
    s = workspaceReducer(s, { type: 'edit_draft', value: 'T1', hash: contentHash('T1') });
    const saved = await store.updateSessionDraft(res.sessionId, s.editorVersion, 'T1', contentHash('T1'));
    s = workspaceReducer(s, { type: 'draft_saved_to_server', editorVersion: saved.editorVersion });
    // warmer proposal at that version, accepted
    s = workspaceReducer(s, { type: 'propose', proposal: { text: 'T2', baseEditorVersion: s.editorVersion, origin: 'refine', ideaId: null } });
    s = workspaceReducer(s, { type: 'accept_proposal', hash: contentHash('T2') });
    expect(s.draft).toBe('T2');
    const server = await store.getSession(res.sessionId);
    console.log('B: client draft=', JSON.stringify(s.draft), 'server draft_text=', JSON.stringify(server!.draft_text), 'clientVer=', s.editorVersion, 'serverVer=', server!.editor_version);
    // refine: version matches -> no conflict, but rewrites T1
    expect(server!.editor_version).toBe(s.editorVersion);
    expect(server!.draft_text).toBe('T1');
    // meaning: hashes differ -> version_conflict forever
    expect(contentHash(server!.draft_text) === contentHash(s.draft)).toBe(false);
  });
});
