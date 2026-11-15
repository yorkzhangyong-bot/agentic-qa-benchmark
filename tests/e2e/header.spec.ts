import { test, expect } from '@playwright/test';
import { Header } from './pages/Header';
import { HomePage } from './pages/HomePage';
import { SEED_PASSWORD, SEED_USERS } from './fixtures/seed';
import { signIn } from './fixtures/auth';

test.describe('Header and home banner', () => {
  test('1. signed-out header links [FR-001]', async ({ page }) => {
    const header = new Header(page);
    await page.goto('/');

    await expect(header.signInLink).toBeVisible();
    await expect(header.logo).toHaveAttribute('href', '/');
    await expect(header.homeLink).toHaveAttribute('href', '/');
    await expect(header.signInLink).toHaveAttribute('href', '/login');
    await expect(header.signUpLink).toHaveAttribute('href', '/register');

    const hrefs = await header.root
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs).toEqual(['/', '/', '/login', '/register']);

    await expect(header.newArticleLink).toHaveCount(0);
    await expect(header.settingsLink).toHaveCount(0);
  });

  test('2. signed-in header links [FR-002]', async ({ page }) => {
    const header = new Header(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await page.goto('/');

    await expect(header.usernameLink('alice')).toHaveAttribute('href', '/profile/alice');
    await expect(header.newArticleLink).toHaveAttribute('href', '/editor');
    await expect(header.settingsLink).toHaveAttribute('href', '/settings');

    const hrefs = await header.root
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs).toEqual(['/', '/', '/editor', '/settings', '/profile/alice']);

    await expect(header.signInLink).toHaveCount(0);
    await expect(header.signUpLink).toHaveCount(0);
  });

  test('3. banner only for signed-out visitors [FR-003]', async ({ page }) => {
    const home = new HomePage(page);
    await page.goto('/');

    await expect(home.banner).toBeVisible();
    await expect(home.banner).toContainText('This is the Angular frontend demo from the Realworld project.');
    await expect(home.banner.getByRole('img', { name: 'Conduit' })).toBeVisible();

    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await page.goto('/');
    await expect(new Header(page).usernameLink('alice')).toBeVisible();
    await expect(home.banner).toHaveCount(0);
  });
});
