import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { signIn } from './fixtures/auth';
import { waitForApi } from './fixtures/network';
import {
  ALICE_AVATAR,
  SEED_ARTICLES,
  SEED_PASSWORD,
  SEED_USERS,
  today,
  uniqueRunId,
} from './fixtures/seed';

const COMMENT_PATH = /^\/api\/articles\/[^/]+\/comments$/;
const COMMENT_DELETE_PATH = /^\/api\/articles\/[^/]+\/comments\/\d+$/;

test.describe('Comments', () => {
  test('36. seeded comments are listed [FR-056]', async ({ page }) => {
    const article = new ArticlePage(page);
    await article.goto(SEED_ARTICLES.exploratory);

    await expect(article.comments).toHaveCount(5);
    const authors = (
      await article.comments.getByRole('link', { name: /^(bob|carol|dave|erin)$/ }).allTextContents()
    ).map((author) => author.trim());
    expect(authors).toEqual(['bob', 'carol', 'dave', 'erin', 'bob']);

    await expect(article.comments.locator('.date-posted')).toHaveText([
      'January 27, 2026',
      'January 27, 2026',
      'January 27, 2026',
      'January 27, 2026',
      'January 27, 2026',
    ]);
    await expect(article.comments.locator('img')).toHaveCount(5);

    const expected = [
      ['bob', 'We tried this last sprint and found three bugs in the editor.'],
      ['carol', 'Do you share the session notes with developers?'],
      ['dave', 'The charter examples are really helpful.'],
      ['erin', 'Can a new joiner run one of these on day one?'],
      ['bob', 'Following up: two of those editor bugs are fixed now.'],
    ];
    for (const [author, text] of expected) {
      const comment = article.comment(text);
      await expect(comment).toHaveCount(1);
      await expect(comment.getByRole('link', { name: author, exact: true })).toHaveAttribute(
        'href',
        `/profile/${author}`,
      );
      await expect(comment.locator('img')).toHaveCount(1);
    }

    await expect(article.comments.locator('.mod-options')).toHaveCount(0);
  });

  test('37. prompted to sign in to comment [FR-057]', async ({ page }) => {
    const article = new ArticlePage(page);
    await article.goto(SEED_ARTICLES.flaky);

    await expect(article.signInPrompt).toBeVisible();
    await expect(article.signInPrompt.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
      'href',
      '/login',
    );
    await expect(article.signInPrompt.getByRole('link', { name: 'sign up', exact: true })).toHaveAttribute(
      'href',
      '/register',
    );
    await expect(article.commentBox).toHaveCount(0);
    await expect(article.postCommentButton).toHaveCount(0);
  });

  test('38. posts a comment that persists [FR-058]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await article.goto(SEED_ARTICLES.flaky);

    await expect(article.commentBox).toBeVisible();
    await expect(article.commentFormAvatar).toHaveAttribute('src', ALICE_AVATAR);
    await expect(article.postCommentButton).toBeVisible();

    const text = `QA comment ${uniqueRunId()}`;
    const created = waitForApi(page, 'POST', COMMENT_PATH);
    await article.postComment(text);
    expect((await created).status()).toBe(201);

    const comment = article.comment(text);
    await expect(comment).toHaveCount(1);
    await expect(comment.getByRole('link', { name: 'alice', exact: true })).toHaveAttribute(
      'href',
      '/profile/alice',
    );
    await expect(comment.locator('.date-posted')).toHaveText(today());
    await expect(article.commentBox).toHaveValue('');

    await page.reload();
    await expect(article.comment(text)).toHaveCount(1);

    const deleted = waitForApi(page, 'DELETE', COMMENT_DELETE_PATH);
    await article.commentTrash(article.comment(text)).click();
    expect((await deleted).status()).toBe(204);
    await expect(article.comments).toHaveCount(2);
  });

  test('39. rejects blank comments [FR-059]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await article.goto(SEED_ARTICLES.flaky);
    await expect(article.comments).toHaveCount(2);

    const empty = waitForApi(page, 'POST', COMMENT_PATH);
    await article.postCommentButton.click();
    expect((await empty).status()).toBe(422);
    await expect(article.errors.filter({ hasText: "body can't be blank" })).toHaveCount(1);
    await expect(article.comments).toHaveCount(2);

    await article.commentBox.fill('   ');
    const spaces = waitForApi(page, 'POST', COMMENT_PATH);
    await article.postCommentButton.click();
    expect((await spaces).status()).toBe(422);
    await expect(article.errors.filter({ hasText: "body can't be blank" })).toHaveCount(1);
    await expect(article.comments).toHaveCount(2);
  });

  test("40. deletes only the user's own comment [FR-060]", async ({ page }) => {
    const article = new ArticlePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await article.goto(SEED_ARTICLES.flaky);

    const bobComment = article.comment('Our worst offender was a test that depended on the clock.');
    const erinComment = article.comment('Bookmarking this for our next retro.');
    await expect(bobComment.locator('.mod-options')).toHaveCount(0);
    await expect(erinComment.locator('.mod-options')).toHaveCount(0);
    await expect(article.comments.locator('.mod-options')).toHaveCount(0);

    const text = `QA comment ${uniqueRunId()}`;
    const created = waitForApi(page, 'POST', COMMENT_PATH);
    await article.postComment(text);
    expect((await created).status()).toBe(201);
    const ownComment = article.comment(text);
    await expect(article.commentTrash(ownComment)).toBeVisible();

    let dialogs = 0;
    page.on('dialog', (dialog) => {
      dialogs++;
      void dialog.dismiss();
    });
    const deleted = waitForApi(page, 'DELETE', COMMENT_DELETE_PATH);
    await article.commentTrash(ownComment).click();
    expect((await deleted).status()).toBe(204);

    await expect(article.comment(text)).toHaveCount(0);
    expect(dialogs).toBe(0);

    await page.reload();
    await expect(article.comment(text)).toHaveCount(0);
    await expect(article.comments).toHaveCount(2);
  });
});
