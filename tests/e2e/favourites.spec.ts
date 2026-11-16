import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { registerUser, throwawayUser } from './fixtures/auth';

const ARTICLE = 'Keyboard navigation checklist';

async function openArticleFromFeed(page: import('@playwright/test').Page): Promise<ArticlePage> {
  const home = new HomePage(page);
  await home.goto('/?page=2');
  await home.preview(ARTICLE).open();
  const article = new ArticlePage(page);
  await expect(article.heading).toHaveText(ARTICLE);
  return article;
}

test.describe('Favourites', () => {
  test('61. preview heart toggles and updates the count [FR-061]', async ({ page }) => {
    const user = throwawayUser('previewfav');
    await registerUser(page, user);
    const home = new HomePage(page);
    await home.goto('/?page=2');

    const preview = home.preview(ARTICLE);
    await expect(preview.favoriteButton).toHaveClass(/btn-outline-primary/);
    await expect(preview.favoriteButton).toHaveText(/0/);

    const favourited = page.waitForResponse(r => r.url().endsWith('/favorite') && r.request().method() === 'POST');
    await preview.favoriteButton.click();
    expect((await favourited).status()).toBe(200);
    await expect(preview.favoriteButton).toHaveClass(/btn-primary/);
    await expect(preview.favoriteButton).not.toHaveClass(/btn-outline-primary/);
    await expect(preview.favoriteButton).toHaveText(/1/);

    const unfavourited = page.waitForResponse(r => r.url().endsWith('/favorite') && r.request().method() === 'DELETE');
    await preview.favoriteButton.click();
    expect((await unfavourited).status()).toBe(200);
    await expect(preview.favoriteButton).toHaveClass(/btn-outline-primary/);
    await expect(preview.favoriteButton).toHaveText(/0/);
  });

  test('62. favorite article toggles both controls and agrees with feed [FR-062]', async ({ page }) => {
    const user = throwawayUser('articlefav');
    await registerUser(page, user);
    const article = await openArticleFromFeed(page);

    await expect(article.favoriteButtons).toHaveCount(2);
    for (const button of await article.favoriteButtons.all()) {
      await expect(button).toHaveText(/Favorite Article \(0\)/);
    }

    const favourited = page.waitForResponse(r => r.url().endsWith('/favorite') && r.request().method() === 'POST');
    await article.favoriteButtons.first().click();
    await expect(article.unfavoriteButtons).toHaveCount(2);
    for (const button of await article.unfavoriteButtons.all()) {
      await expect(button).toHaveText(/Unfavorite Article \(1\)/);
    }

    const home = new HomePage(page);
    await home.goto('/?page=2');
    await expect(home.preview(ARTICLE).favoriteButton).toHaveClass(/btn-primary/);
    await expect(home.preview(ARTICLE).favoriteButton).toHaveText(/1/);

    await home.preview(ARTICLE).open();
    await expect(page.getByRole('heading', { name: ARTICLE })).toBeVisible();
    const unfavourited = page.waitForResponse(r => r.url().endsWith('/favorite') && r.request().method() === 'DELETE');
    // Both toolbar copies are identical; click the one below the body (the second copy).
    await article.unfavoriteButtons.last().click();
    await expect(article.favoriteButtons).toHaveCount(2);
    for (const button of await article.favoriteButtons.all()) {
      await expect(button).toHaveText(/Favorite Article \(0\)/);
    }

    await home.goto('/?page=2');
    await expect(home.preview(ARTICLE).favoriteButton).toHaveClass(/btn-outline-primary/);
    await expect(home.preview(ARTICLE).favoriteButton).toHaveText(/0/);
  });

  test('63. favorited posts keeps an unfavourited article until reload [FR-063]', async ({ page }) => {
    const user = throwawayUser('favoriteslist');
    await registerUser(page, user);
    const home = new HomePage(page);
    await home.goto('/?page=2');
    const favourited = page.waitForResponse(r => r.url().endsWith('/favorite') && r.request().method() === 'POST');
    await home.preview(ARTICLE).favoriteButton.click();
    expect((await favourited).status()).toBe(200);

    const profile = new ProfilePage(page);
    await profile.goto(user.username, 'favorites');
    const listed = profile.preview(ARTICLE);
    await expect(listed.root).toHaveCount(1);
    await expect(listed.favoriteButton).toHaveClass(/btn-primary/);
    await expect(listed.favoriteButton).toHaveText(/1/);

    const unfavourited = page.waitForResponse(r => r.url().endsWith('/favorite') && r.request().method() === 'DELETE');
    await listed.favoriteButton.click();
    expect((await unfavourited).status()).toBe(200);
    await expect(profile.preview(ARTICLE).root).toHaveCount(1);
    await expect(profile.preview(ARTICLE).favoriteButton).toHaveClass(/btn-outline-primary/);
    await expect(profile.preview(ARTICLE).favoriteButton).toHaveText(/0/);

    await page.reload();
    await expect(profile.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(profile.pageItems).toHaveCount(0);
  });

  test('64. signed-out favourite goes to sign-up [FR-064]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/?page=2');
    await home.preview(ARTICLE).favoriteButton.click();
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign up');

    await home.goto('/?page=2');
    await home.preview(ARTICLE).open();
    const article = new ArticlePage(page);
    await expect(article.favoriteButtons).toHaveCount(2);
    await article.favoriteButtons.first().click();
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign up');

    await home.goto('/?page=2');
    await home.preview(ARTICLE).open();
    await expect(article.favoriteButtons).toHaveCount(2);
    for (const button of await article.favoriteButtons.all()) {
      await expect(button).toHaveText(/Favorite Article \(0\)/);
    }
  });
});
