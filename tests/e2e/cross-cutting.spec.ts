import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { AuthPage } from './pages/AuthPage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import {
  PASSWORD,
  deleteArticle,
  publishArticle,
  registerUser,
  signInAs,
  signOut,
  throwawayUser,
  uniqueSuffix,
} from './fixtures/auth';

async function clickPage(page: import('@playwright/test').Page, button: import('@playwright/test').Locator) {
  const response = page.waitForResponse(r => r.url().includes('/api/articles') && r.request().method() === 'GET');
  await button.click();
  await response;
}

async function expectNewestFirst(dates: import('@playwright/test').Locator) {
  await expect(dates.first()).toBeVisible();
  const values = (await dates.allInnerTexts()).map(text => new Date(text.trim()).getTime());
  expect(values.length).toBeGreaterThan(0);
  for (let index = 1; index < values.length; index++) {
    expect(values[index - 1]).toBeGreaterThanOrEqual(values[index]);
  }
}

test.describe('Cross-cutting journey and data integrity', () => {
  test('73. new user journey survives sign out and sign in [SC-003][SC-008]', async ({ page }) => {
    const user = throwawayUser('journey');
    const suffix = uniqueSuffix();
    const title = `Journey article ${suffix}`;
    const commentText = `Journey comment ${suffix}`;
    const bio = `Journey bio ${suffix}`;
    await registerUser(page, user);

    const home = new HomePage(page);
    await expect(home.activeTab).toHaveText('Global Feed');
    const slug = await publishArticle(page, {
      title,
      description: `Journey description ${suffix}`,
      body: `Journey body ${suffix}`,
      tags: ['testing', 'automation'],
    });

    await home.goto();
    await expect(home.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);
    const profile = new ProfilePage(page);
    await profile.goto(user.username);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);

    await page.goto(`/article/${slug}`);
    const article = new ArticlePage(page);
    await article.commentBox.fill(commentText);
    const commented = page.waitForResponse(r => r.url().endsWith('/comments') && r.request().method() === 'POST');
    await article.postCommentButton.click();
    expect((await commented).status()).toBe(201);
    await expect(article.commentCard(commentText).locator('a.comment-author').last()).toHaveText(user.username);

    // The author's own article page has no Favorite control (FR-045), so favourite it from its feed preview.
    await home.goto();
    const favorited = page.waitForResponse(r => r.url().endsWith('/favorite') && r.request().method() === 'POST');
    await home.preview(title).favoriteButton.click();
    expect((await favorited).status()).toBe(200);
    await expect(home.preview(title).favoriteButton).toHaveClass(/btn-primary/);

    await page.goto('/profile/bob');
    const followed = page.waitForResponse(
      r => r.url().endsWith('/api/profiles/bob/follow') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Follow bob' }).click();
    expect((await followed).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Unfollow bob' })).toBeVisible();

    await profile.goto(user.username, 'favorites');
    await expect(profile.preview(title).root).toHaveCount(1);
    await expect(profile.preview(title).favoriteButton).toHaveClass(/btn-primary/);

    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.bioInput.fill(bio);
    const updated = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await updated).status()).toBe(200);
    await expect(profile.bio).toHaveText(bio);

    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');
    await signInAs(page, user.email, PASSWORD);
    await expect(page.locator('nav.navbar').getByRole('link', { name: user.username })).toBeVisible();

    await profile.goto(user.username);
    await expect(profile.name).toHaveText(user.username);
    await expect(profile.bio).toHaveText(bio);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);

    await page.goto(`/article/${slug}`);
    await expect(article.commentCard(commentText).locator('a.comment-author').last()).toHaveText(user.username);

    await profile.goto(user.username, 'favorites');
    await expect(profile.preview(title).root).toHaveCount(1);
    await expect(profile.preview(title).favoriteButton).toHaveClass(/btn-primary/);

    await profile.goto('bob');
    await expect(page.getByRole('button', { name: 'Unfollow bob' })).toBeVisible();

    await home.goto();
    await page.getByRole('link', { name: 'Your Feed' }).click();
    await expect(home.activeTab).toHaveText('Your Feed');
    await expect(home.previews).toHaveCount(6);
    for (const card of await home.previews.all()) {
      await expect(card.locator('a.author')).toHaveText('bob');
    }

    await profile.goto('bob');
    const unfollowed = page.waitForResponse(
      r => r.url().endsWith('/api/profiles/bob/follow') && r.request().method() === 'DELETE',
    );
    await page.getByRole('button', { name: 'Unfollow bob' }).click();
    expect((await unfollowed).status()).toBe(200);

    await page.goto(`/article/${slug}`);
    const removedComment = page.waitForResponse(
      r => r.url().includes('/comments/') && r.request().method() === 'DELETE',
    );
    await article.commentCard(commentText).locator('.mod-options i.ion-trash-a').click();
    expect((await removedComment).status()).toBe(204);

    await deleteArticle(page, slug);
  });

  test('74. bad input never changes data [SC-004]', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto('/register');
    await auth.usernameInput.fill(throwawayUser('bad').username);
    await auth.emailInput.fill('not-an-email');
    await auth.passwordInput.fill(PASSWORD);
    await auth.submitButton.click();
    await expect(auth.errors).toHaveCount(1);
    expect(await auth.errorMessages()).toEqual(['email is invalid']);

    await auth.goto('/register');
    await auth.usernameInput.fill('alice');
    await auth.emailInput.fill(`dupe${uniqueSuffix()}@example.com`);
    await auth.passwordInput.fill(PASSWORD);
    const duplicate = page.waitForResponse(r => r.url().endsWith('/api/users') && r.request().method() === 'POST');
    await auth.submitButton.click();
    expect((await duplicate).status()).toBe(409);
    expect(await auth.errorMessages()).toContain('username has already been taken');

    await signInAs(page, 'alice@example.com', PASSWORD);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.passwordInput.fill('short');
    const shortPassword = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await shortPassword).status()).toBe(422);
    expect(await settings.errorMessages()).toEqual(['password must be at least 8 characters long']);

    const home = new HomePage(page);
    await home.goto('/?page=2');
    await home.preview('Flaky tests: a field guide').open();
    const article = new ArticlePage(page);
    const emptyComment = page.waitForResponse(r => r.url().endsWith('/comments') && r.request().method() === 'POST');
    await article.postCommentButton.click();
    expect((await emptyComment).status()).toBe(422);
    expect(await article.errors.allInnerTexts()).toEqual(["body can't be blank"]);

    const editor = new EditorPage(page);
    await editor.goto();
    const emptyArticle = page.waitForResponse(
      r => r.url().endsWith('/api/articles') && r.request().method() === 'POST',
    );
    await editor.publish();
    expect((await emptyArticle).status()).toBe(422);
    expect(await editor.errorMessages()).toEqual([
      "title can't be blank",
      "description can't be blank",
      "body can't be blank",
    ]);

    await editor.goto('Release-notes-for-testers-e3d269ed');
    await expect(editor.titleInput).toHaveValue('Release notes for testers');
    await editor.titleInput.fill('');
    const emptyTitle = page.waitForResponse(
      r => r.url().endsWith('/api/articles/Release-notes-for-testers-e3d269ed') && r.request().method() === 'PUT',
    );
    await editor.publish();
    expect((await emptyTitle).status()).toBe(422);
    expect(await editor.errorMessages()).toEqual(['title String must contain at least 1 character(s)']);

    await signOut(page);
    await signInAs(page, 'alice@example.com', PASSWORD);

    await home.goto();
    const pageOne = await home.titles();
    await clickPage(page, home.pageButton(2));
    const pageTwo = await home.titles();
    await clickPage(page, home.pageButton(3));
    const pageThree = await home.titles();
    expect(pageOne).toHaveLength(10);
    expect(pageTwo).toHaveLength(10);
    expect(pageThree).toHaveLength(4);
    expect(new Set([...pageOne, ...pageTwo, ...pageThree]).size).toBe(24);

    const profile = new ProfilePage(page);
    await profile.goto('alice');
    await expect(profile.previews).toHaveCount(10);
    await clickPage(page, profile.pageButton(2));
    await expect(profile.previews).toHaveCount(2);

    await home.goto('/?page=2');
    await home.preview('Flaky tests: a field guide').open();
    await expect(article.comments).toHaveCount(2);
  });

  test('75. every article list is ordered newest first [SC-009]', async ({ page }) => {
    const home = new HomePage(page);
    const profile = new ProfilePage(page);

    await home.goto();
    await expectNewestFirst(home.previews.locator('.date'));
    await clickPage(page, home.pageButton(2));
    await expectNewestFirst(home.previews.locator('.date'));
    await clickPage(page, home.pageButton(3));
    await expectNewestFirst(home.previews.locator('.date'));

    await home.goto('/tag/testing');
    await expectNewestFirst(home.previews.locator('.date'));

    await profile.goto('alice');
    await expectNewestFirst(profile.previews.locator('.date'));

    await profile.goto('alice', 'favorites');
    await expectNewestFirst(profile.previews.locator('.date'));

    await signInAs(page, 'alice@example.com', PASSWORD);
    await home.goto('/?feed=following');
    await expect(home.previews).toHaveCount(10);
    await expectNewestFirst(home.previews.locator('.date'));
  });
});
