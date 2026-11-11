import { test, expect } from '@playwright/test';
import { clearFavorite, withApi } from './fixtures/api';
import { signIn } from './fixtures/ui';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';

const KEYBOARD = 'Keyboard navigation checklist';

test.describe('Favourites', () => {
  test.afterEach(async () => {
    await clearFavorite('alice', KEYBOARD);
  });

  test('52. favourite article updates both counters [FR-062, SC-005]', async ({ page }) => {
    const article = new ArticlePage(page);
    await signIn(page);
    const slug = await withApi(async api => (await api.findArticle(KEYBOARD)).slug);
    await article.goto(slug);

    await expect(article.favoriteButton('top')).toHaveText(/Favorite Article \(0\)/);
    await expect(article.favoriteButton('bottom')).toHaveText(/Favorite Article \(0\)/);

    await article.favoriteButton('top').click();
    await expect(article.favoriteButton('top')).toHaveText(/Unfavorite Article \(1\)/);
    await expect(article.favoriteButton('bottom')).toHaveText(/Unfavorite Article \(1\)/);

    await article.favoriteButton('bottom').click();
    await expect(article.favoriteButton('top')).toHaveText(/Favorite Article \(0\)/);
    await expect(article.favoriteButton('bottom')).toHaveText(/Favorite Article \(0\)/);
  });

  test('53. favourited article appears in favorites tab [FR-063, FR-069, SC-005]', async ({ page }) => {
    const profile = new ProfilePage(page);
    const slug = await withApi(async api => {
      const token = await api.userToken('alice');
      const article = await api.findArticle(KEYBOARD, token);
      await api.favorite(token, article.slug, true);
      return article.slug;
    });
    expect(slug).toBeTruthy();

    await signIn(page);
    await profile.goto('alice');
    await profile.favoritesTab.click();

    await expect(page).toHaveURL('/profile/alice/favorites');
    await expect(profile.activeTab).toHaveText('Favorited Posts');
    await expect(profile.previews.filter({ hasText: KEYBOARD })).toHaveCount(1);
    await expect(profile.previews.getByRole('heading').first()).toHaveText(
      'Rate limiting in Node without Redis',
    );
  });

  test('54. preview heart toggles count and filled state [FR-061, SC-005]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page);
    await home.goto('/?page=2');

    const preview = home.preview(KEYBOARD);
    const heart = preview.getByRole('button');
    await expect(heart).toHaveText('0');
    await expect(heart).toHaveClass(/btn-outline-primary/);

    await heart.click();
    await expect(heart).toHaveText('1');
    await expect(heart).toHaveClass(/btn-primary/);

    await heart.click();
    await expect(heart).toHaveText('0');
    await expect(heart).toHaveClass(/btn-outline-primary/);
  });

  test('55. unfavourite stays in favorites tab until reload [FR-063, SC-005]', async ({ page }) => {
    const profile = new ProfilePage(page);
    await withApi(async api => {
      const token = await api.userToken('alice');
      const article = await api.findArticle(KEYBOARD, token);
      await api.favorite(token, article.slug, true);
    });

    await signIn(page);
    await profile.goto('alice', 'favorites');
    const preview = profile.previews.filter({ hasText: KEYBOARD });
    await expect(preview).toHaveCount(1);
    await expect(preview.getByRole('button')).toHaveText('1');

    await preview.getByRole('button').click();

    await expect(preview).toHaveCount(1);
    await expect(preview.getByRole('button')).toHaveText('0');
    await expect(preview.getByRole('button')).toHaveClass(/btn-outline-primary/);

    await page.reload();
    await expect(profile.previews.filter({ hasText: KEYBOARD })).toHaveCount(0);
  });

  test('56. signed-out favourite redirects to register [FR-064, SC-007]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);

    await home.goto('/');
    const preview = home.preview('Release notes for testers');
    await preview.getByRole('button').click();
    await expect(page).toHaveURL('/register');

    const slug = await withApi(async api => (await api.findArticle('Release notes for testers')).slug);
    await article.goto(slug);
    await expect(article.favoriteButton('top')).toHaveText(/Favorite Article/);
    await article.favoriteButton('top').click();
    await expect(page).toHaveURL('/register');
  });
});
