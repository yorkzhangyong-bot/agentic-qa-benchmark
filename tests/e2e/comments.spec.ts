import { test, expect } from '@playwright/test';
import { cleanupComment, uniqueId, withApi } from './fixtures/api';
import { signIn } from './fixtures/ui';
import { ArticlePage } from './pages/ArticlePage';

const EXPLORATORY = 'Exploratory testing sessions that actually find bugs';
const MARKDOWN = 'Markdown cheat sheet for Conduit authors';

test.describe('Comments', () => {
  let commentText: string | undefined;
  let commentSlug: string | undefined;

  test.afterEach(async () => {
    if (commentText && commentSlug) await cleanupComment(commentSlug, commentText);
    commentText = undefined;
    commentSlug = undefined;
  });

  test('57. seeded article comments list [FR-056]', async ({ page }) => {
    const article = new ArticlePage(page);
    const slug = await withApi(async api => (await api.findArticle(EXPLORATORY)).slug);

    await article.goto(slug);

    await expect(article.comments).toHaveCount(5);
    await expect(article.commentsBy('bob')).toHaveCount(2);
    await expect(article.commentsBy('carol')).toHaveCount(1);
    await expect(article.commentsBy('dave')).toHaveCount(1);
    await expect(article.commentsBy('erin')).toHaveCount(1);
    await expect(article.comments.locator('.date-posted')).toHaveText([
      'January 27, 2026',
      'January 27, 2026',
      'January 27, 2026',
      'January 27, 2026',
      'January 27, 2026',
    ]);
    await expect(article.comments.locator('img')).toHaveCount(5);
    await expect(article.commentsBy('bob').locator('a[href="/profile/bob"]')).toHaveCount(4);
    await expect(article.comments.filter({ hasText: 'We tried this last sprint and found three bugs in the editor.' })).toHaveCount(1);
  });

  test('58. post comment adds under user and clears box [FR-058, SC-008]', async ({ page }) => {
    const article = new ArticlePage(page);
    const slug = await withApi(async api => (await api.findArticle(MARKDOWN)).slug);
    const text = `qa-comment-${uniqueId('note')}`;
    commentText = text;
    commentSlug = slug;

    await signIn(page);
    await article.goto(slug);

    await expect(article.commentBox).toBeVisible();
    await expect(page.locator('.comment-form img')).toBeVisible();
    await expect(article.postCommentButton).toBeVisible();

    await article.addComment(text);

    const comment = article.comments.filter({ hasText: text });
    await expect(comment).toHaveCount(1);
    await expect(comment.getByRole('link', { name: 'alice', exact: true })).toBeVisible();
    await expect(article.commentBox).toHaveValue('');

    await page.reload();
    await expect(article.comments.filter({ hasText: text })).toHaveCount(1);
  });

  test('59. delete own comment immediately and after reload [FR-060]', async ({ page }) => {
    const article = new ArticlePage(page);
    const slug = await withApi(async api => (await api.findArticle(MARKDOWN)).slug);
    const text = `qa-delete-comment-${uniqueId('note')}`;
    commentText = text;
    commentSlug = slug;

    await withApi(async api => {
      const token = await api.userToken('alice');
      await api.addComment(token, slug, text);
    });

    await signIn(page);
    await article.goto(slug);
    const comment = article.comments.filter({ hasText: text });
    await expect(comment).toHaveCount(1);

    await comment.locator('.mod-options i').click();

    await expect(article.comments.filter({ hasText: text })).toHaveCount(0);

    await page.reload();
    await expect(article.comments.filter({ hasText: text })).toHaveCount(0);
  });

  test('60. empty comment shows body can\'t be blank [FR-059, SC-004]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signIn(page);
    const slug = await withApi(async api => (await api.findArticle('Flaky tests: a field guide')).slug);
    await article.goto(slug);
    await expect(article.comments.first()).toBeVisible();
    const before = await article.comments.count();

    await article.postCommentButton.click();
    await expect(page.getByText("body can't be blank")).toBeVisible();
    await expect(article.comments).toHaveCount(before);

    await article.commentBox.fill('   ');
    await article.postCommentButton.click();
    await expect(page.getByText("body can't be blank")).toBeVisible();
    await expect(article.comments).toHaveCount(before);
    await expect(article.commentBox).toHaveValue('   ');
  });

  test('61. trash icon only on own comments [FR-060]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signIn(page, 'bob@example.com');
    const slug = await withApi(async api => (await api.findArticle(EXPLORATORY)).slug);
    await article.goto(slug);

    const bobComments = article.commentsBy('bob');
    await expect(bobComments).toHaveCount(2);
    await expect(bobComments.locator('.mod-options')).toHaveCount(2);
    await expect(article.commentsBy('carol').locator('.mod-options')).toHaveCount(0);
    await expect(article.commentsBy('dave').locator('.mod-options')).toHaveCount(0);
    await expect(article.commentsBy('erin').locator('.mod-options')).toHaveCount(0);
  });
});
