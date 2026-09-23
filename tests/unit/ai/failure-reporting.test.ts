import { describe, it, expect } from 'vitest';
import { errorCodeForOutcome, generateIdeas } from '@/lib/ai/generator';
import { classifyOtpOutcome } from '@/components/auth/otp-outcome';
import {
  errorCodeSchema,
  isRetryable,
  statusForCode,
  GENERIC_MESSAGE,
} from '@/lib/contracts/errors';
import type { GenerationAttempt, GenerationContext, ReplyGenerator } from '@/lib/ai/types';

/**
 * Who is blamed when something does not reach the owner.
 *
 * A failure the owner cannot see the cause of is one they cannot act on, and a
 * failure attributed to the wrong system sends whoever reads it looking at the
 * wrong thing. Both cases here were reported as the opposite of what happened: a
 * decision this app made on purpose went out as a provider fault, and a send that
 * never happened went out as a success.
 */

function context(overrides: Partial<GenerationContext> = {}): GenerationContext {
  return {
    platform: 'linkedin',
    sourceText: 'Does anybody actually read cover letters anymore?',
    parentText: null,
    writing: [],
    facts: [],
    resources: [],
    recentReplies: [],
    seedReplyIds: [],
    ...overrides,
  };
}

/** Always returns readable ideas that the grounding guard always rejects. */
function unguardableGenerator(): ReplyGenerator {
  const ideas = [0, 1, 2].map((position) => ({
    position,
    angle_label: `Angle ${position}`,
    reply_text:
      position === 0
        ? 'Worth reading: https://example.com/guide before you apply anywhere else.'
        : `A different point entirely, number ${position}, about how hiring teams read applications.`,
    english_meaning: null,
    resource_id: null,
    cta_text: null,
    uses_fact_ids: [],
    based_on_reply_ids: [],
  }));

  return {
    name: 'fake',
    model: 'fake',
    complete(): Promise<GenerationAttempt> {
      return Promise.resolve({
        rawText: JSON.stringify({ ideas }),
        usage: { inputTokens: 10, outputTokens: 10, durationMs: 1 },
        model: 'fake',
        provider: 'fake',
      });
    },
  };
}

describe('ideas the guards withheld are not reported as a provider fault', () => {
  it('gives the withheld outcome its own code', () => {
    expect(errorCodeForOutcome('withheld_unsafe')).toBe('withheld_unsafe');
  });

  it('keeps the provider failures pointing at the provider', () => {
    expect(errorCodeForOutcome('provider_invalid_response')).toBe('provider_invalid_response');
    expect(errorCodeForOutcome('provider_timeout')).toBe('provider_timeout');
    expect(errorCodeForOutcome('rate_limited')).toBe('rate_limited');
    expect(errorCodeForOutcome('provider_unavailable')).toBe('provider_unavailable');
    expect(errorCodeForOutcome(undefined)).toBe('provider_unavailable');
  });

  it('is a code the client is allowed to receive', () => {
    expect(errorCodeSchema.safeParse('withheld_unsafe').success).toBe(true);
  });

  it('answers with a status that does not claim anything upstream broke', () => {
    expect(statusForCode('withheld_unsafe')).toBe(422);
    expect(statusForCode('withheld_unsafe')).toBeLessThan(500);
    expect(isRetryable('withheld_unsafe')).toBe(false);
  });

  it('says what happened without naming the provider', () => {
    expect(GENERIC_MESSAGE.withheld_unsafe).toMatch(/checks/i);
    expect(GENERIC_MESSAGE.withheld_unsafe).not.toMatch(/provider/i);
  });

  it('carries a real withheld run through to that code', async () => {
    const outcome = await generateIdeas(context(), { generator: unguardableGenerator() });

    expect(outcome.status).toBe('withheld');
    expect(outcome.failure?.code).toBe('withheld_unsafe');
    expect(errorCodeForOutcome(outcome.failure?.code)).toBe('withheld_unsafe');
  });
});

describe('the sign-in form tells an unsent link apart from a sent one', () => {
  it('reports a success as a success', () => {
    expect(classifyOtpOutcome(null)).toBe('accepted');
  });

  it('keeps a refusal about the address indistinguishable from a send', () => {
    // Every one of these is what an address that is not the owner's produces.
    expect(classifyOtpOutcome({ status: 400, code: 'otp_disabled' })).toBe('accepted');
    expect(classifyOtpOutcome({ status: 400, code: 'user_not_found' })).toBe('accepted');
    expect(classifyOtpOutcome({ status: 422, code: 'signup_disabled' })).toBe('accepted');
    expect(classifyOtpOutcome({ status: 400, code: 'email_address_not_authorized' })).toBe('accepted');
    expect(classifyOtpOutcome({ status: 403, code: 'user_banned' })).toBe('accepted');
  });

  it('says so when the request could not be sent at all', () => {
    expect(classifyOtpOutcome({ status: 429, code: 'over_email_send_rate_limit' })).toBe('rate_limited');
    expect(classifyOtpOutcome({ status: 500, code: 'unexpected_failure' })).toBe('unavailable');
    expect(classifyOtpOutcome({ status: 500, code: 'error_sending_email' })).toBe('unavailable');
    expect(classifyOtpOutcome({ status: 400, code: 'validation_failed' })).toBe('unavailable');
    expect(classifyOtpOutcome({ status: 0 })).toBe('unavailable');
    expect(classifyOtpOutcome({})).toBe('unavailable');
  });

  it('never answers a transport failure with the success line', () => {
    const transportFailures = [
      { status: 429 },
      { status: 500 },
      { status: 502 },
      { status: 503 },
      { status: 0 },
      {},
    ];
    for (const failure of transportFailures) {
      expect(classifyOtpOutcome(failure)).not.toBe('accepted');
    }
  });
});
