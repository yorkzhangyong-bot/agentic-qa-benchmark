import { test, expect } from './support/fixtures';
import { createComment, deleteComment, signInWithToken, unique } from './support/api';
import { ArticlePage } from './pages/ArticlePage';

const FLAKY_SLUG = 'Flaky-tests:-a-field-guide-45af9838';
const EXPLORATORY_SLUG = 'Exploratory-testing-sessions-that-actually-find-bugs-262d883c';
const PRODUCTION_SLUG = 'What-I-learned-from-breaking-production-bb4726be';
const ALICE_AVATAR = 'http://localhost:3000/images/demo-avatar.png';

test.describe('Comments', () => {
  /** Covers FR-058 */
  test('48. signed-in users see the comment form with placeholder avatar and button [FR-058]', async ({
    page,
    request,
  }) => {
    const article = new ArticlePage(page);

    await signInWithToken(page, request, 'alice@example.com', `/article/${FLAKY_SLUG}`);

    await expect(article.commentBox).toBeVisible();
    await expect(article.commentBox).toHaveAttribute('placeholder', 'Write a comment...');
    await expect(article.commentFormAvatar).toHaveAttribute('src', ALICE_AVATAR);
    await expect(article.postCommentButton).toBeVisible();
    await expect(article.signInPrompt).toHaveCount(0);
  });

  /** Covers FR-058, AC6.1 and the known-behaviour section */
  test('49. posting a comment shows it at the top and it moves to the bottom after a reload [FR-058, KNOWN]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const body = `QA comment ${unique('c')}`;

    const token = await signInWithToken(page, request, 'alice@example.com', `/article/${FLAKY_SLUG}`);
    await expect(article.comments).toHaveCount(2);

    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${FLAKY_SLUG}/comments`) && res.request().method() === 'POST',
    );
    await article.addComment(body);
    const created = await response;
    expect(created.status()).toBe(201);
    const json = await created.json();
    cleanup.add(() => deleteComment(request, token, FLAKY_SLUG, json.comment.id));

    const first = article.comments.first();
    await expect(first).toContainText(body);
    await expect(first.getByRole('link', { name: 'alice', exact: true })).toBeVisible();
    await expect(article.commentBox).toHaveValue('');
    await expect(article.comments).toHaveCount(3);

    await page.reload();
    await expect(article.comments).toHaveCount(3);
    const last = article.comments.last();
    await expect(last).toContainText(body);
  });

  /** Covers FR-060, AC6.2 */
  test('50. the trash icon appears only on own comments and deletes immediately [FR-060]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const ownBody = `QA delete comment ${unique('c')}`;
    const carolBody = 'The rollback section is gold.';
    let dialogSeen = false;

    const token = await signInWithToken(page, request, 'alice@example.com', `/article/${PRODUCTION_SLUG}`);
    await expect(article.comments).toHaveCount(2);
    await expect(page.locator('.mod-options')).toHaveCount(1);
    await expect(article.commentDeleteIcon(carolBody)).toHaveCount(0);

    const commentId = await createComment(request, token, PRODUCTION_SLUG, ownBody);
    cleanup.add(() => deleteComment(request, token, PRODUCTION_SLUG, commentId));
    await page.reload();
    await expect(article.comments).toHaveCount(3);

    page.on('dialog', async dialog => {
      dialogSeen = true;
      await dialog.dismiss();
    });
    const response = page.waitForResponse(
      res =>
        res.url().endsWith(`/api/articles/${PRODUCTION_SLUG}/comments/${commentId}`) &&
        res.request().method() === 'DELETE',
    );
    await article.commentDeleteIcon(ownBody).click();
    expect((await response).status()).toBe(204);

    await expect(article.comments).toHaveCount(2);
    await expect(article.commentCard(ownBody)).toHaveCount(0);
    expect(dialogSeen).toBe(false);

    await page.reload();
    await expect(article.comments).toHaveCount(2);
    await expect(article.commentCard(ownBody)).toHaveCount(0);
    await expect(article.commentCard(carolBody)).toBeVisible();
  });

  /** Covers FR-059, AC6.3, SC-004 */
  test('51. empty and whitespace-only comments are rejected [FR-059, SC-004]', async ({ page, request }) => {
    const article = new ArticlePage(page);

    await signInWithToken(page, request, 'alice@example.com', `/article/${FLAKY_SLUG}`);
    await expect(article.comments).toHaveCount(2);

    await expect(article.commentBox).toHaveValue('');
    let response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${FLAKY_SLUG}/comments`) && res.request().method() === 'POST',
    );
    await article.postCommentButton.click();
    expect((await response).status()).toBe(422);
    await expect(article.commentErrors).toHaveText(["body can't be blank"]);
    await expect(article.comments).toHaveCount(2);

    await article.commentBox.fill('   ');
    response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${FLAKY_SLUG}/comments`) && res.request().method() === 'POST',
    );
    await article.postCommentButton.click();
    expect((await response).status()).toBe(422);
    await expect(article.commentErrors).toHaveText(["body can't be blank"]);
    await expect(article.comments).toHaveCount(2);
  });

  /** Covers FR-056 */
  test('52. the seeded comments on the exploratory article are all listed in order [FR-056]', async ({
    page,
  }) => {
    const article = new ArticlePage(page);
    const expected = [
      { author: 'bob', body: 'We tried this last sprint and found three bugs in the editor.' },
      { author: 'carol', body: 'Do you share the session notes with developers?' },
      { author: 'dave', body: 'The charter examples are really helpful.' },
      { author: 'erin', body: 'Can a new joiner run one of these on day one?' },
      { author: 'bob', body: 'Following up: two of those editor bugs are fixed now.' },
    ];

    await article.goto(EXPLORATORY_SLUG);

    await expect(article.comments).toHaveCount(5);
    const bodies = (await article.comments.locator('.card-text').allTextContents()).map(body => body.trim());
    expect(bodies).toEqual(expected.map(comment => comment.body));
    await expect(article.comments.getByText('January 27, 2026')).toHaveCount(5);

    for (const comment of expected) {
      await expect(article.commentAuthorLink(comment.body, comment.author)).toHaveAttribute(
        'href',
        `/profile/${comment.author}`,
      );
      await expect(article.commentCard(comment.body).getByText('January 27, 2026')).toBeVisible();
      await expect(article.commentCard(comment.body).locator('img')).toBeVisible();
    }
  });
});
