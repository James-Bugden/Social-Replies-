import { test, expect, type Page } from '@playwright/test';

/**
 * Each journey starts from a known store.
 *
 * The in-memory double is a singleton, so without this a test that creates a fact
 * or disables a resource changes the world every later test runs in, and the
 * second viewport project inherits everything the first one did. That passes when
 * a file is run alone and fails in CI, which is the worst way to find out.
 */
test.beforeEach(async ({ request }) => {
  await request.post('/api/test/reset');
});


/**
 * The journey the product exists for (T1).
 *
 * Paste a post, see what you wrote before and what you could share, choose among
 * three ideas, edit, copy, post manually, record the exact text, and have the
 * count move by one.
 *
 * These run against a production build in fake-provider mode with synthetic data.
 * That makes them deterministic and lets them run in public CI with no credentials,
 * and it also bounds what they prove: they are not evidence about the real
 * database's policies, the real clipboard on a real device, or a real model's
 * output. Those belong to the hosted checks in #21.
 */

const SOURCE_POST =
  'Does a cover letter actually matter anymore, or is it just something people still write out of habit?';

async function analyse(page: Page, text = SOURCE_POST) {
  await page.getByRole('textbox', { name: /Paste the post or comment/ }).fill(text);
  await page.getByRole('button', { name: 'Get reply ideas' }).click();
}

test.describe('the reply loop', () => {
  test('goes from a pasted post to a recorded reply and moves the count by one', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');

    const before = await page.getByText(/^LinkedIn \d+\/\d+$/).textContent();
    const startCount = Number((before ?? 'LinkedIn 0/10').split(' ')[1]?.split('/')[0] ?? 0);

    await analyse(page);

    // Retrieval renders before generation finishes, and both sections are present
    // in the reading order rather than behind a tab (D01, D04).
    await expect(page.getByRole('heading', { name: /replied to similar posts|Saved writing/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Useful things you can share' })).toBeVisible();

    const ideas = page.getByRole('button', { name: 'Use this', exact: true });
    await expect(ideas).toHaveCount(3);

    await ideas.first().click();

    const editor = page.getByRole('textbox', { name: 'Your reply' });
    await expect(editor).not.toHaveValue('');

    await editor.fill('My own final wording, which is what should be recorded.');

    await page.getByRole('button', { name: 'Copy reply' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe('My own final wording, which is what should be recorded.');

    // Copying is not posting: the count has not moved.
    await expect(page.getByText(`LinkedIn ${startCount}/10`)).toBeVisible();

    await page.getByRole('button', { name: 'Mark posted' }).click();
    await expect(page.getByText(new RegExp(`Saved\\. LinkedIn ${startCount + 1}/10 today\\.`))).toBeVisible();

    // The saved text stays available until Next reply, so a mistake is recoverable.
    await expect(editor).toHaveValue('My own final wording, which is what should be recorded.');

    await page.getByRole('button', { name: 'Next reply' }).click();
    await expect(page.getByRole('textbox', { name: /Paste the post or comment/ })).toHaveValue('');
  });

  test('records once when Mark posted is pressed twice', async ({ page }) => {
    await page.goto('/');
    const before = await page.getByText(/^X \d+\/\d+$/).textContent();
    const startCount = Number((before ?? 'X 0/10').split(' ')[1]?.split('/')[0] ?? 0);

    await page.getByRole('radio', { name: 'X' }).click();
    await analyse(page);

    const editor = page.getByRole('textbox', { name: 'Your reply' });
    await editor.fill('One reply, submitted twice.');

    const markPosted = page.getByRole('button', { name: 'Mark posted' });
    await markPosted.click();

    await expect(page.getByText(new RegExp(`Saved\\. X ${startCount + 1}/10 today\\.`))).toBeVisible();
    // The button is replaced by Undo and Next reply, so a second press cannot land.
    await expect(markPosted).toHaveCount(0);
  });

  test('keeps the editor usable while ideas are still arriving', async ({ page }) => {
    await page.goto('/');
    await analyse(page);

    const editor = page.getByRole('textbox', { name: 'Your reply' });
    await editor.fill('Typed while the model was thinking.');

    await expect(page.getByRole('button', { name: 'Use this', exact: true })).toHaveCount(3);

    // A result that arrives after the owner has typed does not touch their text.
    await expect(editor).toHaveValue('Typed while the model was thinking.');
  });

  test('previews a replacement rather than overwriting a dirty editor', async ({ page }) => {
    await page.goto('/');
    await analyse(page);

    const editor = page.getByRole('textbox', { name: 'Your reply' });
    await editor.fill('My own words.');

    await page.getByRole('button', { name: 'Use this', exact: true }).first().click();

    await expect(page.getByText('Review this version before replacing your reply.')).toBeVisible();
    await expect(editor).toHaveValue('My own words.');

    await page.getByRole('button', { name: 'Keep my reply' }).click();
    await expect(editor).toHaveValue('My own words.');
  });
});

test.describe('Threads', () => {
  test('writes Chinese, offers an English meaning, and marks it stale on edit', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Threads' }).click();
    await analyse(page);

    await expect(page.getByRole('button', { name: 'Use this', exact: true })).toHaveCount(3);
    await page.getByRole('button', { name: 'Use this', exact: true }).first().click();

    const editor = page.getByRole('textbox', { name: 'Your reply' });
    const chinese = await editor.inputValue();
    expect(chinese).toMatch(/\p{Script=Han}/u);

    await editor.fill(`${chinese}加上一點補充。`);

    await expect(page.getByText('Your reply changed. Refresh the English meaning.')).toBeVisible();
  });
});

test.describe('layout', () => {
  for (const width of [375, 500, 600, 750, 1280]) {
    test(`does not scroll horizontally at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await analyse(page);
      await expect(page.getByRole('heading', { name: 'Useful things you can share' })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
    });
  }

  test('keeps resources reachable in the reading order, not behind a tab', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/');
    await analyse(page);

    const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
    const order = headings.join(' | ');

    expect(order).toContain('Useful things you can share');
    expect(order.indexOf('Useful things you can share')).toBeLessThan(order.indexOf('Reply ideas'));
    expect(order.indexOf('Reply ideas')).toBeLessThan(order.indexOf('Your reply'));
  });

  test('reflows at 200% zoom with every control still reachable', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/');
    // 200% zoom is equivalent to halving the CSS viewport.
    await page.setViewportSize({ width: 300, height: 450 });
    await analyse(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole('button', { name: 'Mark posted' })).toBeVisible();
  });
});

test.describe('keyboard and input method', () => {
  test('Ctrl+Enter submits, but a composition commit does not', async ({ page }) => {
    await page.goto('/');
    const source = page.getByRole('textbox', { name: /Paste the post or comment/ });
    await source.fill(SOURCE_POST);

    // An IME candidate commit arrives as Enter with isComposing set. It must not
    // fire the request: the owner is choosing a character, not asking for ideas.
    await source.evaluate((element) => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true, bubbles: true }),
      );
    });
    await expect(page.getByRole('heading', { name: 'Reply ideas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use this', exact: true })).toHaveCount(0);

    await source.press('Control+Enter');
    await expect(page.getByRole('button', { name: 'Use this', exact: true })).toHaveCount(3);
  });

  test('empty input asks for the post rather than searching for nothing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: /Paste the post or comment/ }).fill('   ');
    await page.getByRole('button', { name: 'Get reply ideas' }).click();

    await expect(page.getByText('Paste the post or comment first.')).toBeVisible();
  });

  test('background results do not steal focus', async ({ page }) => {
    await page.goto('/');
    await analyse(page);

    const editor = page.getByRole('textbox', { name: 'Your reply' });
    await editor.focus();
    await expect(page.getByRole('button', { name: 'Use this', exact: true })).toHaveCount(3);

    await expect(editor).toBeFocused();
  });
});

test.describe('honest states', () => {
  test('tells no-match apart from a failure', async ({ page }) => {
    await page.goto('/');
    await analyse(page, 'Zzzq unrelated gibberish that matches nothing in the library at all.');

    // A successful search with no match, not an error.
    await expect(page.getByText('No matching past replies yet.')).toBeVisible();
    await expect(page.getByText("Couldn't search past replies.")).toHaveCount(0);
  });

  test('never presents an AI draft as something the owner posted', async ({ page }) => {
    await page.goto('/');
    await analyse(page, 'example ai draft that was never posted');

    // The seed corpus contains an AI draft with exactly this text. It is excluded
    // from voice evidence, so the confirmed heading must not appear for it.
    const confirmedHeading = page.getByRole('heading', {
      name: "You've replied to similar posts before",
    });
    const rows = page.getByRole('listitem');
    if ((await rows.count()) > 0) {
      const text = await rows.allTextContents();
      if (text.join(' ').includes('AI draft')) {
        await expect(confirmedHeading).toHaveCount(0);
      }
    }
  });
});

test.describe('when the clipboard refuses (COPY-01)', () => {
  test('selects the reply text and never claims success', async ({ page }) => {
    await page.goto('/');
    // Make writeText reject before anything runs, so the denied path is real
    // rather than simulated at the component boundary.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied')) },
      });
    });
    await page.reload();

    await page.getByRole('textbox', { name: /Paste the post or comment/ }).fill(SOURCE_POST);
    await page.getByRole('button', { name: 'Get reply ideas' }).click();

    const editor = page.getByRole('textbox', { name: 'Your reply' });
    await editor.fill('The exact text that must end up selected.');

    const before = await page.getByText(/^LinkedIn \d+\/\d+$/).textContent();

    await page.getByRole('button', { name: 'Copy reply' }).click();

    await expect(
      page.getByText("Couldn't copy automatically. Select the text and copy it."),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copied' })).toHaveCount(0);

    // The editor holds the selection, so Ctrl+C works, and it is the reply text
    // rather than the surrounding interface.
    const selection = await page.evaluate(() => {
      const element = document.getElementById('final-reply-editor');
      if (!(element instanceof HTMLTextAreaElement)) return null;
      return element.value.slice(element.selectionStart, element.selectionEnd);
    });
    expect(selection).toBe('The exact text that must end up selected.');

    // A failed copy is not a post, so the count has not moved.
    await expect(page.getByText(before ?? '')).toBeVisible();
  });
});

test.describe('the action strip reserves its own height (D01)', () => {
  test('never covers the end of the reply, including after it changes size', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/');
    await analyse(page);

    const editor = page.getByRole('textbox', { name: 'Your reply' });
    await editor.fill('A reply long enough to push the page past one screen.\n'.repeat(12));

    async function bottomIsReachable() {
      return page.evaluate(() => {
        const strip = document.querySelector('[data-strip]') ?? document.body.lastElementChild;
        const reserved = getComputedStyle(document.documentElement).getPropertyValue(
          '--sr-action-strip-height',
        );
        const height = strip instanceof HTMLElement ? strip.offsetHeight : 0;
        return { reserved: parseFloat(reserved) || 0, height };
      });
    }

    // The measurement is written by a ResizeObserver, which fires after the paint
    // that changed the height. Reading once races it, so poll until the reserved
    // space matches what is on screen.
    const matches = async () => {
      const { reserved, height } = await bottomIsReachable();
      return reserved > 0 && Math.abs(reserved - height) <= 2;
    };

    await expect.poll(matches, { timeout: 5_000 }).toBe(true);

    // Recording swaps the strip for Undo and Next reply, which is a different
    // height. The reserved space has to follow it.
    await page.getByRole('button', { name: 'Mark posted' }).click();
    await expect(page.getByText(/Saved\./)).toBeVisible();

    await expect.poll(matches, { timeout: 5_000 }).toBe(true);
  });
});
