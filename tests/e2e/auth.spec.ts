import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { HeaderPage } from './pages/HeaderPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { PASSWORD, registerUser, signInAs, throwawayUser, uniqueSuffix } from './fixtures/auth';

test.describe('Accounts and sessions', () => {
  test('18. sign-up form fields and disabled button [FR-005]', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto('/register');

    await expect(auth.heading).toHaveText('Sign up');
    await expect(page.getByRole('link', { name: 'Have an account?' })).toHaveAttribute('href', '/login');
    await expect(auth.usernameInput).toBeVisible();
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();
    await expect(auth.submitButton).toBeDisabled();

    await auth.usernameInput.fill('someone');
    await expect(auth.submitButton).toBeDisabled();

    await auth.emailInput.fill('someone@example.com');
    await expect(auth.submitButton).toBeDisabled();

    await auth.passwordInput.fill(PASSWORD);
    await expect(auth.submitButton).toBeEnabled();
  });

  test('19. signing up signs in and opens the global feed [FR-006]', async ({ page }) => {
    const user = throwawayUser('signup');
    await registerUser(page, user);

    await expect(page).toHaveURL('/');
    const header = new HeaderPage(page);
    await expect(header.link(user.username)).toHaveAttribute('href', `/profile/${user.username}`);
    await expect(header.avatar).toBeVisible();

    const home = new HomePage(page);
    expect(await home.tabNames()).toEqual(['Your Feed', 'Global Feed']);
    await expect(home.activeTab).toHaveText('Global Feed');
    await expect(home.banner).toHaveCount(0);
  });

  test('20. sign-up rejects an invalid email [FR-007]', async ({ page }) => {
    const auth = new AuthPage(page);
    const user = throwawayUser('badmail');
    await auth.goto('/register');
    await auth.usernameInput.fill(user.username);
    await auth.emailInput.fill('not-an-email');
    await auth.passwordInput.fill(PASSWORD);
    await expect(auth.submitButton).toBeEnabled();
    await auth.submitButton.click();

    await expect(auth.errors).toHaveCount(1);
    expect(await auth.errorMessages()).toEqual(['email is invalid']);
    await expect(page).toHaveURL('/register');
    await expect(auth.usernameInput).toHaveValue(user.username);
    await expect(auth.emailInput).toHaveValue('not-an-email');
    await expect(auth.passwordInput).toHaveValue(PASSWORD);

    // No account exists: signing in with the same values does not succeed.
    await auth.goto('/login');
    await auth.login('not-an-email', PASSWORD);
    await expect(page).toHaveURL('/login');
    await expect(auth.heading).toHaveText('Sign in');
    await expect(new HeaderPage(page).link('Sign in')).toBeVisible();
  });

  test('21. sign-up rejects taken username and email [FR-008]', async ({ page }) => {
    const auth = new AuthPage(page);
    const firstEmail = `dup${uniqueSuffix()}@example.com`;

    await auth.goto('/register');
    await auth.usernameInput.fill('alice');
    await auth.emailInput.fill(firstEmail);
    await auth.passwordInput.fill(PASSWORD);
    const takenUsername = page.waitForResponse(r => r.url().endsWith('/api/users') && r.request().method() === 'POST');
    await auth.submitButton.click();
    expect((await takenUsername).status()).toBe(409);
    await expect(page).toHaveURL('/register');
    expect(await auth.errorMessages()).toEqual(['username has already been taken']);

    await auth.goto('/login');
    const noAccount = page.waitForResponse(r => r.url().endsWith('/api/users/login'));
    await auth.login(firstEmail, PASSWORD);
    expect((await noAccount).status()).toBe(401);
    await expect(page).toHaveURL('/login');
    expect(await auth.errorMessages()).toEqual(['credentials invalid']);

    await auth.goto('/register');
    await auth.usernameInput.fill(throwawayUser('dupname').username);
    await auth.emailInput.fill('alice@example.com');
    await auth.passwordInput.fill(PASSWORD);
    const takenEmail = page.waitForResponse(r => r.url().endsWith('/api/users') && r.request().method() === 'POST');
    await auth.submitButton.click();
    expect((await takenEmail).status()).toBe(409);
    await expect(page).toHaveURL('/register');
    expect(await auth.errorMessages()).toEqual(['email has already been taken']);
  });

  test('22. sign-up rejects whitespace-only username and password [FR-009]', async ({ page }) => {
    const auth = new AuthPage(page);
    const firstEmail = `space${uniqueSuffix()}@example.com`;

    await auth.goto('/register');
    await auth.usernameInput.fill('   ');
    await auth.emailInput.fill(firstEmail);
    await auth.passwordInput.fill(PASSWORD);
    await expect(auth.submitButton).toBeEnabled();
    const blankUsername = page.waitForResponse(r => r.url().endsWith('/api/users') && r.request().method() === 'POST');
    await auth.submitButton.click();
    expect((await blankUsername).status()).toBe(422);
    await expect(page).toHaveURL('/register');
    expect(await auth.errorMessages()).toEqual(["username can't be blank"]);
    await expect(auth.emailInput).toHaveValue(firstEmail);
    await expect(auth.passwordInput).toHaveValue(PASSWORD);

    const secondEmail = `space${uniqueSuffix()}@example.com`;
    const secondUsername = throwawayUser('space').username;
    await auth.goto('/register');
    await auth.usernameInput.fill(secondUsername);
    await auth.emailInput.fill(secondEmail);
    await auth.passwordInput.fill('   ');
    await expect(auth.submitButton).toBeEnabled();
    const blankPassword = page.waitForResponse(r => r.url().endsWith('/api/users') && r.request().method() === 'POST');
    await auth.submitButton.click();
    expect((await blankPassword).status()).toBe(422);
    await expect(page).toHaveURL('/register');
    expect(await auth.errorMessages()).toEqual(["password can't be blank"]);
    await expect(auth.usernameInput).toHaveValue(secondUsername);
    await expect(auth.emailInput).toHaveValue(secondEmail);
  });

  test('23. sign-in form fields and disabled button [FR-010]', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto('/login');

    await expect(auth.heading).toHaveText('Sign in');
    await expect(page.getByRole('link', { name: 'Need an account?' })).toHaveAttribute('href', '/register');
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();
    await expect(auth.usernameInput).toHaveCount(0);
    await expect(auth.submitButton).toBeDisabled();

    await auth.emailInput.fill('alice@example.com');
    await expect(auth.submitButton).toBeDisabled();

    await auth.passwordInput.fill(PASSWORD);
    await expect(auth.submitButton).toBeEnabled();
  });

  test('24. signing in with seeded credentials opens the global feed [FR-011]', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto('/login');
    const response = page.waitForResponse(r => r.url().endsWith('/api/users/login'));
    await auth.login('alice@example.com', PASSWORD);
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL('/');
    const home = new HomePage(page);
    await expect(home.activeTab).toHaveText('Global Feed');
    expect(await home.tabNames()).toEqual(['Your Feed', 'Global Feed']);
    await expect(new HeaderPage(page).link('alice')).toHaveAttribute('href', '/profile/alice');
  });

  test('25. wrong password and unknown email show credentials invalid [FR-012]', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto('/login');
    await auth.emailInput.fill('alice@example.com');
    await auth.passwordInput.fill('WrongPass123!');
    const wrongPassword = page.waitForResponse(r => r.url().endsWith('/api/users/login'));
    await auth.submitButton.click();
    expect((await wrongPassword).status()).toBe(401);
    await expect(page).toHaveURL('/login');
    expect(await auth.errorMessages()).toEqual(['credentials invalid']);
    await expect(new HeaderPage(page).link('Sign in')).toBeVisible();

    await auth.goto('/login');
    await auth.emailInput.fill(`nobody-${uniqueSuffix()}@example.com`);
    await auth.passwordInput.fill(PASSWORD);
    const unknownEmail = page.waitForResponse(r => r.url().endsWith('/api/users/login'));
    await auth.submitButton.click();
    expect((await unknownEmail).status()).toBe(401);
    await expect(page).toHaveURL('/login');
    expect(await auth.errorMessages()).toEqual(['credentials invalid']);
    await expect(new HeaderPage(page).link('Sign in')).toBeVisible();
  });

  test('26. invalid email on sign-in shows email is invalid [FR-013]', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto('/login');
    await auth.emailInput.fill('not-an-email');
    await auth.passwordInput.fill(PASSWORD);
    await expect(auth.submitButton).toBeEnabled();
    await auth.submitButton.click();

    await expect(page).toHaveURL('/login');
    expect(await auth.errorMessages()).toEqual(['email is invalid']);
    await expect(auth.emailInput).toHaveValue('not-an-email');
    await expect(auth.passwordInput).toHaveValue(PASSWORD);
  });

  test('27. session survives a reload [FR-014]', async ({ page }) => {
    await signInAs(page, 'alice@example.com', PASSWORD);
    const header = new HeaderPage(page);
    await expect(header.link('alice')).toBeVisible();

    await page.reload();
    await expect(header.link('alice')).toBeVisible();
    await expect(header.link('New Article')).toBeVisible();
    await expect(header.link('Settings')).toBeVisible();

    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');
    const settings = new SettingsPage(page);
    await expect(settings.usernameInput).toHaveValue('alice');
    await expect(settings.emailInput).toHaveValue('alice@example.com');
  });

  test('28. logout returns to the signed-out home page [FR-015]', async ({ page }) => {
    await signInAs(page, 'alice@example.com', PASSWORD);
    const header = new HeaderPage(page);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.logoutButton.click();

    await expect(page).toHaveURL('/');
    expect(await header.linkTexts()).toEqual(['Home', 'Sign in', 'Sign up']);
    await expect(header.link('alice')).toHaveCount(0);
    await expect(new HomePage(page).banner).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL('/');
    expect(await header.linkTexts()).toEqual(['Home', 'Sign in', 'Sign up']);
    await expect(new HomePage(page).banner).toBeVisible();
  });

  test('29. signed-out visitors are redirected from protected pages [FR-017]', async ({ page }) => {
    const auth = new AuthPage(page);
    const settings = new SettingsPage(page);

    await page.goto('/settings');
    await expect(page).toHaveURL('/login');
    await expect(auth.heading).toHaveText('Sign in');
    await expect(settings.imageInput).toHaveCount(0);

    await page.goto('/editor');
    await expect(page).toHaveURL('/login');
    await expect(auth.heading).toHaveText('Sign in');
    await expect(page.getByPlaceholder('Article Title')).toHaveCount(0);

    await page.goto('/editor/Release-notes-for-testers-e3d269ed');
    await expect(page).toHaveURL('/login');
    await expect(auth.heading).toHaveText('Sign in');
    await expect(page.getByPlaceholder('Article Title')).toHaveCount(0);

    await page.goto('/?feed=following');
    await expect(page).toHaveURL('/login');
    await expect(auth.heading).toHaveText('Sign in');
    await expect(new HomePage(page).previews).toHaveCount(0);
  });

  test('30. signed-out visitors can read public pages [SC-007]', async ({ page }) => {
    const home = new HomePage(page);
    const profile = new ProfilePage(page);

    await home.goto();
    await expect(home.previews).toHaveCount(10);
    await expect(page).toHaveURL('/');

    await home.goto('/tag/playwright');
    await expect(home.previews).toHaveCount(3);

    await profile.goto('alice');
    await expect(profile.name).toHaveText('alice');
    await expect(profile.previews).toHaveCount(10);

    await profile.goto('alice', 'favorites');
    await expect(profile.previews).toHaveCount(6);

    await profile.goto('erin');
    await expect(profile.emptyMessage).toHaveText('No articles are here... yet.');

    await profile.goto('erin', 'favorites');
    await expect(profile.previews).toHaveCount(10);

    await home.goto('/?page=2');
    await home.preview('Flaky tests: a field guide').open();
    await expect(page).toHaveURL(/\/article\/Flaky-tests:-a-field-guide-/);
    await expect(page.getByRole('heading', { name: 'Flaky tests: a field guide' })).toBeVisible();
  });
});
