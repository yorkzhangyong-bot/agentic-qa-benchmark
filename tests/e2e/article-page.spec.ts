import { test, expect } from '@playwright/test';
import { cleanupArticle, uniqueId, withApi } from './fixtures/api';
import { signIn } from './fixtures/ui';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';

test.describe('Article page', () => {
  let createdTitle: string | undefined;

  test.afterEach(async () => {
    if (createdTitle) await cleanupArticle(createdTitle);
    createdTitle = undefined;
  });
  test('36. article page metadata, tags and comments [FR-042]', async ({ page }) => {
    const article = new ArticlePage(page);
    const slug = await withApi(async api => (await api.findArticle('Flaky tests: a field guide')).slug);

    await article.goto(slug);

    await expect(article.title).toHaveText('Flaky tests: a field guide');
    await expect(article.topActions.getByRole('link', { name: 'alice' })).toHaveAttribute(
      'href',
      '/profile/alice',
    );
    await expect(article.date).toHaveText('January 9, 2026');
    // All three tags must be shown; their order is not specified (FR-042).
    await expect(article.tagItems).toHaveCount(3);
    await expect(article.tagItems.filter({ hasText: 'testing' })).toHaveCount(1);
    await expect(article.tagItems.filter({ hasText: 'automation' })).toHaveCount(1);
    await expect(article.tagItems.filter({ hasText: 'ci' })).toHaveCount(1);

    await expect(article.comments).toHaveCount(2);
    await expect(article.commentsBy('bob')).toHaveCount(1);
    await expect(article.commentsBy('erin')).toHaveCount(1);
    await expect(article.commentsBy('bob').locator('a[href="/profile/bob"]')).toHaveCount(2);
    await expect(article.commentsBy('erin').locator('a[href="/profile/erin"]')).toHaveCount(2);
  });

  test('37. article body renders markdown [FR-043]', async ({ page }) => {
    const article = new ArticlePage(page);
    const slug = await withApi(
      async api => (await api.findArticle('Markdown cheat sheet for Conduit authors')).slug,
    );

    await article.goto(slug);

    await expect(article.articleBody.locator('h2')).toHaveText([
      'Headings',
      'Lists',
      'Code',
      'Quotes and links',
    ]);
    await expect(article.articleBody.locator('ul li')).toHaveText([
      'Unordered items start with a dash',
      'like this one',
    ]);
    await expect(article.articleBody.locator('ol li')).toHaveText([
      'Ordered items start with a number',
      'and keep counting',
    ]);
    await expect(article.articleBody.locator('pre code')).toContainText('const greeting');
    await expect(article.articleBody.locator('blockquote')).toContainText('Quality is never an accident.');
    await expect(article.articleBody.getByRole('link', { name: 'home page' })).toHaveAttribute('href', '/');
  });

  test('38. article body sanitises script tags [FR-044]', async ({ page }) => {
    const article = new ArticlePage(page);
    const editor = new EditorPage(page);
    const title = `qa-xss ${uniqueId('article')}`;
    createdTitle = title;

    await signIn(page);
    await editor.goto('/editor');
    await editor.fill(title, 'A script tag in the body', '<script>window.__xss = true</script>\n\n**bold**');
    await editor.publish();

    await expect(article.title).toHaveText(title);
    await expect(article.articleBody.locator('strong')).toHaveText('bold');
    await expect(article.articleBody.locator('script')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__xss)).toBeUndefined();
  });

  test('39. signed-out article comment prompt [FR-057]', async ({ page }) => {
    const article = new ArticlePage(page);
    const slug = await withApi(async api => (await api.findArticle('Flaky tests: a field guide')).slug);

    await article.goto(slug);

    await expect(page.locator('.article-page')).toContainText(
      'Sign in or sign up to add comments on this article.',
    );
    const articlePage = page.locator('app-article-view');
    await expect(articlePage.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login');
    await expect(articlePage.getByRole('link', { name: 'sign up', exact: true })).toHaveAttribute(
      'href',
      '/register',
    );
    await expect(article.commentBox).toHaveCount(0);
    await expect(article.postCommentButton).toHaveCount(0);
  });

  test('40. non-author article controls appear twice [FR-045]', async ({ page }) => {
    const article = new ArticlePage(page);
    const slug = await withApi(async api => (await api.findArticle('Flaky tests: a field guide')).slug);

    await article.goto(slug);

    await expect(page.getByRole('button', { name: /Follow alice/ })).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Favorite Article (4)' })).toHaveCount(2);
    await expect(page.getByRole('link', { name: /Edit Article/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Delete Article/ })).toHaveCount(0);
  });

  test('41. author article controls appear twice [FR-045]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signIn(page);
    const slug = await withApi(async api => (await api.findArticle('Flaky tests: a field guide')).slug);

    await article.goto(slug);

    await expect(page.getByRole('link', { name: /Edit Article/ })).toHaveCount(2);
    await expect(page.getByRole('button', { name: /Delete Article/ })).toHaveCount(2);
    await expect(page.getByRole('button', { name: /Follow alice/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Favorite Article|Unfavorite Article/ })).toHaveCount(0);
  });
});
