/**
 * What the sign-in form is allowed to say about a failed send.
 *
 * Two requirements pull in opposite directions here. The form must never reveal
 * whether the address typed is the owner's, because that would turn it into a way
 * to test addresses against the account. And it must not call a send that never
 * happened a success, because the owner then sits waiting for an email that is not
 * coming.
 *
 * The line between them is whether the outcome could depend on the address. A
 * refusal that only an unknown address produces stays behind the neutral answer. A
 * network failure, a server error, a rate limit and a misconfigured redirect cannot
 * depend on which address was typed, so they are reported as what they are.
 *
 * Unrecognised refusals fall on the neutral side on purpose. Getting that wrong in
 * the other direction leaks the account's address; getting it wrong in this
 * direction repeats a bug the owner can still notice by not receiving an email.
 */

/** The shape of a Supabase auth error, narrowed to the fields worth reading. */
export interface OtpError {
  status?: number | undefined;
  code?: string | undefined;
}

export type OtpOutcome = 'accepted' | 'rate_limited' | 'unavailable';

const RATE_LIMIT_CODES: ReadonlySet<string> = new Set([
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'over_sms_send_rate_limit',
]);

/**
 * Refusals that are about this deployment rather than about the address: an email
 * provider that is switched off or broken, and a redirect URL the project does not
 * allow. Each one is the same for every address typed into the form.
 */
const CONFIGURATION_CODES: ReadonlySet<string> = new Set([
  'email_provider_disabled',
  'error_sending_email',
  'unexpected_failure',
  'validation_failed',
  'bad_json',
  'bad_jwt',
  'request_timeout',
]);

export function classifyOtpOutcome(error: OtpError | null | undefined): OtpOutcome {
  if (!error) return 'accepted';

  const code = error.code ?? '';
  if (error.status === 429 || RATE_LIMIT_CODES.has(code)) return 'rate_limited';

  // No HTTP refusal reached us at all, so nothing about the address was judged.
  if (error.status === undefined || error.status < 400) return 'unavailable';

  if (error.status >= 500) return 'unavailable';
  if (CONFIGURATION_CODES.has(code)) return 'unavailable';

  return 'accepted';
}
