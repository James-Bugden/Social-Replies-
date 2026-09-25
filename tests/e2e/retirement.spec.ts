import { expect, test } from '@playwright/test';

const canonicalRepliesUrl =
  'https://content-studio-blond-rho.vercel.app/replies';

test('redirects the retired UI to the combined Content Studio', async ({ request }) => {
  const response = await request.get('/', { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(canonicalRepliesUrl);
});

test('redirects legacy deep links and APIs without deleting data', async ({ request }) => {
  for (const path of ['/library', '/api/progress', '/auth/callback']) {
    const response = await request.get(path, { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(canonicalRepliesUrl);
  }
});
