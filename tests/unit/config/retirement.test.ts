import { describe, expect, it } from 'vitest';

import nextConfig, { CANONICAL_REPLIES_URL } from '../../../next.config';

describe('standalone retirement redirect', () => {
  it('redirects every route temporarily to the combined Replies workspace', async () => {
    const redirects = await nextConfig.redirects?.();

    expect(CANONICAL_REPLIES_URL).toBe(
      'https://content-studio-blond-rho.vercel.app/replies',
    );
    expect(redirects).toEqual([
      {
        source: '/:path*',
        destination: CANONICAL_REPLIES_URL,
        permanent: false,
      },
    ]);
  });
});
