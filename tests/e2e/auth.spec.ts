import { test, expect } from '@playwright/test';
import { ApiClient, SEED_PASSWORD, expectSeedDataIntact, uniqueId, withApi } from './fixtures/api';
import { signIn, signOut } from './fixtures/ui';
import { AuthPage } from './pages/AuthPage';
import { HeaderPage } from './pages/HeaderPage';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';

test.describe('Authentication', () => {
  test('15. sign-up page fields and disabled button [FR-005]', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto('/register');

    await expect(auth.heading).toHaveText('Sign up');
    await expect(auth.haveAccountLink).toHaveAttribute('href', '/login');
    await expect(auth.usernameInput).toBeVisible();
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();

    await expect(auth.submitButton).toBeDisabled();
    await auth.usernameInput.fill('someone');
    await expect(auth.submitButton).toBeDisabled();
    await auth.emailInput.fill('someone@example.com');
    await expect(auth.submitButton).toBeDisabled();
    await auth.passwordInput.fill(SEED_PASSWORD);
    await expect(auth.submitButton).toBeEnabled();
  });

  test('16. sign-in page fields and disabled button [FR-010]', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto('/login');

    await expect(auth.heading).toHaveText('Sign in');
    await expect(auth.needAccountLink).toHaveAttribute('href', '/register');
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();

    await expect(auth.submitButton).toBeDisabled();
    await auth.emailInput.fill('alice@example.com');
    await expect(auth.submitButton).toBeDisabled();
    await auth.passwordInput.fill(SEED_PASSWORD);
    await expect(auth.submitButton).toBeEnabled();
  });

  test('17. sign-up lands on global feed with username in header [FR-006, SC-003]', async ({ page }) => {
    const auth = new AuthPage(page);
    const header = new HeaderPage(page);
    const home = new HomePage(page);
    const username = uniqueId('qa-signup');
    const email = `${username}@example.com`;

    await auth.goto('/register');
    await auth.fillRegistration(username, email, SEED_PASSWORD);
    await auth.submit();

    await expect(page).toHaveURL('/');
    await expect(home.activeTab).toHaveText('Global Feed');
    await expect(header.userLink(username)).toBeVisible();
    await expect(header.signInLink).toHaveCount(0);
    await expect(header.signUpLink).toHaveCount(0);
  });

  test('18. sign-up rejects invalid email and keeps values [FR-007, FR-073, SC-004]', async ({ page }) => {
    const auth = new AuthPage(page);
    const header = new HeaderPage(page);
    const username = uniqueId('qa-bademail');
    const email = 'not-an-email';

    await auth.goto('/register');
    await auth.fillRegistration(username, email, SEED_PASSWORD);
    await auth.submit();

    await expect(auth.errors).toContainText('email is invalid');
    await expect(page).toHaveURL('/register');
    await expect(auth.usernameInput).toHaveValue(username);
    await expect(auth.emailInput).toHaveValue(email);
    await expect(auth.passwordInput).toHaveValue(SEED_PASSWORD);

    await page.reload();
    await expect(header.signInLink).toBeVisible();
    await expect(header.signUpLink).toBeVisible();
    await expectSeedDataIntact();
  });

  test('19. sign-up rejects taken username [FR-008, SC-004]', async ({ page }) => {
    const auth = new AuthPage(page);
    const email = `${uniqueId('qa-taken-username')}@example.com`;

    await auth.goto('/register');
    await auth.fillRegistration('alice', email, SEED_PASSWORD);
    await auth.submit();

    await expect(auth.errors).toContainText('username has already been taken');
    await expect(page).toHaveURL('/register');

    await auth.goto('/login');
    await auth.fillLogin(email, SEED_PASSWORD);
    await auth.submit();
    await expect(auth.errors).toContainText('credentials invalid');
    await expect(page).toHaveURL('/login');
    await expectSeedDataIntact();
  });

  test('20. sign-up rejects taken email [FR-008, SC-004]', async ({ page }) => {
    const auth = new AuthPage(page);
    const header = new HeaderPage(page);
    const username = uniqueId('qa-taken-email');

    await auth.goto('/register');
    await auth.fillRegistration(username, 'alice@example.com', SEED_PASSWORD);
    await auth.submit();

    await expect(auth.errors).toContainText('email has already been taken');
    await expect(page).toHaveURL('/register');
    await expect(auth.usernameInput).toHaveValue(username);
    await expect(header.signInLink).toBeVisible();

    await withApi(async api => {
      expect(await api.profileStatus(username)).toBe(404);
    });
    await expectSeedDataIntact();
  });

  test('21. sign-up rejects spaces-only username and password [FR-009, SC-004]', async ({ page }) => {
    const auth = new AuthPage(page);
    const email = `${uniqueId('qa-spaces')}@example.com`;

    await auth.goto('/register');
    await auth.fillRegistration('   ', email, '   ');
    await expect(auth.submitButton).toBeEnabled();
    await auth.submit();

    await expect(auth.errors).toContainText("username can't be blank");
    await expect(auth.errors).toContainText("password can't be blank");
    await expect(page).toHaveURL('/register');
    await expectSeedDataIntact();
  });

  test('22. alice signs in with valid credentials [FR-011, SC-002]', async ({ page }) => {
    const header = new HeaderPage(page);
    const home = new HomePage(page);

    await signIn(page);

    await expect(page).toHaveURL('/');
    await expect(home.activeTab).toHaveText('Global Feed');
    await expect(header.userLink('alice')).toBeVisible();
    await expect(header.signInLink).toHaveCount(0);
    await expect(header.signUpLink).toHaveCount(0);
  });

  test('23. wrong password shows credentials invalid [FR-012, SC-004]', async ({ page }) => {
    const auth = new AuthPage(page);
    const header = new HeaderPage(page);

    await auth.goto('/login');
    await auth.fillLogin('alice@example.com', 'wrong-password');
    await auth.submit();

    await expect(auth.errors).toContainText('credentials invalid');
    await expect(page).toHaveURL('/login');
    await expect(auth.emailInput).toHaveValue('alice@example.com');
    await expect(header.signInLink).toBeVisible();
    await expectSeedDataIntact();
  });

  test('24. unknown email shows credentials invalid [FR-012, SC-004]', async ({ page }) => {
    const auth = new AuthPage(page);
    const email = `${uniqueId('nobody')}@example.com`;

    await auth.goto('/login');
    await auth.fillLogin(email, SEED_PASSWORD);
    await auth.submit();

    await expect(auth.errors).toContainText('credentials invalid');
    await expect(page).toHaveURL('/login');
    await expectSeedDataIntact();
  });

  test('25. invalid sign-in email shows email is invalid [FR-013, SC-004]', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.goto('/login');
    await auth.fillLogin('not-an-email', SEED_PASSWORD);
    await auth.submit();

    await expect(auth.errors).toContainText('email is invalid');
    await expect(page).toHaveURL('/login');
    await expectSeedDataIntact();
  });

  test('26. session survives reload [FR-014]', async ({ page }) => {
    const header = new HeaderPage(page);
    await signIn(page);

    await page.goto('/');
    await page.reload();

    await expect(header.userLink('alice')).toBeVisible();
    await expect(header.newArticleLink).toBeVisible();
    await expect(header.signInLink).toHaveCount(0);
  });

  test('27. logout from settings signs out and shows banner [FR-001, FR-003, FR-015]', async ({ page }) => {
    const header = new HeaderPage(page);
    const home = new HomePage(page);
    const settings = new SettingsPage(page);

    await signIn(page);
    await settings.goto();
    await settings.logoutButton.click();

    await expect(page).toHaveURL('/');
    await expect(header.links).toHaveText(['', 'Home', 'Sign in', 'Sign up']);
    await expect(home.banner).toBeVisible();

    await page.reload();
    await expect(header.signInLink).toBeVisible();
    await expect(header.userLink('alice')).toHaveCount(0);
    await expect(home.banner).toBeVisible();
  });

  test('28. protected routes redirect to login [FR-017, SC-007]', async ({ page }) => {
    const slug = await withApi(async (api: ApiClient) => (await api.findArticle('Flaky tests: a field guide')).slug);

    await page.goto('/settings');
    await expect(page).toHaveURL('/login');

    await page.goto('/editor');
    await expect(page).toHaveURL('/login');

    await page.goto(`/editor/${slug}`);
    await expect(page).toHaveURL('/login');

    await page.goto('/?feed=following');
    await expect(page).toHaveURL('/login');
  });

  test('29. every seed account signs in and sees its feed count [FR-031, FR-032, SC-002]', async ({ page }) => {
    const header = new HeaderPage(page);
    const home = new HomePage(page);
    const settings = new SettingsPage(page);

    const accounts = [
      { username: 'alice', total: 10, pages: ['1'] },
      { username: 'bob', total: 12, pages: ['1', '2'] },
      { username: 'carol', total: 18, pages: ['1', '2'] },
      { username: 'dave', total: 22, pages: ['1', '2', '3'] },
      { username: 'erin', total: 0, pages: [] as string[] },
    ];

    for (const account of accounts) {
      await signIn(page, `${account.username}@example.com`);
      await expect(header.userLink(account.username)).toBeVisible();

      await home.yourFeedTab.click();

      if (account.username === 'erin') {
        await expect(home.emptyMessage).toContainText(
          'Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!',
        );
        await expect(home.previews).toHaveCount(0);
        await expect(home.pageButtons).toHaveCount(0);
      } else {
        // The feed lists at most 10 articles per page; the page buttons reflect the total.
        await expect(home.previews).toHaveCount(Math.min(account.total, 10));
        await expect(home.pageButtons).toHaveText(account.pages);
      }

      await settings.goto();
      await settings.logoutButton.click();
      await expect(page).toHaveURL('/');
    }
  });
});
