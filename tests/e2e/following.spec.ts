import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { PASSWORD, signInAs } from './fixtures/auth';

const EMPTY_FEED =
  'Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!';

test.describe('Following', () => {
  test('65. follow toggles and changes your feed [FR-065][FR-066]', async ({ page }) => {
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    await signInAs(page, 'erin@example.com', PASSWORD);

    await home.goto('/?feed=following');
    await expect(home.emptyMessage).toHaveText(EMPTY_FEED);
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageItems).toHaveCount(0);

    await profile.goto('bob');
    const follow = page.getByRole('button', { name: 'Follow bob' });
    await expect(follow).toHaveClass(/btn-outline-secondary/);
    const followed = page.waitForResponse(r => r.url().endsWith('/api/profiles/bob/follow') && r.request().method() === 'POST');
    await follow.click();
    expect((await followed).status()).toBe(200);

    const unfollow = page.getByRole('button', { name: 'Unfollow bob' });
    await expect(unfollow).toHaveClass(/btn-secondary/);

    await home.goto('/?feed=following');
    await expect(home.previews).toHaveCount(6);
    await expect(home.pageItems).toHaveCount(1);
    for (const card of await home.previews.all()) {
      await expect(card.locator('a.author')).toHaveText('bob');
    }

    await home.previews.first().getByRole('heading', { level: 1 }).click();
    const article = new ArticlePage(page);
    await expect(article.unfollowButton('bob')).toHaveCount(2);
    const unfollowed = page.waitForResponse(
      r => r.url().endsWith('/api/profiles/bob/follow') && r.request().method() === 'DELETE',
    );
    // Both toolbar copies are identical; use the one under the title.
    await article.unfollowButton('bob').first().click();
    expect((await unfollowed).status()).toBe(200);
    await expect(article.followButton('bob')).toHaveCount(2);

    await home.goto('/?feed=following');
    await expect(home.emptyMessage).toHaveText(EMPTY_FEED);
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageItems).toHaveCount(0);
  });

  test('66. signed-out follow goes to sign-in [FR-067]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/?page=2');
    await home.preview('Flaky tests: a field guide').open();
    const article = new ArticlePage(page);
    await expect(article.followButton('alice')).toHaveCount(2);

    await article.followButton('alice').first().click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');

    await home.goto('/?page=2');
    await home.preview('Flaky tests: a field guide').open();
    await expect(article.followButton('alice')).toHaveCount(2);
  });

  test('67. own profile and article have no follow button [FR-068]', async ({ page }) => {
    await signInAs(page, 'alice@example.com', PASSWORD);
    const profile = new ProfilePage(page);
    await profile.goto('alice');

    await expect(page.getByRole('link', { name: 'Edit Profile Settings' })).toHaveAttribute('href', '/settings');
    await expect(page.getByRole('button', { name: 'Follow alice' })).toHaveCount(0);

    const article = new ArticlePage(page);
    await article.goto('/article/Release-notes-for-testers-e3d269ed');
    await expect(article.editLinks).toHaveCount(2);
    await expect(article.deleteButtons).toHaveCount(2);
    await expect(article.followButton('alice')).toHaveCount(0);
    await expect(article.favoriteButtons).toHaveCount(0);
  });
});
