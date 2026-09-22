import { test, expect } from '@playwright/test';

/**
 * Foundation smoke only (SR-001). The real journeys — source to history to
 * resources to three ideas to edit to copy to record — arrive with the workspace
 * in SR-014 onwards. This file exists so the browser job runs something real
 * rather than reporting a green "0 tests" result.
 */

test('the production build serves the app and a private health endpoint', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(health.headers()['cache-control']).toContain('no-store');
  expect(await health.json()).toEqual({ status: 'ok' });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Social Replies');
});

test('the narrow workspace width does not scroll horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 800 });
  await page.goto('/');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
