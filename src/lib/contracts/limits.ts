/**
 * Every bound the app enforces, in one place, with the reason it exists.
 *
 * These are defensive application limits and tuneable engineering defaults from
 * C05, C07 and C08. None of them is a claim about a social platform's own limit:
 * X in particular is not limited to 280 characters here.
 */

/** C07 request bounds. Oversize input is rejected, never silently truncated. */
export const REQUEST_LIMITS = {
  bodyBytes: 128 * 1024,
  sourceTextCodePoints: 16_000,
  parentTextCodePoints: 8_000,
  keywordCodePoints: 200,
  finalReplyCodePoints: 16_000,
  searchPageSize: 25,
} as const;

/** C05 retrieval defaults. Tuneable with recorded evidence, not by guesswork. */
export const RETRIEVAL = {
  /** Independent candidate lists before fusion. */
  lexicalCandidates: 40,
  semanticCandidates: 40,
  /** Reciprocal rank fusion constant. */
  rrfK: 60,
  /** Shown immediately; the rest is behind a cursor. */
  initialResults: 3,
  /** Hard ceiling on history passed into a generation request. */
  maxContextSnippets: 7,
  /** A reply must clear this to be called a match at all. */
  minLexicalScore: 0.08,
} as const;

/** C06 resource qualification. */
export const RESOURCES = {
  maxQualified: 3,
  /** One attached resource per reply is the v1 default. */
  defaultAttachedPerReply: 1,
} as const;

/**
 * C08 generation budgets. Verified against the selected provider before deployment
 * and adjusted with recorded evidence rather than by silently truncating context.
 */
export const GENERATION = {
  activeRunsPerSession: 1,
  requestsPerOwnerPerHour: 60,
  inputTokenBudget: 6_000,
  outputTokenBudget: 1_800,
  attemptDeadlineMs: 25_000,
  totalRequestBudgetMs: 40_000,
  /** One bounded repair attempt, shared with the guard layer. Not one each. */
  maxRepairAttempts: 1,
  ideasPerRun: 3,
} as const;

/** C05 embedding outbox. */
export const EMBEDDING = {
  dimensions: 1536,
  maxAttempts: 5,
  leaseSeconds: 120,
  /** Exponential backoff base, in seconds. */
  backoffBaseSeconds: 15,
} as const;

export const APP = {
  defaultTimezone: 'Asia/Taipei',
  defaultDailyTarget: 10,
} as const;

/** Backoff for embedding retries: 15s, 30s, 60s, 120s, 240s. */
export function embeddingBackoffSeconds(attempt: number): number {
  return EMBEDDING.backoffBaseSeconds * 2 ** Math.max(0, attempt - 1);
}
