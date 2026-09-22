/**
 * Global test setup. Public CI runs with synthetic data only: no provider keys,
 * no owner identifiers and no real corpus. Anything that needs a credential must
 * fail loudly rather than silently reach a live service from a test.
 */
process.env.SR_TEST_MODE ??= 'unit';
process.env.APP_TIMEZONE ??= 'Asia/Taipei';
process.env.APP_BASE_URL ??= 'http://localhost:3000';
process.env.RESOURCE_BASE_URL ??= 'https://resources.example.com';
process.env.AI_PROVIDER ??= 'fake';
process.env.EMBEDDING_PROVIDER ??= 'fake';

for (const forbidden of ['AI_API_KEY', 'EMBEDDING_API_KEY', 'SUPABASE_SECRET_KEY']) {
  if (process.env[forbidden]) {
    throw new Error(
      `${forbidden} is set while running tests. Unit tests must never hold a live credential.`,
    );
  }
}
