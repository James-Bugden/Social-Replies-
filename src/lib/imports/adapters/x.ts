import { classifyTwitterDate } from '../dates';
import { parseArchivePayload } from '../safety';
import type {
  AdapterInput,
  AdapterInspection,
  ImportAdapter,
  ImportRecord,
  ImportWarningCode,
  ParsedRecord,
} from '../types';

/**
 * The X archive.
 *
 * The archive's data files are JavaScript assignments whose right-hand side is
 * JSON. They are read by `parseArchivePayload`, which strips the assignment and
 * calls `JSON.parse`. Nothing in this file evaluates the archive, and nothing in
 * this file may: the file arrives from outside, and the difference between
 * parsing it and running it is the difference between reading an archive and
 * executing whatever its author put there.
 *
 * NOTHING HERE HAS BEEN CHECKED AGAINST A REAL X ARCHIVE. The field names follow
 * the widely described shape, but the sample they were written against is
 * synthetic, so `validationStatus` is 'synthetic-tested' and the backfill is
 * pending.
 *
 * The classification rule is deliberately dull. A record with a reply target id
 * is a reply; a record with no reply fields at all is a main post; a record that
 * mentions a user but names no target is neither, and goes to review. How
 * conversational the text sounds is not evidence and is never consulted.
 */

interface TweetShape {
  id_str?: unknown;
  full_text?: unknown;
  text?: unknown;
  created_at?: unknown;
  in_reply_to_status_id_str?: unknown;
  in_reply_to_user_id_str?: unknown;
  in_reply_to_screen_name?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function tweetOf(entry: unknown): TweetShape | null {
  if (entry === null || typeof entry !== 'object') return null;
  const wrapper = entry as { tweet?: unknown };
  const inner = wrapper.tweet ?? entry;
  if (inner === null || typeof inner !== 'object') return null;
  return inner as TweetShape;
}

export const xAdapter: ImportAdapter = {
  sourceType: 'x',
  adapterVersion: 'x-0.1.0',
  schemaSignature: 'js-wrapped-json:YTD.tweets.partN[].tweet{id_str,full_text,created_at}',
  validationStatus: 'synthetic-tested',
  schemaNote:
    'Schema unconfirmed. Written against a synthetic archive file; the real X archive has not been inspected, so the backfill is still pending.',

  inspect(input: AdapterInput): AdapterInspection {
    const parsed = parseArchivePayload(input.text);
    if (!parsed.ok) {
      return { matches: false, observedSignature: 'unparsable', notes: [] };
    }
    if (!Array.isArray(parsed.data)) {
      return { matches: false, observedSignature: typeof parsed.data, notes: [] };
    }
    const first = tweetOf(parsed.data[0]);
    const matches = first !== null && (asString(first.full_text) !== null || asString(first.text) !== null);
    return {
      matches,
      observedSignature: first ? Object.keys(first).sort().join(',') : 'empty',
      notes: [
        'The archive is parsed as data. Its JavaScript is never evaluated.',
        'An export covers the account as the platform assembled it, which is not a guarantee of lifetime coverage.',
      ],
    };
  },

  *parse(input: AdapterInput): Generator<ParsedRecord> {
    const parsed = parseArchivePayload(input.text);
    if (!parsed.ok) {
      yield { outcome: 'invalid', locator: 'payload', warnings: parsed.warnings };
      return;
    }
    if (!Array.isArray(parsed.data)) {
      yield { outcome: 'invalid', locator: 'payload', warnings: ['unsupported_schema'] };
      return;
    }

    for (let index = 0; index < parsed.data.length; index += 1) {
      const locator = `tweet:${index}`;
      const tweet = tweetOf(parsed.data[index]);
      if (!tweet) {
        yield { outcome: 'invalid', locator, warnings: ['malformed_record'] };
        continue;
      }

      const id = asString(tweet.id_str);
      const text = asString(tweet.full_text) ?? asString(tweet.text);
      if (text === null) {
        yield { outcome: 'invalid', locator, warnings: ['empty_text'] };
        continue;
      }
      if (id === null) {
        yield { outcome: 'invalid', locator, warnings: ['malformed_record'] };
        continue;
      }

      const replyToStatus = asString(tweet.in_reply_to_status_id_str);
      const replyToUser = asString(tweet.in_reply_to_user_id_str);
      const replyToHandle = asString(tweet.in_reply_to_screen_name);

      if (replyToStatus === null && (replyToUser !== null || replyToHandle !== null)) {
        // Something links this record to another account without naming what it
        // replied to. Calling it a reply would be a guess and calling it a main
        // post would be another, so it is neither until a person decides.
        yield { outcome: 'needs_review', locator, warnings: ['ambiguous_reply_or_main_post'] };
        continue;
      }

      const dates = classifyTwitterDate(asString(tweet.created_at));
      const warnings: ImportWarningCode[] = [...dates.warnings];

      const record: ImportRecord = {
        platform: 'x',
        sourceType: 'x',
        exactText: text,
        targetKind: 'post',
        // The archive carries ids, not the text of what was replied to, and that
        // text is not fetched: C04 forbids retrieving missing context by scraping.
        targetText: null,
        parentText: null,
        targetRef: replyToStatus,
        sourceUrl: null,
        // A URL could be assembled from the id and a handle, but an assembled
        // string is not a verified canonical address and must not become identity.
        replyUrl: null,
        replyUrlVerified: false,
        nativeReplyId: id,
        sourceRecordId: id,
        provenance: replyToStatus === null ? 'published_main_post' : 'posted_confirmed',
        publicationEvidence: 'platform_export',
        datePrecision: dates.datePrecision,
        postedAt: dates.postedAt,
        postedDate: dates.postedDate,
        sourceTimezone: dates.sourceTimezone,
        sourceFileHash: input.sourceFileHash,
        locator,
        warnings,
      };
      yield { outcome: 'record', locator, record };
    }
  },
};
