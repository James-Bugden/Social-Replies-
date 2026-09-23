/**
 * The one switch that selects the browser-journey doubles.
 *
 * It lives in its own module so that every place that honours it imports the same
 * predicate, and so that a search for `SR_TEST_MODE` finds one definition rather
 * than four. The value is compared exactly: a truthy check would turn
 * `SR_TEST_MODE=production` into test mode.
 */
export function isTestMode(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.SR_TEST_MODE === 'e2e';
}

/** A fixed, obviously synthetic id. It is never written to a real database. */
export const TEST_OWNER_ID = '00000000-0000-4000-8000-000000000000';
