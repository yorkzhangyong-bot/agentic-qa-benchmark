import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { HeaderPage } from './pages/HeaderPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { withApi } from './fixtures/api';
import { signIn } from './fixtures/ui';

const DEFAULT_AVATAR = /\/assets\/default-avatar\.svg$/;

test.describe('Header and home page', () => {
  test('1. signed-out header links and destinations [FR-001, FR-030, SC-007]', async ({ page }) => {
    const header = new HeaderPage(page);
    const home = new HomePage(page);

    await home.goto('/');

    await expect(header.logo).toBeVisible();
    await expect(header.links).toHaveText(['', 'Home', 'Sign in', 'Sign up']);
    await expect(home.yourFeedTab).toHaveCount(0);

    await header.signInLink.click();
    await expect(page).toHaveURL('/login');

    await page.goBack();
    await header.signUpLink.click();
    await expect(page).toHaveURL('/register');

    await page.goBack();
    await header.homeLink.click();
    await expect(page).toHaveURL('/');

    await header.logo.click();
    await expect(page).toHaveURL('/');
  });

  test('2. signed-in header links and destinations [FR-002]', async ({ page }) => {
    const header = new HeaderPage(page);
    await signIn(page);

    await expect(header.links).toHaveText(['', 'Home', 'New Article', 'Settings', 'alice']);
    await expect(header.signInLink).toHaveCount(0);
    await expect(header.signUpLink).toHaveCount(0);

    await header.newArticleLink.click();
    await expect(page).toHaveURL('/editor');

    await header.settingsLink.click();
    await expect(page).toHaveURL('/settings');

    await header.userLink('alice').click();
    await expect(page).toHaveURL('/profile/alice');
  });

  test('3. home banner only when signed out [FR-003]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/');
    await expect(home.banner).toBeVisible();
    await expect(home.banner.getByText('This is the')).toBeVisible();
    await expect(home.banner.getByRole('link', { name: 'Angular frontend' })).toBeVisible();

    await signIn(page);
    await home.goto('/');
    await expect(home.banner).toHaveCount(0);
    await expect(page.getByText('This is the')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Angular frontend' })).toHaveCount(0);
  });

  test('4. default avatar on header, previews, article, comment and profile [FR-004]', async ({ page }) => {
    const header = new HeaderPage(page);
    const home = new HomePage(page);
    const article = new ArticlePage(page);
    const profile = new ProfilePage(page);

    await signIn(page, 'carol@example.com');
    await expect(header.avatar).toHaveAttribute('src', DEFAULT_AVATAR);
    await expect(header.avatar).toBeVisible();

    await home.goto('/?page=2');
    const preview = home.preview('Keyboard navigation checklist');
    await expect(preview).toBeVisible();
    await expect(preview.locator('img').first()).toHaveAttribute('src', DEFAULT_AVATAR);

    const { keyboardSlug, writingSlug } = await withApi(async api => ({
      keyboardSlug: (await api.findArticle('Keyboard navigation checklist')).slug,
      writingSlug: (await api.findArticle('Writing your first end-to-end test')).slug,
    }));

    await article.goto(keyboardSlug);
    await expect(article.title).toHaveText('Keyboard navigation checklist');
    await expect(article.topActions.locator('img').first()).toHaveAttribute('src', DEFAULT_AVATAR);

    await article.goto(writingSlug);
    await expect(article.title).toHaveText('Writing your first end-to-end test');
    const carolComment = article.commentsBy('carol');
    await expect(carolComment).toHaveCount(1);
    await expect(carolComment.locator('img').first()).toHaveAttribute('src', DEFAULT_AVATAR);

    await profile.goto('carol');
    await expect(profile.username).toHaveText('carol');
    await expect(profile.avatar).toHaveAttribute('src', DEFAULT_AVATAR);
    await expect(profile.avatar).toBeVisible();
  });
});
