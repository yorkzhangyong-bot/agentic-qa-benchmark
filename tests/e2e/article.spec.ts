import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';
import { disposableAccount, signIn, signUp } from './fixtures/auth';
import { waitForApi } from './fixtures/network';
import {
  ALICE_AVATAR,
  SEED_ARTICLES,
  SEED_ARTICLE_TITLES,
  SEED_PASSWORD,
  SEED_USERS,
  slugPattern,
  uniqueRunId,
} from './fixtures/seed';

const EDIT_ARTICLE_PATH = /^\/api\/articles\/[^/]+$/;

test.describe('Article page', () => {
  test('26. article page header and body [FR-042]', async ({ page }) => {
    const article = new ArticlePage(page);
    await article.goto(SEED_ARTICLES.flaky);

    await expect(article.title).toHaveText(SEED_ARTICLE_TITLES.flaky);
    await expect(page.getByRole('link', { name: 'alice', exact: true }).first()).toHaveAttribute(
      'href',
      '/profile/alice',
    );
    const avatarLink = page.locator('.article-meta').first().locator('a:has(img)');
    await expect(avatarLink).toHaveAttribute('href', '/profile/alice');
    await expect(page.locator('.article-meta').first().locator('img')).toHaveAttribute('src', ALICE_AVATAR);
    await expect(article.firstDate).toHaveText('January 9, 2026');

    await expect(article.tags).toHaveCount(3);
    const tags = (await article.tags.allTextContents()).map((tag) => tag.trim()).sort();
    expect(tags).toEqual(['automation', 'ci', 'testing']);

    await expect(
      page.getByText(
        'Most flaky tests share a handful of causes: timing, shared state, test order and the clock.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Quarantine them quickly, fix the root cause, and never just add a retry and move on.',
        { exact: true },
      ),
    ).toBeVisible();
  });

  test('27. renders Markdown content [FR-043]', async ({ page }) => {
    const article = new ArticlePage(page);
    await article.goto(SEED_ARTICLES.markdown);

    for (const heading of ['Headings', 'Lists', 'Code', 'Quotes and links']) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.locator('.article-content ul li')).toHaveText([
      'Unordered items start with a dash',
      'like this one',
    ]);
    await expect(page.locator('.article-content ol li')).toHaveText([
      'Ordered items start with a number',
      'and keep counting',
    ]);
    await expect(page.locator('.article-content pre code')).toContainText(
      'const greeting = `Hello, Conduit`;',
    );
    await expect(page.locator('.article-content blockquote')).toContainText(
      'Quality is never an accident.',
    );
    await expect(page.getByRole('link', { name: 'home page' })).toHaveAttribute('href', '/');
  });

  test('28. does not execute script tags in article bodies [FR-044]', async ({ page }) => {
    const account = disposableAccount('xss');
    await signUp(page, account);

    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const title = `QA script test ${uniqueRunId()}`;

    await editor.goto();
    await editor.fillArticle({
      title,
      description: 'Script safety',
      body: '<script>window.__xss = true</script>\n\n**bold**',
    });

    let dialogs = 0;
    page.on('dialog', (dialog) => {
      dialogs++;
      void dialog.dismiss();
    });

    const created = waitForApi(page, 'POST', '/api/articles');
    await editor.publish();
    expect((await created).status()).toBe(201);

    await expect(page).toHaveURL(slugPattern(title));
    await expect(article.title).toHaveText(title);
    await expect(page.locator('.article-content strong')).toHaveText('bold');
    const xssFlag = await page.evaluate(
      () => (window as unknown as { __xss?: boolean }).__xss,
    );
    expect(xssFlag).toBeUndefined();
    expect(dialogs).toBe(0);

    const deleted = waitForApi(page, 'DELETE', EDIT_ARTICLE_PATH);
    await article.deleteButtons.first().click();
    expect((await deleted).status()).toBe(204);
    await expect(page).toHaveURL('/');
  });

  test('29. author and visitor action buttons [FR-045]', async ({ page }) => {
    const article = new ArticlePage(page);

    await article.goto(SEED_ARTICLES.flaky);
    await expect(article.followButton('alice')).toHaveCount(2);
    await expect(article.favoriteButtons).toHaveCount(2);

    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await article.goto(SEED_ARTICLES.flaky);

    await expect(article.editLinks).toHaveCount(2);
    await expect(article.deleteButtons).toHaveCount(2);
    await expect(article.followButton('alice')).toHaveCount(0);
    const editHrefs = await article.editLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    );
    expect(editHrefs).toEqual([
      `/editor/${SEED_ARTICLES.flaky}`,
      `/editor/${SEED_ARTICLES.flaky}`,
    ]);
  });
});
