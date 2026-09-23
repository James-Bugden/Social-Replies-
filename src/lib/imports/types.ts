import type {
  DatePrecision,
  ImportDisposition,
  ImportSourceType,
  Platform,
  Provenance,
  PublicationEvidence,
  TargetKind,
} from '@/lib/contracts/vocabulary';
import type { SqlRunner } from '@/lib/retrieval/runner';

/**
 * The one record shape every adapter emits (C02, C04).
 *
 * Its nullable fields are the point of it. An export that does not say when
 * something was posted, or what it was replying to, or whether the owner wrote
 * it, produces nulls here and a warning code. Nothing downstream is allowed to
 * fill those in from the import clock, from the surrounding records or from a
 * classifier, because a guess written into an archive is indistinguishable from
 * evidence a year later.
 */
export interface ImportRecord {
  /** Which platform the reply was published on, not which file it arrived in. */
  platform: Platform;
  /** Which adapter produced it, which is also the scope of `sourceRecordId`. */
  sourceType: ImportSourceType;

  /** The owner's words, exactly as the export supplied them. Never normalised. */
  exactText: string;

  /** What the reply was attached to, when the export says. */
  targetKind: TargetKind;
  /** Text of the post or comment replied to. Null when the export omits it. */
  targetText: string | null;
  /** Text of the immediate parent in a thread, when it differs from the target. */
  parentText: string | null;
  /** A stable reference to the target, used to keep two identical replies apart. */
  targetRef: string | null;
  /** URL of the thing replied to. Null unless the export carries one. */
  sourceUrl: string | null;

  /** Canonical URL of the reply itself. */
  replyUrl: string | null;
  /**
   * Whether `replyUrl` came from the export as the reply's own canonical address
   * rather than being assembled from parts. Only a verified URL is an identity;
   * a URL an adapter built from an id and a handle is a convenience link.
   */
  replyUrlVerified: boolean;

  /** The platform's own id for the reply, when the export carries one. */
  nativeReplyId: string | null;
  /** A stable record id issued by the export itself. */
  sourceRecordId: string | null;

  /** Null when the source's value is not a recognised provenance. Null means review. */
  provenance: Provenance | null;
  publicationEvidence: PublicationEvidence;

  datePrecision: DatePrecision;
  /** ISO instant, set only when `datePrecision` is 'timestamp'. */
  postedAt: string | null;
  /** YYYY-MM-DD, set only when `datePrecision` is 'date_only'. */
  postedDate: string | null;
  /** IANA zone the source declared. Never defaulted to the app's own zone. */
  sourceTimezone: string | null;

  /** SHA-256 of the file the record came from. Part of the weakest identity tier. */
  sourceFileHash: string;
  /** Where in that file the record sits. Private: it never reaches a report. */
  locator: string;

  warnings: ImportWarningCode[];
}

/**
 * Warning codes are a closed set so that a report can be shown to anyone.
 *
 * Every code below is a category. None of them carries a filename, a locator, an
 * author, a URL or a word the owner wrote.
 */
export const IMPORT_WARNING_CODES = [
  // authorship and record type
  'unknown_provenance',
  'provenance_conflict',
  'identity_conflict',
  'other_author',
  'unverified_author',
  'ambiguous_reply_or_main_post',
  // context and evidence
  'missing_target_context',
  'missing_parent_text',
  'missing_publication_evidence',
  'reply_url_unverified',
  // dates
  'unknown_date',
  'date_only_unknown_timezone',
  'unparsable_date',
  // identity
  'no_stable_identity',
  'weak_identity_only',
  // record shape
  'empty_text',
  'text_too_long',
  'malformed_record',
  'unsupported_schema',
  'unsupported_platform',
  'missing_native_id',
  // archive safety
  'archive_path_traversal',
  'archive_absolute_path',
  'archive_symlink',
  'archive_executable_entry',
  'archive_entry_too_large',
  'archive_too_large',
  'archive_expansion_ratio',
  'archive_too_many_entries',
  'archive_unsupported_entry',
  'archive_js_wrapper_parsed_as_data',
  // batching
  'checkpoint_resumed',
  'batch_restarted',
] as const;

export type ImportWarningCode = (typeof IMPORT_WARNING_CODES)[number];

/**
 * What an adapter says about one source record.
 *
 * A record that cannot be mapped confidently is still reported: `needs_review`
 * and `invalid` both carry a locator and codes, so a bad row is accounted for
 * rather than dropped along with the good rows around it (IMP-04).
 */
export type ParsedRecord =
  | { outcome: 'record'; locator: string; record: ImportRecord }
  | { outcome: 'needs_review'; locator: string; warnings: ImportWarningCode[] }
  | { outcome: 'invalid'; locator: string; warnings: ImportWarningCode[] };

/**
 * How much of a source an adapter has actually been proven against.
 *
 * 'synthetic-tested' is the honest label for a parser written against an invented
 * sample. Promoting an adapter to 'real-export-validated' requires somebody to
 * have opened the genuine export and checked the mapping, and is therefore never
 * something this repository can claim on its own.
 */
export type AdapterValidationStatus =
  | 'synthetic-tested'
  | 'real-export-validated'
  | 'backfilled'
  | 'awaiting-source';

/** What an adapter is handed. The text is already in memory and size-checked. */
export interface AdapterInput {
  /** Raw file contents, decoded as UTF-8. */
  text: string;
  /** SHA-256 of the bytes, before decoding. */
  sourceFileHash: string;
  /**
   * Identifiers the owner has confirmed are theirs, supplied privately at run
   * time. Absent means the adapter cannot prove authorship from the file alone
   * and must say so rather than assume.
   */
  ownerAuthorIds?: readonly string[];
}

/** What an adapter can tell a caller before parsing anything. */
export interface AdapterInspection {
  /** Whether the payload looks like the schema this adapter was written for. */
  matches: boolean;
  /** The signature that was actually observed, for a mismatch report. */
  observedSignature: string;
  /** Coverage facts the file itself states, such as a history start date. */
  notes: string[];
}

export interface ImportAdapter {
  readonly sourceType: ImportSourceType;
  /** Bumped whenever the mapping changes, because it is part of batch identity. */
  readonly adapterVersion: string;
  /** The schema shape this version was written against. */
  readonly schemaSignature: string;
  readonly validationStatus: AdapterValidationStatus;
  /** One sentence on what is and is not confirmed about the schema. */
  readonly schemaNote: string;
  inspect(input: AdapterInput): AdapterInspection;
  /** Yields records lazily so a large file is never fully materialised as objects. */
  parse(input: AdapterInput): Generator<ParsedRecord>;
}

/** A transaction factory. One chunk of an import commits inside one of these. */
export interface ImportDatabase {
  transaction<T>(fn: (q: SqlRunner) => Promise<T>): Promise<T>;
}

export type { SqlRunner };

export interface DispositionOutcome {
  disposition: ImportDisposition;
  warnings: ImportWarningCode[];
  replyId: string | null;
}
