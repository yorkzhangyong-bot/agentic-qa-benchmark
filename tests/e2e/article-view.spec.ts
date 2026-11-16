import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { PASSWORD, signInAs } from './fixtures/auth';

const RELEASE_SLUG = 'Release-notes-for-testers-e3d269ed';

test.describe('Article page', () => {
  test('41. article page shows all parts of the article [FR-042]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);
    await home.goto('/?page=2');
    await home.preview('Flaky tests: a field guide').open();

    await expect(article.heading).toHaveText('Flaky tests: a field guide');
    await expect(article.author).toHaveText('alice');
    await expect(article.author).toHaveAttribute('href', '/profile/alice');
    await expect(page.locator('.banner .article-meta img')).toHaveAttribute('src', /demo-avatar\.png$/);
    await expect(article.date).toHaveText('January 9, 2026');

    await expect(article.body).toContainText(
      'Most flaky tests share a handful of causes: timing, shared state, test order and the clock.',
    );
    await expect(article.body).toContainText(
      'Quarantine them quickly, fix the root cause, and never just add a retry and move on.',
    );

    const tags = await article.tagNames();
    expect(tags).toEqual(expect.arrayContaining(['testing', 'automation', 'ci']));
  });

  test('42. markdown body is rendered [FR-043]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);
    await home.goto('/?page=2');
    await home.preview('Markdown cheat sheet for Conduit authors').open();

    for (const heading of ['Headings', 'Lists', 'Code', 'Quotes and links']) {
      await expect(article.body.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    await expect(article.body.locator('ul > li')).toHaveCount(2);
    await expect(article.body.locator('ol > li')).toHaveCount(2);
    await expect(article.body.locator('pre code')).toContainText('const greeting = `Hello, Conduit`;');
    await expect(article.body.locator('blockquote')).toHaveText(/Quality is never an accident\./);
    await expect(article.body.getByRole('link', { name: 'home page' })).toHaveAttribute('href', '/');
    await expect(article.body).not.toContainText('## Headings');
  });

  test('44. author sees edit and delete twice [FR-045]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signInAs(page, 'alice@example.com', PASSWORD);
    await article.goto(`/article/${RELEASE_SLUG}`);

    await expect(article.toolbars).toHaveCount(2);
    await expect(article.editLinks).toHaveCount(2);
    for (const link of await article.editLinks.all()) {
      await expect(link).toHaveAttribute('href', `/editor/${RELEASE_SLUG}`);
    }
    await expect(article.deleteButtons).toHaveCount(2);
    await expect(article.followButton('alice')).toHaveCount(0);
    await expect(article.favoriteButtons).toHaveCount(0);
    await expect(article.commentForm).toBeVisible();
  });

  test('45. signed-out visitor sees follow and favorite twice [FR-045]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);
    await home.goto('/?page=2');
    await home.preview('Flaky tests: a field guide').open();
    await expect(page).toHaveURL(/\/article\/Flaky-tests:-a-field-guide-45af9838$/);

    await expect(article.toolbars).toHaveCount(2);
    await expect(article.followButton('alice')).toHaveCount(2);
    for (const button of await article.followButton('alice').all()) {
      await expect(button).toHaveClass(/btn-outline-secondary/);
    }
    await expect(article.favoriteButtons).toHaveCount(2);
    for (const button of await article.favoriteButtons.all()) {
      await expect(button).toHaveText(/Favorite Article \(4\)/);
    }
    await expect(article.editLinks).toHaveCount(0);
    await expect(article.deleteButtons).toHaveCount(0);
    await expect(article.commentPrompt).toBeVisible();
  });

  test('46. another signed-in user sees follow and favorite only [FR-045]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signInAs(page, 'bob@example.com', PASSWORD);
    await article.goto(`/article/${RELEASE_SLUG}`);

    await expect(article.unfollowButton('alice')).toHaveCount(2);
    for (const button of await article.unfollowButton('alice').all()) {
      await expect(button).toHaveClass(/btn-secondary/);
    }
    await expect(article.favoriteButtons).toHaveCount(2);
    for (const button of await article.favoriteButtons.all()) {
      await expect(button).toHaveText(/Favorite Article \(0\)/);
    }
    await expect(article.editLinks).toHaveCount(0);
    await expect(article.deleteButtons).toHaveCount(0);
    await expect(article.commentForm).toBeVisible();
    await expect(article.commentForm.locator('img.comment-author-img')).toHaveAttribute('src', /smiley-cyrus\.jpeg$/);
  });
});
