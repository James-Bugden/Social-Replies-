import { z } from 'zod';

/**
 * C07's unified error envelope.
 *
 * The envelope carries a code, a message safe to show a person, whether retrying
 * could help, and a request id. It never carries a stack trace, a provider
 * response body, a SQL string or any part of the owner's writing.
 */

export const errorCodeSchema = z.enum([
  'validation_failed',
  'unauthenticated',
  'forbidden',
  'not_found',
  'version_conflict',
  'idempotency_conflict',
  'payload_too_large',
  'rate_limited',
  'provider_invalid_response',
  'provider_timeout',
  'provider_unavailable',
  'not_configured',
  'internal_error',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorEnvelopeSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  request_id: z.string(),
  retry_after_seconds: z.number().int().positive().optional(),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

const STATUS: Readonly<Record<ErrorCode, number>> = Object.freeze({
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  version_conflict: 409,
  idempotency_conflict: 409,
  payload_too_large: 413,
  rate_limited: 429,
  provider_invalid_response: 502,
  provider_timeout: 504,
  provider_unavailable: 503,
  not_configured: 503,
  internal_error: 500,
});

const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'rate_limited',
  'provider_timeout',
  'provider_unavailable',
  'internal_error',
]);

export function statusForCode(code: ErrorCode): number {
  return STATUS[code];
}

export function isRetryable(code: ErrorCode): boolean {
  return RETRYABLE.has(code);
}

/**
 * An error that carries a code the API layer can map without parsing text.
 *
 * `message` is written for the owner, not for a log grep: it appears in the UI.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: ErrorCode, message: string, options?: { retryAfterSeconds?: number; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    if (options?.retryAfterSeconds !== undefined) {
      this.retryAfterSeconds = options.retryAfterSeconds;
    }
  }
}

/**
 * Maps the user-defined SQLSTATEs raised by the recording functions, plus the
 * standard ones worth distinguishing, onto envelope codes.
 *
 * Anything unrecognised becomes `internal_error`: a database message is never
 * forwarded to the client, because it can name another record's existence.
 */
export function codeForSqlState(sqlState: string | undefined): ErrorCode {
  switch (sqlState) {
    case 'SR401':
      return 'unauthenticated';
    case 'SR404':
      return 'not_found';
    case 'SR409':
      return 'version_conflict';
    case '23505': // unique_violation
      return 'version_conflict';
    case '23503': // foreign_key_violation
    case '23514': // check_violation
      return 'validation_failed';
    case '42501': // insufficient_privilege, which for this app means RLS said no
      return 'forbidden';
    default:
      return 'internal_error';
  }
}

/** Generic messages. They never confirm or deny that some other record exists. */
export const GENERIC_MESSAGE: Readonly<Record<ErrorCode, string>> = Object.freeze({
  validation_failed: 'That request was not valid.',
  unauthenticated: 'Sign in to continue.',
  forbidden: 'That is not available.',
  not_found: 'That is not available.',
  version_conflict: 'This changed somewhere else. Check the latest version before saving.',
  idempotency_conflict: 'This save was already handled with different text.',
  payload_too_large: 'That is too long to save.',
  rate_limited: 'Reply ideas are temporarily paused. Your draft is unchanged.',
  provider_invalid_response: "Couldn't create reply ideas. Your draft is unchanged.",
  provider_timeout: "Couldn't create reply ideas. Your draft is unchanged.",
  provider_unavailable: "Couldn't create reply ideas. Your draft is unchanged.",
  not_configured: 'Reply ideas are not configured yet. Your draft is unchanged.',
  internal_error: 'Something went wrong. Your text is still here.',
});
