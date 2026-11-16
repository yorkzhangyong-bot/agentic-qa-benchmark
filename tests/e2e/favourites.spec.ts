import { test, expect } from './support/fixtures';
import { signInWithToken, unfavoriteArticle } from './support/api';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';

const FLAKY_SLUG = 'Flaky-tests:-a-field-guide-45af9838';
const KEYBOARD_SLUG = 'Keyboard-navigation-checklist-7459b474';
const RELEASE_NOTES_SLUG = 'Release-notes-for-testers-e3d269ed';
const KEYBOARD_TITLE = 'Keyboard navigation checklist';
const RELEASE_NOTES_TITLE = 'Release notes for testers';

test.describe('Favourites', () => {
  /** Covers FR-062, AC5.1, SC-005 */
  test('44. favouriting on the article page changes both buttons and the feed count [FR-062, SC-005]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const home = new HomePage(page);

    const token = await signInWithToken(page, request, 'alice@example.com', `/article/${KEYBOARD_SLUG}`);
    await expect(article.favoriteButtons).toHaveCount(2);
    await expect(article.favoriteButtons.first()).toHaveText('Favorite Article (0)');
    await expect(article.favoriteButtons.last()).toHaveText('Favorite Article (0)');

    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${KEYBOARD_SLUG}/favorite`) && res.request().method() === 'POST',
    );
    await article.favoriteButtons.first().click();
    expect((await response).status()).toBe(200);
    cleanup.add(() => unfavoriteArticle(request, token, KEYBOARD_SLUG));

    await expect(article.favoriteButtons).toHaveCount(2);
    await expect(article.favoriteButtons.first()).toHaveText('Unfavorite Article (1)');
    await expect(article.favoriteButtons.last()).toHaveText('Unfavorite Article (1)');
    await expect(article.favoriteButtons.first()).toHaveClass(/btn-primary/);
    await expect(article.favoriteButtons.last()).toHaveClass(/btn-primary/);

    await home.goto('/?page=2');
    await expect(home.previews).toHaveCount(10);
    await expect(home.previewHeart(KEYBOARD_TITLE)).toHaveText('1');
    await expect(home.previewHeart(KEYBOARD_TITLE)).toHaveClass(/btn-primary/);

    await article.goto(KEYBOARD_SLUG);
    await expect(article.favoriteButtons.first()).toHaveText('Unfavorite Article (1)');
    const unfavoriteResponse = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${KEYBOARD_SLUG}/favorite`) && res.request().method() === 'DELETE',
    );
    await article.favoriteButtons.first().click();
    expect((await unfavoriteResponse).status()).toBe(200);

    await expect(article.favoriteButtons).toHaveCount(2);
    await expect(article.favoriteButtons.first()).toHaveText('Favorite Article (0)');
    await expect(article.favoriteButtons.last()).toHaveText('Favorite Article (0)');

    await home.goto('/?page=2');
    await expect(home.previewHeart(KEYBOARD_TITLE)).toHaveText('0');
    await expect(home.previewHeart(KEYBOARD_TITLE)).toHaveClass(/btn-outline-primary/);
  });

  /** Covers FR-061 */
  test('45. a preview heart toggles between outlined and filled and changes its count [FR-061]', async ({
    page,
    request,
    cleanup,
  }) => {
    const home = new HomePage(page);
    const otherPreviewTitle = 'Exploratory testing sessions that actually find bugs';

    const token = await signInWithToken(page, request, 'alice@example.com', '/');
    await expect(home.previews).toHaveCount(10);

    const heart = home.previewHeart(RELEASE_NOTES_TITLE);
    await expect(heart).toHaveText('0');
    await expect(heart).toHaveClass(/btn-outline-primary/);
    await expect(home.previewHeart(otherPreviewTitle)).toHaveText('3');

    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${RELEASE_NOTES_SLUG}/favorite`) && res.request().method() === 'POST',
    );
    await heart.click();
    expect((await response).status()).toBe(200);
    cleanup.add(() => unfavoriteArticle(request, token, RELEASE_NOTES_SLUG));

    await expect(heart).toHaveText('1');
    await expect(heart).toHaveClass(/btn-primary/);
    await expect(home.previewHeart(otherPreviewTitle)).toHaveText('3');

    const unfavoriteResponse = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${RELEASE_NOTES_SLUG}/favorite`) && res.request().method() === 'DELETE',
    );
    await heart.click();
    expect((await unfavoriteResponse).status()).toBe(200);

    await expect(heart).toHaveText('0');
    await expect(heart).toHaveClass(/btn-outline-primary/);
    await expect(home.previewHeart(otherPreviewTitle)).toHaveText('3');
  });

  /** Covers FR-063, AC5.2, SC-005 (documented edge case) */
  test('46. favorited posts lists the article and unfavouriting there keeps it until a reload [FR-063, SC-005]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const profile = new ProfilePage(page);
    const home = new HomePage(page);

    const token = await signInWithToken(page, request, 'alice@example.com', `/article/${KEYBOARD_SLUG}`);
    await expect(article.favoriteButtons.first()).toHaveText('Favorite Article (0)');
    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${KEYBOARD_SLUG}/favorite`) && res.request().method() === 'POST',
    );
    await article.favoriteButtons.first().click();
    expect((await response).status()).toBe(200);
    cleanup.add(() => unfavoriteArticle(request, token, KEYBOARD_SLUG));

    await profile.goto('alice', '/favorites');
    await expect(page).toHaveURL('/profile/alice/favorites');
    await expect(profile.favoritedTab).toHaveClass(/active/);
    await expect(profile.myPostsTab).not.toHaveClass(/active/);
    await expect(profile.previews).toHaveCount(7);
    expect(await profile.previews.getByRole('heading', { level: 1 }).allTextContents()).toEqual([
      'Rate limiting in Node without Redis',
      'What I learned from breaking production',
      KEYBOARD_TITLE,
      'Indexes, explained without the jargon',
      'Signals in Angular, explained with a shopping cart',
      'Accessible forms in Angular',
      'SQLite is enough for most side projects',
    ]);

    const heart = profile.previewHeart(KEYBOARD_TITLE);
    await expect(heart).toHaveText('1');
    const unfavoriteResponse = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${KEYBOARD_SLUG}/favorite`) && res.request().method() === 'DELETE',
    );
    await heart.click();
    expect((await unfavoriteResponse).status()).toBe(200);

    await expect(profile.preview(KEYBOARD_TITLE)).toBeVisible();
    await expect(profile.previewHeart(KEYBOARD_TITLE)).toHaveText('0');
    await expect(profile.previewHeart(KEYBOARD_TITLE)).toHaveClass(/btn-outline-primary/);

    await page.reload();
    await expect(profile.previews).toHaveCount(6);
    await expect(profile.preview(KEYBOARD_TITLE)).toHaveCount(0);

    await home.goto('/?page=2');
    await expect(home.previewHeart(KEYBOARD_TITLE)).toHaveText('0');
    await article.goto(KEYBOARD_SLUG);
    await expect(article.favoriteButtons.first()).toHaveText('Favorite Article (0)');
  });

  /** Covers FR-064, AC5.3, SC-007 */
  test('47. signed-out favourite clicks send the visitor to register [FR-064, SC-007]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);
    const register = new RegisterPage(page);

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    await home.previewHeart(RELEASE_NOTES_TITLE).click();
    await expect(page).toHaveURL('/register');
    await expect(register.heading).toBeVisible();

    await home.goto('/');
    await expect(home.previewHeart(RELEASE_NOTES_TITLE)).toHaveText('0');

    await article.goto(FLAKY_SLUG);
    await expect(article.favoriteButtons.first()).toHaveText('Favorite Article (4)');
    await article.favoriteButtons.first().click();
    await expect(page).toHaveURL('/register');
    await expect(register.heading).toBeVisible();

    await article.goto(FLAKY_SLUG);
    await expect(article.favoriteButtons.first()).toHaveText('Favorite Article (4)');
  });
});
