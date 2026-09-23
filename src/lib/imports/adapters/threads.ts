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
 * Threads / Meta replies, read from a JSON export.
 *
 * NOTHING HERE HAS BEEN CHECKED AGAINST A REAL THREADS EXPORT. The shape below
 * is the synthetic sample's, so `validationStatus` is 'synthetic-tested'.
 *
 * The specific risk with this source is coverage rather than parsing. An export
 * that begins part way through the account's life looks exactly like a complete
 * one once the records are in a table, so a `history_from` field the file states
 * is surfaced as a coverage note and the gap stays visible in the report instead
 * of disappearing into a row count.
 */

interface ThreadsEnvelope {
  schema?: unknown;
  version?: unknown;
  history_from?: unknown;
  timezone?: unknown;
  replies?: unknown;
}

interface ThreadsReply {
  id?: unknown;
  text?: unknown;
  created_at?: unknown;
  timezone?: unknown;
  permalink?: unknown;
  in_reply_to?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function envelopeOf(text: string): ThreadsEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(text.replace(/^﻿/, ''));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as ThreadsEnvelope;
  } catch {
    return null;
  }
}

export const threadsAdapter: ImportAdapter = {
  sourceType: 'threads',
  adapterVersion: 'threads-0.1.0',
  schemaSignature: 'json:{schema:"threads-export",replies:[{id,text,created_at,in_reply_to}]}',
  validationStatus: 'synthetic-tested',
  schemaNote:
    'Schema unconfirmed. Written against a synthetic JSON sample; the real Threads export has not been inspected, and any history it omits stays an explicit coverage gap.',

  inspect(input: AdapterInput): AdapterInspection {
    const envelope = envelopeOf(input.text);
    if (!envelope) return { matches: false, observedSignature: 'unparsable', notes: [] };

    const notes: string[] = [];
    const historyFrom = asString(envelope.history_from);
    if (historyFrom) {
      notes.push(`The export states its history begins at ${historyFrom}. Anything earlier is not covered.`);
    } else {
      notes.push('The export does not state how far back it reaches, so its coverage is unknown.');
    }

    return {
      matches: envelope.schema === 'threads-export' && Array.isArray(envelope.replies),
      observedSignature: `json:${Object.keys(envelope).sort().join(',')}`,
      notes,
    };
  },

  *parse(input: AdapterInput): Generator<ParsedRecord> {
    const envelope = envelopeOf(input.text);
    if (!envelope) {
      yield { outcome: 'invalid', locator: 'payload', warnings: ['malformed_record'] };
      return;
    }
    if (envelope.schema !== 'threads-export' || !Array.isArray(envelope.replies)) {
      yield { outcome: 'invalid', locator: 'payload', warnings: ['unsupported_schema'] };
      return;
    }

    const fileTimezone = asString(envelope.timezone);

    for (let index = 0; index < envelope.replies.length; index += 1) {
      const locator = `reply:${index}`;
      const raw = envelope.replies[index];
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        yield { outcome: 'invalid', locator, warnings: ['malformed_record'] };
        continue;
      }

      const reply = raw as ThreadsReply;
      const text = asString(reply.text);
      if (text === null) {
        yield { outcome: 'invalid', locator, warnings: ['empty_text'] };
        continue;
      }

      const parent =
        reply.in_reply_to !== null && typeof reply.in_reply_to === 'object'
          ? (reply.in_reply_to as { id?: unknown; text?: unknown; author?: unknown })
          : null;

      if (parent === null) {
        // Without a target this record could be a reply or a main post. The
        // export does not say which, so neither does this adapter.
        yield { outcome: 'needs_review', locator, warnings: ['ambiguous_reply_or_main_post'] };
        continue;
      }

      const dates = classifyDate(
        asString(reply.created_at),
        asString(reply.timezone) ?? fileTimezone,
      );
      const warnings: ImportWarningCode[] = [...dates.warnings];

      const id = asString(reply.id);
      if (id === null) warnings.push('missing_native_id');

      const permalink = asString(reply.permalink);

      const record: ImportRecord = {
        platform: 'threads',
        sourceType: 'threads',
        exactText: text,
        targetKind: 'post',
        targetText: asString(parent.text),
        parentText: null,
        targetRef: asString(parent.id),
        sourceUrl: null,
        replyUrl: permalink,
        replyUrlVerified: permalink !== null,
        nativeReplyId: id,
        sourceRecordId: id,
        provenance: 'posted_confirmed',
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
