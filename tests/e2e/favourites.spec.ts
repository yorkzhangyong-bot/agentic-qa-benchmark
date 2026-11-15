import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { signIn } from './fixtures/auth';
import { waitForApi } from './fixtures/network';
import {
  SEED_ARTICLES,
  SEED_ARTICLE_TITLES,
  SEED_PASSWORD,
  SEED_USERS,
} from './fixtures/seed';

const FAVORITE_PATH = /^\/api\/articles\/[^/]+\/favorite$/;

test.describe('Favourites', () => {
  test('41. toggles a favourite from the feed [FR-061]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await home.goto('/?page=2');

    const preview = home.preview(SEED_ARTICLE_TITLES.keyboard);
    await expect(preview.heart).toHaveText('0');
    await expect(preview.heart).toHaveClass(/btn-outline-primary/);

    const favorited = waitForApi(page, 'POST', FAVORITE_PATH);
    await preview.heart.click();
    expect((await favorited).status()).toBe(200);
    await expect(preview.heart).toHaveText('1');
    await expect(preview.heart).toHaveClass(/btn-primary/);

    const unfavorited = waitForApi(page, 'DELETE', FAVORITE_PATH);
    await preview.heart.click();
    expect((await unfavorited).status()).toBe(200);
    await expect(preview.heart).toHaveText('0');
    await expect(preview.heart).toHaveClass(/btn-outline-primary/);
  });

  test('42. toggles a favourite on the article page [FR-062]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await article.goto(SEED_ARTICLES.keyboard);

    await expect(article.favoriteButtons).toHaveCount(2);
    await expect(article.favoriteButtons).toHaveText(['Favorite Article (0)', 'Favorite Article (0)']);
    await expect(article.favoriteButtons.first()).toHaveClass(/btn-outline-primary/);
    await expect(article.favoriteButtons.nth(1)).toHaveClass(/btn-outline-primary/);

    const favorited = waitForApi(page, 'POST', FAVORITE_PATH);
    await article.favoriteButtons.first().click();
    expect((await favorited).status()).toBe(200);

    await expect(article.unfavoriteButtons).toHaveCount(2);
    await expect(article.unfavoriteButtons).toHaveText([
      'Unfavorite Article (1)',
      'Unfavorite Article (1)',
    ]);
    await expect(article.unfavoriteButtons.first()).toHaveClass(/btn-primary/);
    await expect(article.unfavoriteButtons.nth(1)).toHaveClass(/btn-primary/);

    const unfavorited = waitForApi(page, 'DELETE', FAVORITE_PATH);
    await article.unfavoriteButtons.first().click();
    expect((await unfavorited).status()).toBe(200);

    await expect(article.favoriteButtons).toHaveCount(2);
    await expect(article.favoriteButtons).toHaveText(['Favorite Article (0)', 'Favorite Article (0)']);
    await expect(article.favoriteButtons.first()).toHaveClass(/btn-outline-primary/);
    await expect(article.favoriteButtons.nth(1)).toHaveClass(/btn-outline-primary/);
  });

  test('43. favourited posts tab and stale entry after unfavourite [FR-063]', async ({ page }) => {
    const article = new ArticlePage(page);
    const profile = new ProfilePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);

    await article.goto(SEED_ARTICLES.keyboard);
    const favorited = waitForApi(page, 'POST', FAVORITE_PATH);
    await article.favoriteButtons.first().click();
    expect((await favorited).status()).toBe(200);

    await profile.goto('alice', 'favorites');
    const preview = profile.preview(SEED_ARTICLE_TITLES.keyboard);
    await expect(preview.root).toBeVisible();
    await expect(preview.heart).toHaveText('1');

    const unfavorited = waitForApi(page, 'DELETE', FAVORITE_PATH);
    await preview.heart.click();
    expect((await unfavorited).status()).toBe(200);
    // The list is stale until a reload: the entry stays visible, but its heart is outlined again.
    await expect(preview.root).toBeVisible();
    await expect(preview.heart).toHaveText('0');
    await expect(preview.heart).toHaveClass(/btn-outline-primary/);

    await page.reload();
    await expect(profile.preview(SEED_ARTICLE_TITLES.keyboard).root).toHaveCount(0);
  });

  test('44. signed-out favourite leads to sign-up [FR-064]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);

    await home.goto();
    await home.preview('Release notes for testers').heart.click();
    await expect(page).toHaveURL('/register');

    await article.goto(SEED_ARTICLES.flaky);
    await article.favoriteButtons.first().click();
    await expect(page).toHaveURL('/register');
  });
});
