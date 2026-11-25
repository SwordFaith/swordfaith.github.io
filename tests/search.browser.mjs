import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { preview } from 'astro';
import { chromium } from 'playwright-core';

let server;
let browser;

before(async () => {
  server = await preview({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await server?.stop();
});

async function visit(t, path, { mockResults = 0, viewport } = {}) {
  const page = await browser.newPage({ viewport });
  t.after(() => page.close());
  page.setDefaultTimeout(5_000);

  if (mockResults > 0) {
    // Hold Pagefind's result data promise until the test releases it.
    await page.route('**/pagefind/pagefind.js', (route) => route.fulfill({
      contentType: 'text/javascript',
      body: `
        globalThis.pendingResults = new Map();
        export function search(query) {
          return {
            results: Array.from({ length: ${mockResults} }, (_, index) => ({ async data() {
              if (query.startsWith('slow')) {
                await new Promise((resolve) => pendingResults.set(query, resolve));
              }
              const title = index === 0 ? query : query + ' (' + (index + 1) + ')';
              return { url: '/blog/', meta: { title }, excerpt: 'Search result' };
            } })),
          };
        }
      `,
    }));
  }

  await page.goto(`http://127.0.0.1:${server.port}${path}`);
  return page;
}

async function assertFocused(locator) {
  assert.equal(await locator.evaluate((element) => element === document.activeElement), true);
}

async function waitForPendingResult(page, query) {
  await page.waitForFunction((value) => globalThis.pendingResults?.has(value), query);
}

async function releaseResult(page, query) {
  await page.evaluate(async (value) => {
    globalThis.pendingResults.get(value)();
    await new Promise(requestAnimationFrame);
  }, query);
}

test('the built Pagefind index returns the published article matching its title', async (t) => {
  const path = '/blog/rlhf-introduction/';
  const page = await visit(t, path);
  const title = await page.getByRole('heading', { level: 1 }).innerText();
  await page.goto(new URL(`/search/?q=${encodeURIComponent(title)}`, page.url()).href);
  await page.locator(`#search-page-results a[href="${path}"]`).waitFor();
});

test('desktop search navigates results and closes one level at a time', async (t) => {
  const page = await visit(t, '/', { mockResults: 2 });
  const toggle = page.locator('[data-aw-toggle-search]');
  const input = page.locator('#header-search-input');
  const results = page.locator('#header-search-results');
  const links = results.getByRole('link');

  await toggle.click();
  await page.waitForFunction(() => document.activeElement?.id === 'header-search-input');
  await input.fill('RLHF');
  await links.nth(1).waitFor();

  await page.keyboard.press('ArrowDown');
  await assertFocused(links.first());
  await page.keyboard.press('ArrowDown');
  await assertFocused(links.nth(1));
  await page.keyboard.press('ArrowUp');
  await assertFocused(links.first());
  await page.keyboard.press('ArrowUp');
  await assertFocused(input);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');

  await results.waitFor({ state: 'hidden' });
  await assertFocused(input);
  assert.equal(await input.inputValue(), 'RLHF');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');

  await page.keyboard.press('Escape');
  await input.waitFor({ state: 'hidden' });
  await assertFocused(toggle);
  assert.equal(await input.inputValue(), 'RLHF');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
});

test('mobile search closes when Tab leaves and Escape returns focus in two steps', async (t) => {
  const page = await visit(t, '/', { mockResults: 1, viewport: { width: 390, height: 844 } });
  const toggle = page.locator('[data-aw-toggle-menu]');
  const input = page.locator('#mobile-search-input');
  const results = page.locator('#mobile-search-results');
  const link = results.getByRole('link');
  const firstNavLink = page.locator('#primary-navigation > div > a').first();

  await toggle.click();
  await input.fill('mobile');
  await link.waitFor();
  await page.keyboard.press('Tab');
  await assertFocused(link);
  await page.keyboard.press('Tab');
  await assertFocused(firstNavLink);
  await results.waitFor({ state: 'hidden' });

  await input.click();
  await link.waitFor();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await results.waitFor({ state: 'hidden' });
  await assertFocused(input);
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');

  await page.keyboard.press('Escape');
  await input.waitFor({ state: 'hidden' });
  await assertFocused(toggle);
});

test('dismissed results cannot reopen the blog dropdown when Pagefind finishes', async (t) => {
  const page = await visit(t, '/blog/', { mockResults: 1 });
  const input = page.locator('#site-search-input');
  const results = page.locator('#site-search-results');
  const renderedLinks = results.locator('a');

  await input.fill('slow escape');
  await waitForPendingResult(page, 'slow escape');
  await page.keyboard.press('Escape');
  await releaseResult(page, 'slow escape');
  assert.equal(await results.isVisible(), false);
  assert.equal(await renderedLinks.count(), 0);
  await assertFocused(input);
  assert.equal(await input.inputValue(), 'slow escape');

  await input.fill('slow outside');
  await waitForPendingResult(page, 'slow outside');
  await page.getByRole('heading', { level: 1 }).click();
  await releaseResult(page, 'slow outside');
  assert.equal(await results.isVisible(), false);
  assert.equal(await renderedLinks.count(), 0);

  await input.fill('slow tab');
  await waitForPendingResult(page, 'slow tab');
  await page.keyboard.press('Tab');
  await releaseResult(page, 'slow tab');
  assert.equal(await results.isVisible(), false);
  assert.equal(await renderedLinks.count(), 0);

  // Advance the browser clock past the debounce without letting it expire before Escape.
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1_000));
  await input.fill('slow debounce');
  await page.keyboard.press('Escape');
  await page.clock.runFor(250);
  assert.equal(await results.isVisible(), false);
  assert.equal(await page.evaluate(() => globalThis.pendingResults.has('slow debounce')), false);
});

test('an old result is discarded as soon as the query changes', async (t) => {
  const page = await visit(t, '/blog/', { mockResults: 1 });
  const input = page.locator('#site-search-input');
  const content = page.locator('#site-search-results [data-search-content]');

  await input.fill('slow old query');
  await waitForPendingResult(page, 'slow old query');
  await content.evaluate((element) => {
    globalThis.renderedTitles = [];
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) globalThis.renderedTitles.push(node.textContent);
      }
    }).observe(element, { childList: true });
  });
  // Resolve in the input event so the old response arrives during the next query's debounce.
  await input.evaluate((element) => element.addEventListener('input', () => {
    globalThis.pendingResults.get('slow old query')();
  }, { once: true }));
  await input.fill('new query');
  await content.getByRole('link', { name: /new query/ }).waitFor();

  assert.deepEqual(await page.evaluate(() => globalThis.renderedTitles), ['new querySearch result']);
});

test('inline results retain their query and stay visible when focus moves', async (t) => {
  const page = await visit(t, '/search/?q=slow+inline', { mockResults: 1 });
  const input = page.locator('#search-page-input');
  const results = page.locator('#search-page-results');
  const link = results.getByRole('link');

  assert.equal(await input.inputValue(), 'slow inline');
  await waitForPendingResult(page, 'slow inline');
  await page.getByRole('heading', { level: 1 }).click();
  await releaseResult(page, 'slow inline');
  await link.waitFor();

  await input.focus();
  await page.keyboard.press('ArrowDown');
  await assertFocused(link);
  await page.keyboard.press('Escape');
  await assertFocused(input);
  assert.equal(await link.isVisible(), true);

  await input.fill('updated inline');
  await results.getByRole('link', { name: /updated inline/ }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('q'), 'updated inline');
});
