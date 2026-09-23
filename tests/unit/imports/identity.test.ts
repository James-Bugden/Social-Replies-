import { describe, it, expect } from 'vitest';
import { recordIdentity, sameEvent, reconcile, normaliseReplyUrl } from '@/lib/imports/identity';
import { FILE_HASH_A, FILE_HASH_B, makeRecord } from './helpers';

/**
 * The identity rules (C04, IMP-01, IMP-02).
 *
 * Every case below plants the mistake first. The interesting question is never
 * whether two obviously different replies stay apart; it is whether two replies
 * that look identical to a human reader stay apart, and whether the same reply
 * arriving twice stops being two.
 */

describe('recordIdentity', () => {
  it('prefers the native reply id over everything else the record carries', () => {
    const identity = recordIdentity(
      makeRecord({
        nativeReplyId: 'native-9',
        replyUrl: 'https://example.com/feed/comment/9',
        replyUrlVerified: true,
        sourceRecordId: 'rec-9',
      }),
    );
    expect(identity.tier).toBe('native_reply_id');
    expect(identity.crossFile).toBe(true);
  });

  it('will not treat an assembled reply URL as identity', () => {
    const identity = recordIdentity(
      makeRecord({
        nativeReplyId: null,
        replyUrl: 'https://example.com/x/owner/status/1',
        replyUrlVerified: false,
        sourceRecordId: null,
      }),
    );
    expect(identity.tier).toBe('file_locator');
    expect(identity.crossFile).toBe(false);
  });

  it('falls back to the file hash and locator, which cannot merge across files', () => {
    const identity = recordIdentity(
      makeRecord({ nativeReplyId: null, replyUrl: null, sourceRecordId: null }),
    );
    expect(identity).toEqual({
      tier: 'file_locator',
      key: `linkedin:${FILE_HASH_A}:row:2`,
      crossFile: false,
    });
  });
});

describe('sameEvent', () => {
  it('IMP-02: identical wording under two different posts is two events', () => {
    const text = 'The screening step is where the week goes.';
    const a = makeRecord({
      exactText: text,
      nativeReplyId: 'native-a',
      sourceRecordId: 'rec-a',
      targetRef: 'post-1',
      locator: 'row:2',
    });
    const b = makeRecord({
      exactText: text,
      nativeReplyId: 'native-b',
      sourceRecordId: 'rec-b',
      targetRef: 'post-2',
      locator: 'row:3',
    });
    expect(sameEvent(a, b)).toBe(false);
  });

  it('identical wording on the same day with no identity at all stays two events', () => {
    const shared = {
      exactText: 'Congratulations, well deserved.',
      nativeReplyId: null,
      sourceRecordId: null,
      replyUrl: null,
      postedAt: '2026-03-04T01:12:00.000Z',
    };
    const a = makeRecord({ ...shared, locator: 'row:2' });
    const b = makeRecord({ ...shared, locator: 'row:8' });
    expect(sameEvent(a, b)).toBe(false);
  });

  it('IMP-01: the same native reply id from two different files is one event', () => {
    const a = makeRecord({ sourceFileHash: FILE_HASH_A, nativeReplyId: 'native-7' });
    const b = makeRecord({
      sourceFileHash: FILE_HASH_B,
      nativeReplyId: 'native-7',
      exactText: 'The second export rendered the text slightly differently.',
      locator: 'row:41',
      sourceRecordId: 'other-export-rec',
    });
    expect(sameEvent(a, b)).toBe(true);
  });

  it('treats disagreeing native ids as final, whatever the rest of the record says', () => {
    const a = makeRecord({ nativeReplyId: 'native-1', sourceRecordId: 'rec-shared' });
    const b = makeRecord({ nativeReplyId: 'native-2', sourceRecordId: 'rec-shared' });
    expect(sameEvent(a, b)).toBe(false);
  });

  it('does not let one record’s missing id block a lower tier', () => {
    const a = makeRecord({ nativeReplyId: null, sourceRecordId: 'rec-5' });
    const b = makeRecord({ nativeReplyId: 'native-9', sourceRecordId: 'rec-5' });
    expect(sameEvent(a, b)).toBe(true);
  });

  it('scopes an export record id to the export that issued it', () => {
    const a = makeRecord({ sourceType: 'linkedin', nativeReplyId: null, sourceRecordId: '42' });
    const b = makeRecord({ sourceType: 'drive', nativeReplyId: null, sourceRecordId: '42' });
    expect(sameEvent(a, b)).toBe(false);
  });

  it('never merges across platforms', () => {
    const a = makeRecord({ platform: 'linkedin', nativeReplyId: 'shared' });
    const b = makeRecord({ platform: 'x', nativeReplyId: 'shared' });
    expect(sameEvent(a, b)).toBe(false);
  });

  it('matches a rerun of the same file at the same position', () => {
    const a = makeRecord({ nativeReplyId: null, sourceRecordId: null, locator: 'row:12' });
    const b = makeRecord({ nativeReplyId: null, sourceRecordId: null, locator: 'row:12' });
    expect(sameEvent(a, b)).toBe(true);
  });
});

describe('normaliseReplyUrl', () => {
  it('keeps the query string, which is where some platforms put the comment id', () => {
    expect(normaliseReplyUrl('https://Example.com/feed/post/1?commentId=99')).toBe(
      'https://example.com/feed/post/1?commentId=99',
    );
  });

  it('does not repair an unparsable value into something that might match', () => {
    expect(normaliseReplyUrl('  not a url  ')).toBe('not a url');
  });
});

describe('reconcile', () => {
  const existing = {
    provenance: 'user_edited_unconfirmed' as const,
    publicationEvidence: 'unknown' as const,
    datePrecision: 'unknown' as const,
    postedAt: null,
    postedDate: null,
    sourceTimezone: null,
    nativeReplyId: null,
    replyUrl: null,
  };

  it('keeps the stronger proven status and the more precise date', () => {
    const result = reconcile(
      existing,
      makeRecord({
        provenance: 'posted_confirmed',
        publicationEvidence: 'platform_export',
        datePrecision: 'timestamp',
        postedAt: '2026-03-04T01:12:00.000Z',
      }),
    );
    expect(result.conflict).toBe(false);
    expect(result.changes.provenance).toBe('posted_confirmed');
    expect(result.changes.publicationEvidence).toBe('platform_export');
    expect(result.changes.datePrecision).toBe('timestamp');
  });

  it('never downgrades a confirmed reply back to a draft', () => {
    const result = reconcile(
      {
        ...existing,
        provenance: 'posted_confirmed',
        publicationEvidence: 'platform_export',
      },
      makeRecord({ provenance: 'ai_draft', publicationEvidence: 'unknown' }),
    );
    expect(result.changes.provenance).toBeUndefined();
    expect(result.changes.publicationEvidence).toBeUndefined();
  });

  it('ranks the owner’s attestation below the platform’s own record', () => {
    const result = reconcile(
      { ...existing, publicationEvidence: 'user_confirmed' },
      makeRecord({ publicationEvidence: 'platform_export' }),
    );
    expect(result.changes.publicationEvidence).toBe('platform_export');
  });

  it('refuses to turn a main post into a reply, or the reverse', () => {
    const result = reconcile(
      { ...existing, provenance: 'published_main_post' },
      makeRecord({ provenance: 'posted_confirmed' }),
    );
    expect(result.conflict).toBe(true);
    expect(result.warnings).toContain('provenance_conflict');
    expect(result.changes).toEqual({});
  });

  it('flags two different native ids rather than picking one', () => {
    const result = reconcile(
      { ...existing, nativeReplyId: 'native-1' },
      makeRecord({ nativeReplyId: 'native-2' }),
    );
    expect(result.conflict).toBe(true);
    expect(result.warnings).toContain('identity_conflict');
  });

  it('sends an unrecognised provenance to review instead of upgrading anything', () => {
    const result = reconcile(existing, makeRecord({ provenance: null }));
    expect(result.conflict).toBe(true);
    expect(result.warnings).toContain('unknown_provenance');
  });

  it('fills in an identity the first export lacked without comparing text', () => {
    const result = reconcile(
      existing,
      makeRecord({
        nativeReplyId: 'native-late',
        replyUrl: 'https://example.com/feed/comment/5',
        replyUrlVerified: true,
        exactText: 'A different rendering of the same reply.',
      }),
    );
    expect(result.changes.nativeReplyId).toBe('native-late');
    expect(result.changes.replyUrl).toBe('https://example.com/feed/comment/5');
  });
});
