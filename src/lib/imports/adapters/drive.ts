import { canonicalProvenance, platformSchema } from '@/lib/contracts/vocabulary';
import type { PublicationEvidence } from '@/lib/contracts/vocabulary';
import { classifyDate } from '../dates';
import type {
  AdapterInput,
  AdapterInspection,
  ImportAdapter,
  ImportRecord,
  ImportWarningCode,
  ParsedRecord,
} from '../types';

/**
 * The owner's own reply history file, kept privately on Drive, read as JSONL.
 *
 * This is the only source that carries a status the owner wrote themselves, so
 * it is the only one where a draft and a posted reply can be told apart at all.
 * It is also the one where getting that wrong is worst: promoting an AI
 * suggestion to a posted reply puts words into the voice corpus that the owner
 * never published.
 *
 * So the status goes through `canonicalProvenance`, which knows the legacy
 * aliases and returns null for anything else. Null becomes review. There is no
 * nearest-match branch in this file and there must not be one.
 *
 * NOTHING HERE HAS BEEN CHECKED AGAINST THE REAL FILE. The field names are the
 * synthetic sample's, so `validationStatus` is 'synthetic-tested'. The private
 * locator of the real file lives in configuration, never in this repository.
 */

interface DriveRow {
  record_id?: unknown;
  platform?: unknown;
  status?: unknown;
  text?: unknown;
  posted_on?: unknown;
  timezone?: unknown;
  reply_url?: unknown;
  native_reply_id?: unknown;
  target?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * How strongly each status asserts publication.
 *
 * A draft the owner edited is evidence that they wrote it, not evidence that
 * anyone saw it, which is why only the confirmed statuses carry an attestation.
 */
const EVIDENCE_FOR_STATUS: Readonly<Record<string, PublicationEvidence>> = Object.freeze({
  posted_confirmed: 'user_confirmed',
  published_main_post: 'user_confirmed',
  user_edited_unconfirmed: 'unknown',
  ai_draft: 'unknown',
});

function lines(text: string): { line: number; body: string }[] {
  return text
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .map((body, index) => ({ line: index + 1, body }))
    .filter((entry) => entry.body.trim() !== '');
}

export const driveAdapter: ImportAdapter = {
  sourceType: 'drive',
  adapterVersion: 'drive-0.1.0',
  schemaSignature: 'jsonl:{record_id,platform,status,text,posted_on,target}',
  validationStatus: 'synthetic-tested',
  schemaNote:
    'Schema unconfirmed. Written against a synthetic JSONL sample; the authorised private history file has not been inspected, so the backfill is still pending.',

  inspect(input: AdapterInput): AdapterInspection {
    const first = lines(input.text)[0];
    if (!first) return { matches: false, observedSignature: 'empty', notes: [] };
    try {
      const parsed: unknown = JSON.parse(first.body);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { matches: false, observedSignature: 'not-an-object', notes: [] };
      }
      const row = parsed as DriveRow;
      return {
        matches: asString(row.text) !== null && asString(row.status) !== null,
        observedSignature: `jsonl:${Object.keys(row).sort().join(',')}`,
        notes: [
          'Statuses are mapped through the canonical vocabulary. An unrecognised status is reviewed, never guessed.',
        ],
      };
    } catch {
      return { matches: false, observedSignature: 'unparsable', notes: [] };
    }
  },

  *parse(input: AdapterInput): Generator<ParsedRecord> {
    for (const entry of lines(input.text)) {
      const locator = `line:${entry.line}`;
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry.body);
      } catch {
        // One unreadable line does not cost the readable lines around it.
        yield { outcome: 'invalid', locator, warnings: ['malformed_record'] };
        continue;
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        yield { outcome: 'invalid', locator, warnings: ['malformed_record'] };
        continue;
      }

      const row = parsed as DriveRow;
      const text = asString(row.text);
      if (text === null) {
        yield { outcome: 'invalid', locator, warnings: ['empty_text'] };
        continue;
      }

      const platform = platformSchema.safeParse(row.platform);
      if (!platform.success) {
        yield { outcome: 'needs_review', locator, warnings: ['unsupported_platform'] };
        continue;
      }

      const rawStatus = asString(row.status);
      const provenance = rawStatus === null ? null : canonicalProvenance(rawStatus);
      if (provenance === null) {
        yield { outcome: 'needs_review', locator, warnings: ['unknown_provenance'] };
        continue;
      }

      const dates = classifyDate(asString(row.posted_on), asString(row.timezone));
      const warnings: ImportWarningCode[] = [...dates.warnings];

      const target =
        row.target !== null && typeof row.target === 'object' && !Array.isArray(row.target)
          ? (row.target as { id?: unknown; text?: unknown; url?: unknown; parent_text?: unknown })
          : null;

      const replyUrl = asString(row.reply_url);
      const nativeId = asString(row.native_reply_id);
      const recordId = asString(row.record_id);
      if (recordId === null) warnings.push('no_stable_identity');

      const record: ImportRecord = {
        platform: platform.data,
        sourceType: 'drive',
        exactText: text,
        targetKind: 'post',
        targetText: target ? asString(target.text) : null,
        parentText: target ? asString(target.parent_text) : null,
        targetRef: target ? asString(target.id) ?? asString(target.url) : null,
        sourceUrl: target ? asString(target.url) : null,
        replyUrl,
        // The owner's own file records the address it was given; it is treated as
        // canonical because the owner wrote it down, not because it was resolved.
        replyUrlVerified: replyUrl !== null,
        nativeReplyId: nativeId,
        sourceRecordId: recordId,
        provenance,
        publicationEvidence: EVIDENCE_FOR_STATUS[provenance] ?? 'unknown',
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
