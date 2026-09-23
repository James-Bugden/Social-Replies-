import { describe, it, expect } from 'vitest';
import { isTestMode, TEST_OWNER_ID } from '@/lib/server/test-mode';
import { assertSameOrigin } from '@/lib/server/http';
import { AppError } from '@/lib/contracts/errors';

/**
 * The two switches nothing was testing.
 *
 * An adversarial review mutated both of these to no-ops and all 436 tests stayed
 * green. One of them decides whether the app authenticates at all; the other is
 * the only thing standing between a mutation route and any page on the internet.
 * Neither had a single assertion against it.
 */

describe('the switch that disables authentication', () => {
  it('is on only for the exact value the harness sets', () => {
    expect(isTestMode({ SR_TEST_MODE: 'e2e' })).toBe(true);
  });

  it.each([
    ['unset', {}],
    ['empty', { SR_TEST_MODE: '' }],
    ['production', { SR_TEST_MODE: 'production' }],
    ['a truthy word', { SR_TEST_MODE: 'true' }],
    ['the digit one', { SR_TEST_MODE: '1' }],
    ['different case', { SR_TEST_MODE: 'E2E' }],
    ['padded', { SR_TEST_MODE: ' e2e' }],
    ['a longer string containing it', { SR_TEST_MODE: 'not-e2e' }],
    ['a suffix', { SR_TEST_MODE: 'e2e-ish' }],
  ])('is off when %s', (_label, env) => {
    // A truthy check rather than an exact one would turn several of these on,
    // which means shipping an app that skips the owner check and serves an
    // in-memory store. That is the whole reason this comparison is `===`.
    expect(isTestMode(env)).toBe(false);
  });

  it('uses an owner id that is obviously not a real one', () => {
    expect(TEST_OWNER_ID).toBe('00000000-0000-4000-8000-000000000000');
  });
});

describe('same-origin enforcement on mutations', () => {
  const request = (
    method: string,
    headers: Record<string, string>,
    url = 'https://app.example.com/api/x',
  ) =>
    ({
      method,
      url,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    }) as unknown as Parameters<typeof assertSameOrigin>[0];

  it('allows a mutation from the app itself', () => {
    expect(() =>
      assertSameOrigin(
        request('POST', { origin: 'https://app.example.com', host: 'app.example.com' }),
      ),
    ).not.toThrow();
  });

  it.each([
    ['a different site', 'https://evil.example.com'],
    ['a lookalike subdomain', 'https://app.example.com.evil.example'],
    ['a subdomain of the app', 'https://other.app.example.com'],
    ['the same host over plain http', 'http://app.example.com'],
    ['a null origin, as a sandboxed frame sends', 'null'],
    ['nonsense', 'not-a-url'],
  ])('refuses a mutation from %s', (_label, origin) => {
    const error = (() => {
      try {
        assertSameOrigin(request('POST', { origin, host: 'app.example.com' }));
        return null;
      } catch (thrown) {
        return thrown;
      }
    })();

    expect(error).toBeInstanceOf(AppError);
    // The message never says why, because telling an attacker which check failed
    // is free information.
    expect((error as AppError).code).toBe('forbidden');
  });

  it('refuses a mutation with no Origin at all', () => {
    // A browser always sends one on a cross-site request. Its absence means the
    // caller is not a browser, and this app has no non-browser callers.
    expect(() => assertSameOrigin(request('POST', { host: 'app.example.com' }))).toThrow(AppError);
  });

  it.each(['PATCH', 'PUT', 'DELETE'])('applies to %s as well as POST', (method) => {
    expect(() =>
      assertSameOrigin(request(method, { origin: 'https://evil.example.com', host: 'app.example.com' })),
    ).toThrow(AppError);
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('does not apply to %s, which changes nothing', (method) => {
    expect(() => assertSameOrigin(request(method, { host: 'app.example.com' }))).not.toThrow();
  });

  it('compares the whole origin, not just the host', () => {
    // A host comparison treats http://app and https://app as the same place.
    // They are not: anyone who can answer for that host over plain http is then
    // same-origin with the real app.
    expect(() =>
      assertSameOrigin(
        request('POST', { origin: 'http://app.example.com', host: 'app.example.com' }),
      ),
    ).toThrow(AppError);
  });

  it("trusts the proxy's protocol header, since TLS ends there", () => {
    expect(() =>
      assertSameOrigin(
        request(
          'POST',
          {
            origin: 'https://app.example.com',
            host: 'app.example.com',
            'x-forwarded-proto': 'https',
          },
          'http://app.example.com/api/x',
        ),
      ),
    ).not.toThrow();
  });

  it('falls back to the request URL when there is no Host header', () => {
    expect(() =>
      assertSameOrigin(request('POST', { origin: 'https://app.example.com' })),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(request('POST', { origin: 'https://evil.example.com' })),
    ).toThrow(AppError);
  });
});
