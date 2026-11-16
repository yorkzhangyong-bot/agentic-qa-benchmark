import { test, expect } from '@playwright/test';
import { HeaderPage } from './pages/HeaderPage';
import { HomePage } from './pages/HomePage';
import { PASSWORD, signInAs } from './fixtures/auth';

test.describe('Header', () => {
  test('1. signed-out header shows the public links [FR-001]', async ({ page }) => {
    const header = new HeaderPage(page);
    await page.goto('/');

    await expect(header.logo).toBeVisible();
    expect(await header.linkTexts()).toEqual(['Home', 'Sign in', 'Sign up']);

    await header.logo.click();
    await expect(page).toHaveURL('/');

    await header.link('Home').click();
    await expect(page).toHaveURL('/');

    await header.link('Sign in').click();
    await expect(page).toHaveURL('/login');

    await page.goBack();
    await expect(page).toHaveURL('/');

    await header.link('Sign up').click();
    await expect(page).toHaveURL('/register');
  });

  test('2. signed-in header shows the member links [FR-002]', async ({ page }) => {
    const header = new HeaderPage(page);
    await signInAs(page, 'alice@example.com', PASSWORD);

    expect(await header.linkTexts()).toEqual(['Home', 'New Article', 'Settings', 'alice']);
    await expect(header.avatar).toBeVisible();
    await expect(header.avatar).toHaveAttribute('src', /demo-avatar\.png$/);
    await expect(header.link('Sign in')).toHaveCount(0);
    await expect(header.link('Sign up')).toHaveCount(0);

    await header.link('New Article').click();
    await expect(page).toHaveURL('/editor');

    await header.link('Settings').click();
    await expect(page).toHaveURL('/settings');

    await header.link('alice').click();
    await expect(page).toHaveURL('/profile/alice');
  });

  test('4. default avatar is used on every surface [FR-004]', async ({ page }) => {
    const header = new HeaderPage(page);
    const home = new HomePage(page);
    const defaultAvatar = /\/assets\/default-avatar\.svg$/;

    await home.goto();
    const carolPreview = home.preview('Angular performance quick wins');
    await expect(carolPreview.authorAvatar).toHaveAttribute('src', defaultAvatar);

    await carolPreview.open();
    await expect(page.getByRole('heading', { name: 'Angular performance quick wins' })).toBeVisible();
    const articleImages = page.locator('.article-meta img');
    await expect(articleImages).toHaveCount(2);
    for (const image of await articleImages.all()) {
      await expect(image).toHaveAttribute('src', defaultAvatar);
    }

    await home.goto();
    await home.preview('What I learned from breaking production').open();
    const carolComment = page.locator('app-article-comment').filter({ hasText: 'carol' });
    await expect(carolComment).toHaveCount(1);
    await expect(carolComment.locator('img')).toHaveAttribute('src', defaultAvatar);

    await home.goto('/?page=2');
    await home.preview('Keyboard navigation checklist').open();
    const daveComment = page.locator('app-article-comment').filter({ hasText: 'dave' });
    await expect(daveComment).toHaveCount(1);
    await expect(daveComment.locator('img')).toHaveAttribute('src', defaultAvatar);

    await page.goto('/profile/erin');
    await expect(page.locator('.user-info img')).toHaveAttribute('src', defaultAvatar);

    await page.goto('/profile/dave');
    await expect(page.locator('.user-info img')).toHaveAttribute('src', defaultAvatar);

    // Seeded users with a picture keep it.
    await home.goto();
    await expect(home.preview('Release notes for testers').authorAvatar).toHaveAttribute('src', /demo-avatar\.png$/);
    await expect(home.preview('Rate limiting in Node without Redis').authorAvatar).toHaveAttribute(
      'src',
      /smiley-cyrus\.jpeg$/,
    );

    await signInAs(page, 'carol@example.com', PASSWORD);
    await expect(header.avatar).toHaveAttribute('src', defaultAvatar);
  });
});
