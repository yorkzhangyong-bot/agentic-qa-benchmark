import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { signIn } from './fixtures/auth';
import { waitForApi } from './fixtures/network';
import {
  SEED_ARTICLES,
  SEED_ARTICLE_TITLES,
  SEED_PASSWORD,
  SEED_USERS,
} from './fixtures/seed';

const FOLLOW_PATH = /^\/api\/profiles\/[^/]+\/follow$/;

test.describe('Following authors', () => {
  test('45. follows and unfollows an author [FR-065] [FR-066]', async ({ page }) => {
    const profile = new ProfilePage(page);
    const home = new HomePage(page);
    const article = new ArticlePage(page);

    await signIn(page, SEED_USERS.erin.email, SEED_PASSWORD);
    await profile.goto('bob');
    await expect(profile.followButton('bob')).toBeVisible();

    const followed = waitForApi(page, 'POST', FOLLOW_PATH);
    await profile.followButton('bob').click();
    expect((await followed).status()).toBe(200);
    await expect(profile.unfollowButton('bob')).toBeVisible();

    await page.goto('/?feed=following');
    await expect(home.previews).toHaveCount(6);
    const authors = (await home.previews.locator('a.author').allTextContents()).map((author) =>
      author.trim(),
    );
    expect(authors).toHaveLength(6);
    for (const author of authors) expect(author).toBe('bob');
    await expect(home.pagination.buttons).toHaveCount(1);
    await expect(home.previews.first().getByRole('heading', { level: 1 })).toHaveText(
      SEED_ARTICLE_TITLES.rateLimiting,
    );

    await article.goto(SEED_ARTICLES.rateLimiting);
    await expect(article.unfollowButton('bob')).toHaveCount(2);
    const unfollowed = waitForApi(page, 'DELETE', FOLLOW_PATH);
    await article.unfollowButton('bob').first().click();
    expect((await unfollowed).status()).toBe(200);
    await expect(article.followButton('bob')).toHaveCount(2);

    await profile.goto('bob');
    await expect(profile.followButton('bob')).toBeVisible();

    await page.goto('/?feed=following');
    await expect(home.emptyFeedMessage).toBeVisible();
    await expect(home.previews).toHaveCount(0);
  });

  test('46. signed-out follow leads to sign-in [FR-067]', async ({ page }) => {
    const profile = new ProfilePage(page);
    const login = new LoginPage(page);

    await profile.goto('bob');
    await profile.followButton('bob').click();

    await expect(page).toHaveURL('/login');
    await expect(login.heading).toBeVisible();
  });

  test('47. own profile and articles have no follow action [FR-068]', async ({ page }) => {
    const profile = new ProfilePage(page);
    const article = new ArticlePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);

    await profile.goto('alice');
    await expect(profile.editProfileLink).toHaveAttribute('href', '/settings');
    await expect(profile.followButton('alice')).toHaveCount(0);
    await expect(profile.unfollowButton('alice')).toHaveCount(0);

    await article.goto(SEED_ARTICLES.flaky);
    await expect(article.editLinks).toHaveCount(2);
    await expect(article.deleteButtons).toHaveCount(2);
    await expect(article.followButton('alice')).toHaveCount(0);
  });
});
