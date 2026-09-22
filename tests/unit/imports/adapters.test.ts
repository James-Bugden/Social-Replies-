import { describe, it, expect } from 'vitest';
import { ADAPTERS, adapterFor } from '@/lib/imports';
import type { ImportRecord, ParsedRecord } from '@/lib/imports/types';
import { FILE_HASH_A, fixture } from './helpers';

/**
 * The four adapters (SR-008 #9).
 *
 * The first test in this file is the most important one in it: every adapter
 * still calls itself synthetic-tested. No real export has been inspected, so an
 * adapter that promoted itself would be claiming a backfill that has not
 * happened.
 */

function records(parsed: readonly ParsedRecord[]): ImportRecord[] {
  return parsed.flatMap((item) => (item.outcome === 'record' ? [item.record] : []));
}

function outcomes(parsed: readonly ParsedRecord[]): string[] {
  return parsed.map((item) => item.outcome);
}

describe('adapter labelling', () => {
  it('labels every adapter synthetic-tested, because no real export was inspected', () => {
    for (const adapter of Object.values(ADAPTERS)) {
      expect(adapter.validationStatus).toBe('synthetic-tested');
      expect(adapter.schemaNote.toLowerCase()).toContain('unconfirmed');
      expect(adapter.adapterVersion).not.toBe('');
      expect(adapter.schemaSignature).not.toBe('');
    }
  });
});

describe('linkedin adapter', () => {
  const adapter = adapterFor('linkedin');
  const input = {
    text: fixture('linkedin-comments.sample.csv'),
    sourceFileHash: FILE_HASH_A,
    ownerAuthorIds: ['owner-synthetic'],
  };

  it('maps the owner’s own comments and quarantines another author’s', () => {
    const parsed = [...adapter.parse(input)];
    expect(outcomes(parsed)).toEqual(['record', 'record', 'record', 'needs_review']);
    const last = parsed[3];
    expect(last?.outcome === 'needs_review' && last.warnings).toContain('other_author');
  });

  it('will not assume authorship when nobody has said which author is the owner', () => {
    const parsed = [...adapter.parse({ text: input.text, sourceFileHash: FILE_HASH_A })];
    expect(outcomes(parsed).every((outcome) => outcome === 'needs_review')).toBe(true);
  });

  it('keeps a date-only value date-only and an absent date unknown', () => {
    const mapped = records([...adapter.parse(input)]);
    expect(mapped[0]?.datePrecision).toBe('timestamp');
    expect(mapped[1]?.datePrecision).toBe('date_only');
    expect(mapped[1]?.postedAt).toBeNull();
    expect(mapped[2]?.datePrecision).toBe('unknown');
    expect(mapped[2]?.postedAt).toBeNull();
    expect(mapped[2]?.postedDate).toBeNull();
  });

  it('preserves a reply containing a comma and a newline as one record', () => {
    const mapped = records([...adapter.parse(input)]);
    expect(mapped[1]?.exactText).toContain('\n');
    expect(mapped[0]?.exactText).toContain(',');
  });

  it('IMP-04: one malformed row is invalid and its neighbours survive', () => {
    const parsed = [
      ...adapter.parse({
        text: fixture('linkedin-comments-malformed.sample.csv'),
        sourceFileHash: FILE_HASH_A,
        ownerAuthorIds: ['owner-synthetic'],
      }),
    ];
    expect(outcomes(parsed)).toEqual(['record', 'invalid', 'record']);
    const broken = parsed[1];
    expect(broken?.outcome === 'invalid' && broken.warnings).toContain('malformed_record');
  });

  it('rejects a file whose headings it does not recognise', () => {
    const parsed = [
      ...adapter.parse({ text: 'a,b,c\n1,2,3\n', sourceFileHash: FILE_HASH_A }),
    ];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.outcome === 'invalid' && parsed[0].warnings).toContain('unsupported_schema');
  });
});

describe('x adapter', () => {
  const adapter = adapterFor('x');
  const input = { text: fixture('x-tweets.sample.js'), sourceFileHash: FILE_HASH_A };

  it('classifies by relationship metadata, not by how the text reads', () => {
    const parsed = [...adapter.parse(input)];
    expect(outcomes(parsed)).toEqual(['record', 'record', 'needs_review', 'record']);

    const mapped = records(parsed);
    expect(mapped[0]?.provenance).toBe('posted_confirmed');
    expect(mapped[0]?.targetRef).toBe('8001');
    // A main post is labelled as one and never counted as a reply.
    expect(mapped[1]?.provenance).toBe('published_main_post');
  });

  it('sends a record that names no reply target to review', () => {
    const parsed = [...adapter.parse(input)];
    const ambiguous = parsed[2];
    expect(ambiguous?.outcome === 'needs_review' && ambiguous.warnings).toContain(
      'ambiguous_reply_or_main_post',
    );
  });

  it('leaves an unreadable date unknown rather than guessing one', () => {
    const mapped = records([...adapter.parse(input)]);
    const undated = mapped.find((record) => record.nativeReplyId === '9004');
    expect(undated?.datePrecision).toBe('unknown');
    expect(undated?.warnings).toContain('unparsable_date');
  });

  it('does not invent a reply URL from an id and a handle', () => {
    const mapped = records([...adapter.parse(input)]);
    expect(mapped.every((record) => record.replyUrl === null)).toBe(true);
  });

  it('does not fetch the parent post it has no text for', () => {
    const mapped = records([...adapter.parse(input)]);
    expect(mapped.every((record) => record.targetText === null)).toBe(true);
  });
});

describe('threads adapter', () => {
  const adapter = adapterFor('threads');
  const input = { text: fixture('threads-export.sample.json'), sourceFileHash: FILE_HASH_A };

  it('states the coverage gap the export itself declares', () => {
    const inspection = adapter.inspect(input);
    expect(inspection.matches).toBe(true);
    expect(inspection.notes.join(' ')).toContain('2026-01-01');
  });

  it('keeps Chinese text exactly and keeps a date-only value date-only', () => {
    const mapped = records([...adapter.parse(input)]);
    expect(mapped[0]?.exactText).toBe('謝謝分享 🙏 面試前先把問題寫下來，現場就不會亂。');
    expect(mapped[0]?.datePrecision).toBe('timestamp');
    expect(mapped[1]?.datePrecision).toBe('date_only');
    expect(mapped[1]?.sourceTimezone).toBe('Asia/Taipei');
  });

  it('keeps missing parent text null rather than filling it in', () => {
    const mapped = records([...adapter.parse(input)]);
    expect(mapped[1]?.targetText).toBeNull();
    expect(mapped[1]?.warnings).not.toContain('malformed_record');
  });

  it('sends a record with no reply target to review', () => {
    const parsed = [...adapter.parse(input)];
    expect(outcomes(parsed)).toEqual(['record', 'record', 'needs_review']);
  });

  it('rejects a file belonging to another product', () => {
    const parsed = [
      ...adapter.parse({ text: fixture('unknown-schema.sample.json'), sourceFileHash: FILE_HASH_A }),
    ];
    expect(parsed[0]?.outcome === 'invalid' && parsed[0].warnings).toContain('unsupported_schema');
  });
});

describe('drive adapter', () => {
  const adapter = adapterFor('drive');
  const input = { text: fixture('drive-history.sample.jsonl'), sourceFileHash: FILE_HASH_A };

  it('translates legacy aliases through the canonical vocabulary', () => {
    const mapped = records([...adapter.parse(input)]);
    expect(mapped.map((record) => record.provenance)).toEqual([
      'posted_confirmed',
      'user_edited_unconfirmed',
      'ai_draft',
      'published_main_post',
      'posted_confirmed',
    ]);
  });

  it('sends an unrecognised status to review instead of choosing the nearest match', () => {
    const parsed = [...adapter.parse(input)];
    const unknownStatus = parsed[4];
    expect(unknownStatus?.outcome).toBe('needs_review');
    expect(unknownStatus?.outcome === 'needs_review' && unknownStatus.warnings).toContain(
      'unknown_provenance',
    );
  });

  it('IMP-05: an AI draft carries no publication evidence and no invented context', () => {
    const mapped = records([...adapter.parse(input)]);
    const draft = mapped.find((record) => record.provenance === 'ai_draft');
    expect(draft?.publicationEvidence).toBe('unknown');
    expect(draft?.targetText).toBeNull();
    expect(draft?.datePrecision).toBe('unknown');
  });

  it('records an edited draft as unconfirmed rather than posted', () => {
    const mapped = records([...adapter.parse(input)]);
    const edited = mapped.find((record) => record.provenance === 'user_edited_unconfirmed');
    expect(edited?.publicationEvidence).toBe('unknown');
  });

  it('IMP-04: one unreadable line is invalid and its neighbours survive', () => {
    const parsed = [
      ...adapter.parse({
        text: fixture('drive-history-malformed.sample.jsonl'),
        sourceFileHash: FILE_HASH_A,
      }),
    ];
    expect(outcomes(parsed)).toEqual(['record', 'invalid', 'record']);
  });
});
