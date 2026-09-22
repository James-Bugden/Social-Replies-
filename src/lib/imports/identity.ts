import type {
  DatePrecision,
  Provenance,
  PublicationEvidence,
} from '@/lib/contracts/vocabulary';
import type { ImportRecord, ImportWarningCode } from './types';

/**
 * Which evidence made two records the same event (C04).
 *
 * The order is fixed and is the whole point of the module. Everything above
 * `file_locator` is evidence the platform or the export issued. Nothing in the
 * list is derived from what the reply says, because two replies that read the
 * same are routinely two different replies, and merging them destroys one of
 * them with no way back.
 */
export type IdentityTier =
  | 'native_reply_id'
  | 'verified_reply_url'
  | 'source_record_id'
  | 'file_locator';

export interface RecordIdentity {
  tier: IdentityTier;
  /** Owner-scoped key for this tier. Private: it is never reported. */
  key: string;
  /**
   * Whether this identity may merge a record with one that arrived in a
   * different file. `file_locator` cannot: it only proves that a rerun of the
   * same file reached the same row again.
   */
  crossFile: boolean;
}

const IDENTITY_ORDER: readonly IdentityTier[] = [
  'native_reply_id',
  'verified_reply_url',
  'source_record_id',
  'file_locator',
];

/**
 * Normalises only the parts of a URL that two exports can legitimately disagree
 * about. The query string is kept: on more than one platform it is where the
 * comment id lives, so dropping it would merge different replies.
 */
export function normaliseReplyUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    // An unparsable string is still a distinct value, so it is compared as one
    // rather than being discarded or repaired into something that might match.
    return trimmed;
  }
}

/** The strongest identity the record actually carries. */
export function recordIdentity(record: ImportRecord): RecordIdentity {
  if (record.nativeReplyId) {
    return {
      tier: 'native_reply_id',
      key: `${record.platform}:${record.nativeReplyId}`,
      crossFile: true,
    };
  }
  if (record.replyUrl && record.replyUrlVerified) {
    return {
      tier: 'verified_reply_url',
      key: normaliseReplyUrl(record.replyUrl),
      crossFile: true,
    };
  }
  if (record.sourceRecordId) {
    return {
      tier: 'source_record_id',
      key: `${record.sourceType}:${record.sourceRecordId}`,
      crossFile: true,
    };
  }
  return {
    tier: 'file_locator',
    key: fileLocatorKey(record),
    crossFile: false,
  };
}

/**
 * The weakest tier. It carries the source type as well as the file hash because
 * the tier is only ever meant to recognise a rerun of one adapter over one file,
 * and a key without it would let two adapters collide on a shared position.
 */
function fileLocatorKey(record: ImportRecord): string {
  return `${record.sourceType}:${record.sourceFileHash}:${record.locator}`;
}

/** Every identity a record carries, strongest first. Used for lookups. */
export function candidateIdentities(record: ImportRecord): RecordIdentity[] {
  const all: RecordIdentity[] = [];
  if (record.nativeReplyId) {
    all.push({
      tier: 'native_reply_id',
      key: `${record.platform}:${record.nativeReplyId}`,
      crossFile: true,
    });
  }
  if (record.replyUrl && record.replyUrlVerified) {
    all.push({
      tier: 'verified_reply_url',
      key: normaliseReplyUrl(record.replyUrl),
      crossFile: true,
    });
  }
  if (record.sourceRecordId) {
    all.push({
      tier: 'source_record_id',
      key: `${record.sourceType}:${record.sourceRecordId}`,
      crossFile: true,
    });
  }
  all.push({ tier: 'file_locator', key: fileLocatorKey(record), crossFile: false });
  return all.sort((a, b) => IDENTITY_ORDER.indexOf(a.tier) - IDENTITY_ORDER.indexOf(b.tier));
}

function tierValues(
  record: ImportRecord,
  tier: IdentityTier,
): string | null {
  switch (tier) {
    case 'native_reply_id':
      return record.nativeReplyId;
    case 'verified_reply_url':
      return record.replyUrl && record.replyUrlVerified
        ? normaliseReplyUrl(record.replyUrl)
        : null;
    case 'source_record_id':
      return record.sourceRecordId;
    case 'file_locator':
      return fileLocatorKey(record);
  }
}

/**
 * Whether two records describe the same published event.
 *
 * The first tier both records carry decides, and its verdict is final: if two
 * records both have a native reply id and the ids differ, they are different
 * events even if every other field agrees. One record carrying an identity the
 * other lacks is not disagreement, so the comparison falls through to the next
 * tier.
 *
 * Text, dates and target text are never consulted. Identical wording under two
 * different posts is two events (IMP-02), and the same wording reposted on a
 * different day is two events as well.
 */
export function sameEvent(a: ImportRecord, b: ImportRecord): boolean {
  // A reply cannot be the same event on two platforms, whatever its ids say.
  if (a.platform !== b.platform) return false;

  for (const tier of IDENTITY_ORDER) {
    // The export-issued record id is only unique within the export that issued it.
    if (tier === 'source_record_id' && a.sourceType !== b.sourceType) continue;

    const left = tierValues(a, tier);
    const right = tierValues(b, tier);
    if (left === null || right === null) continue;
    return left === right;
  }
  return false;
}

/**
 * How strongly a provenance value asserts that the reply was actually published.
 *
 * `published_main_post` is deliberately absent. It is a different kind of record
 * rather than a rung on this ladder, and treating it as one is how a main post
 * quietly becomes a reply.
 */
const PROOF_RANK: Readonly<Record<Provenance, number>> = Object.freeze({
  ai_draft: 0,
  user_edited_unconfirmed: 1,
  posted_confirmed: 2,
  published_main_post: -1,
});

/**
 * How independent each kind of publication evidence is.
 *
 * `user_confirmed` sits below the two platform-derived kinds on purpose: C02 is
 * explicit that marking something posted is the owner's attestation and not
 * platform verification.
 */
const EVIDENCE_RANK: Readonly<Record<PublicationEvidence, number>> = Object.freeze({
  unknown: 0,
  user_confirmed: 1,
  platform_export: 2,
  verified_url: 3,
});

const PRECISION_RANK: Readonly<Record<DatePrecision, number>> = Object.freeze({
  unknown: 0,
  date_only: 1,
  timestamp: 2,
});

/** The existing library row, in the fields reconciliation is allowed to touch. */
export interface ReconcilableReply {
  provenance: Provenance;
  publicationEvidence: PublicationEvidence;
  datePrecision: DatePrecision;
  postedAt: string | null;
  postedDate: string | null;
  sourceTimezone: string | null;
  nativeReplyId: string | null;
  replyUrl: string | null;
}

export interface Reconciliation {
  /** Fields to write back, or an empty object when the existing row already wins. */
  changes: Partial<ReconcilableReply>;
  warnings: ImportWarningCode[];
  /** True when the two records disagree in a way a person has to settle. */
  conflict: boolean;
}

/**
 * Merges a second sighting of an already-imported event into the row that exists.
 *
 * Only two things are ever upgraded: proof and precision. The stored text is not
 * one of them. A second export that renders the same reply differently does not
 * get to rewrite the first export's evidence, because there is no way to tell
 * which rendering is the original.
 */
export function reconcile(
  existing: ReconcilableReply,
  incoming: ImportRecord,
): Reconciliation {
  const warnings: ImportWarningCode[] = [];
  const changes: Partial<ReconcilableReply> = {};

  if (incoming.provenance === null) {
    // An unrecognised value cannot upgrade anything, and it cannot be ignored.
    return { changes: {}, warnings: ['unknown_provenance'], conflict: true };
  }

  const existingIsMainPost = existing.provenance === 'published_main_post';
  const incomingIsMainPost = incoming.provenance === 'published_main_post';
  if (existingIsMainPost !== incomingIsMainPost) {
    return { changes: {}, warnings: ['provenance_conflict'], conflict: true };
  }

  if (
    existing.nativeReplyId &&
    incoming.nativeReplyId &&
    existing.nativeReplyId !== incoming.nativeReplyId
  ) {
    return { changes: {}, warnings: ['identity_conflict'], conflict: true };
  }

  if (PROOF_RANK[incoming.provenance] > PROOF_RANK[existing.provenance]) {
    changes.provenance = incoming.provenance;
  }
  if (EVIDENCE_RANK[incoming.publicationEvidence] > EVIDENCE_RANK[existing.publicationEvidence]) {
    changes.publicationEvidence = incoming.publicationEvidence;
  }
  if (PRECISION_RANK[incoming.datePrecision] > PRECISION_RANK[existing.datePrecision]) {
    changes.datePrecision = incoming.datePrecision;
    changes.postedAt = incoming.postedAt;
    changes.postedDate = incoming.postedDate;
    changes.sourceTimezone = incoming.sourceTimezone;
  }

  // A later export supplying an identity the first one lacked is new evidence,
  // not a correction, so it is filled in rather than compared.
  if (!existing.nativeReplyId && incoming.nativeReplyId) {
    changes.nativeReplyId = incoming.nativeReplyId;
  }
  if (!existing.replyUrl && incoming.replyUrl && incoming.replyUrlVerified) {
    changes.replyUrl = incoming.replyUrl;
  }

  return { changes, warnings, conflict: false };
}

/** Exposed so a caller can explain a ranking decision without duplicating it. */
export const IDENTITY_RANKS = Object.freeze({
  proof: PROOF_RANK,
  evidence: EVIDENCE_RANK,
  precision: PRECISION_RANK,
});
