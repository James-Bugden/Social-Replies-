import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  AppError,
  GENERIC_MESSAGE,
  codeForSqlState,
  isRetryable,
  statusForCode,
  type ErrorCode,
  type ErrorEnvelope,
} from '@/lib/contracts/errors';
import { REQUEST_LIMITS } from '@/lib/contracts/limits';

/**
 * The shared request and response plumbing for every API route (C07, C10).
 *
 * Three things every private response must do, and therefore three things no
 * route should have to remember:
 *   * never be stored by any cache;
 *   * never carry a stack trace, a SQL message or a provider body;
 *   * never accept a cross-origin mutation.
 */

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  Vary: 'Cookie',
} as const;

export function jsonResponse<T>(body: T, init?: { status?: number; headers?: HeadersInit }): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { ...PRIVATE_HEADERS, ...(init?.headers ?? {}) },
  });
}

export function errorResponse(
  code: ErrorCode,
  message?: string,
  options?: { requestId?: string; retryAfterSeconds?: number },
): NextResponse {
  const envelope: ErrorEnvelope = {
    code,
    message: message ?? GENERIC_MESSAGE[code],
    retryable: isRetryable(code),
    request_id: options?.requestId ?? randomUUID(),
    ...(options?.retryAfterSeconds ? { retry_after_seconds: options.retryAfterSeconds } : {}),
  };

  const headers: Record<string, string> = {};
  if (options?.retryAfterSeconds) headers['Retry-After'] = String(options.retryAfterSeconds);

  return jsonResponse(envelope, { status: statusForCode(code), headers });
}

/**
 * Same-origin enforcement for mutations.
 *
 * The app is a single-user tool served from one origin, so an Origin header that
 * is absent or different is never legitimate for a state-changing request. This
 * runs before the body is even read.
 */
export function assertSameOrigin(request: NextRequest): void {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const origin = request.headers.get('origin');
  if (!origin) {
    throw new AppError('forbidden', 'That is not available.');
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError('forbidden', 'That is not available.');
  }

  const expected = request.headers.get('host') ?? new URL(request.url).host;
  if (originHost !== expected) {
    throw new AppError('forbidden', 'That is not available.');
  }
}

/**
 * Reads and validates a JSON body.
 *
 * Oversize input is rejected with 413 rather than truncated, because a silently
 * shortened reply is worse than a refused one: the owner would copy text the app
 * had already damaged (C07).
 */
export async function readJson<S extends z.ZodTypeAny>(
  request: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > REQUEST_LIMITS.bodyBytes) {
    throw new AppError('payload_too_large', 'That is too long to save.');
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > REQUEST_LIMITS.bodyBytes) {
    throw new AppError('payload_too_large', 'That is too long to save.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new AppError('validation_failed', 'That request was not valid.');
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    // The first issue's message is written for a person; the path is not echoed
    // back with its value, so no submitted text leaves in an error body.
    const issue = result.error.issues[0];
    throw new AppError('validation_failed', issue?.message ?? 'That request was not valid.');
  }
  return result.data;
}

interface PostgresErrorLike {
  code?: string;
  message?: string;
}

/**
 * Turns anything thrown inside a route into a safe envelope.
 *
 * A database error is mapped by SQLSTATE and its message is discarded: Postgres
 * messages name constraints, columns and sometimes values, and this app's rows
 * are the owner's private writing.
 */
export function toErrorResponse(error: unknown, requestId = randomUUID()): NextResponse {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, {
      requestId,
      ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    });
  }

  if (error instanceof z.ZodError) {
    return errorResponse('validation_failed', error.issues[0]?.message, { requestId });
  }

  const candidate = error as PostgresErrorLike;
  if (typeof candidate?.code === 'string') {
    const code = codeForSqlState(candidate.code);
    return errorResponse(code, undefined, { requestId });
  }

  return errorResponse('internal_error', undefined, { requestId });
}

/**
 * Wraps a route handler with same-origin enforcement and safe error mapping.
 * A route that uses this cannot accidentally return a raw exception.
 */
export function route(
  handler: (request: NextRequest, context: { requestId: string }) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = randomUUID();
    try {
      assertSameOrigin(request);
      return await handler(request, { requestId });
    } catch (error) {
      return toErrorResponse(error, requestId);
    }
  };
}
