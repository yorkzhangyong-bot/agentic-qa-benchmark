import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { registerUser, throwawayUser, uniqueSuffix } from './fixtures/auth';

async function openFlaky(page: import('@playwright/test').Page): Promise<ArticlePage> {
  const home = new HomePage(page);
  await home.goto('/?page=2');
  await home.preview('Flaky tests: a field guide').open();
  const article = new ArticlePage(page);
  await expect(article.heading).toHaveText('Flaky tests: a field guide');
  return article;
}

test.describe('Comments', () => {
  test('47. article comments list content and metadata [FR-056]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);
    await home.goto();
    await home.preview('Exploratory testing sessions that actually find bugs').open();
    await expect(article.heading).toHaveText('Exploratory testing sessions that actually find bugs');

    await expect(article.comments).toHaveCount(5);
    await expect(article.commentTexts).toContainText([
      'We tried this last sprint and found three bugs in the editor.',
    ]);

    const authors: string[] = [];
    for (const card of await article.comments.all()) {
      await expect(card.locator('img')).toBeVisible();
      await expect(card.locator('.date-posted')).toHaveText('January 27, 2026');
      const authorLink = card.locator('a.comment-author').last();
      const username = (await authorLink.innerText()).trim();
      authors.push(username);
      await expect(authorLink).toHaveAttribute('href', `/profile/${username}`);
    }
    expect(authors.filter(name => name === 'bob')).toHaveLength(2);
    expect(authors).toEqual(expect.arrayContaining(['carol', 'dave', 'erin']));
  });

  test('48. signed-out visitors see the comment prompt [FR-057]', async ({ page }) => {
    const article = await openFlaky(page);

    await expect(article.commentPrompt).toContainText('Sign in');
    await expect(article.commentPrompt).toContainText('sign up');
    await expect(article.commentPrompt).toContainText('to add comments on this article.');
    await expect(article.commentPrompt.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    await expect(article.commentPrompt.getByRole('link', { name: 'sign up' })).toHaveAttribute('href', '/register');
    await expect(article.commentBox).toHaveCount(0);
    await expect(article.postCommentButton).toHaveCount(0);
    await expect(page.locator('form.comment-form img')).toHaveCount(0);
  });

  test('49. posting a comment adds it and empties the box [FR-058]', async ({ page }) => {
    const user = throwawayUser('comment');
    const text = `Probe comment ${uniqueSuffix()}`;
    await registerUser(page, user);
    const article = await openFlaky(page);

    await expect(article.commentBox).toBeVisible();
    await expect(article.commentForm.locator('img.comment-author-img')).toHaveAttribute(
      'src',
      /\/assets\/default-avatar\.svg$/,
    );
    await expect(article.postCommentButton).toBeVisible();

    await article.commentBox.fill(text);
    const created = page.waitForResponse(r => r.url().endsWith('/comments') && r.request().method() === 'POST');
    await article.postCommentButton.click();
    expect((await created).status()).toBe(201);

    const card = article.commentCard(text);
    await expect(card).toHaveCount(1);
    await expect(card.locator('a.comment-author').last()).toHaveText(user.username);
    await expect(article.commentBox).toHaveValue('');

    await page.reload();
    const reloaded = new ArticlePage(page);
    await expect(reloaded.commentCard(text)).toHaveCount(1);
    await expect(reloaded.commentCard(text).locator('a.comment-author').last()).toHaveText(user.username);

    const removed = page.waitForResponse(r => r.url().includes('/comments/') && r.request().method() === 'DELETE');
    await reloaded.commentCard(text).locator('.mod-options i.ion-trash-a').click();
    expect((await removed).status()).toBe(204);
  });

  test('50. empty comment is rejected [FR-059]', async ({ page }) => {
    const user = throwawayUser('emptycomment');
    await registerUser(page, user);
    const article = await openFlaky(page);
    await expect(article.comments).toHaveCount(2);

    const empty = page.waitForResponse(r => r.url().endsWith('/comments') && r.request().method() === 'POST');
    await article.postCommentButton.click();
    expect((await empty).status()).toBe(422);
    expect(await article.errors.allInnerTexts()).toEqual(["body can't be blank"]);
    await expect(article.comments).toHaveCount(2);
    await expect(page).toHaveURL(/\/article\/Flaky-tests:-a-field-guide-/);
    await expect(article.commentBox).toBeVisible();

    await article.commentBox.fill('   ');
    const spaces = page.waitForResponse(r => r.url().endsWith('/comments') && r.request().method() === 'POST');
    await article.postCommentButton.click();
    expect((await spaces).status()).toBe(422);
    expect(await article.errors.allInnerTexts()).toEqual(["body can't be blank"]);
    await expect(article.comments).toHaveCount(2);
    await expect(article.commentBox).toBeVisible();
    await expect(article.postCommentButton).toBeVisible();
  });

  test('51. own comments have a working trash icon [FR-060]', async ({ page }) => {
    const user = throwawayUser('owncomment');
    const text = `Own comment ${uniqueSuffix()}`;
    await registerUser(page, user);
    const article = await openFlaky(page);

    await article.commentBox.fill(text);
    const created = page.waitForResponse(r => r.url().endsWith('/comments') && r.request().method() === 'POST');
    await article.postCommentButton.click();
    expect((await created).status()).toBe(201);
    const ownCard = article.commentCard(text);
    await expect(ownCard).toHaveCount(1);

    const dialogs: string[] = [];
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await expect(article.comments.filter({ hasText: 'bob' }).locator('.mod-options')).toHaveCount(0);
    await expect(article.comments.filter({ hasText: 'erin' }).locator('.mod-options')).toHaveCount(0);
    await expect(ownCard.locator('span.mod-options i.ion-trash-a')).toHaveCount(1);

    const removed = page.waitForResponse(r => r.url().includes('/comments/') && r.request().method() === 'DELETE');
    await ownCard.locator('span.mod-options i.ion-trash-a').click();
    expect((await removed).status()).toBe(204);
    await expect(article.commentCard(text)).toHaveCount(0);
    expect(dialogs).toEqual([]);

    await page.reload();
    await expect(new ArticlePage(page).commentCard(text)).toHaveCount(0);
  });
});
