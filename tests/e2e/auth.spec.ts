import { test, expect } from '@playwright/test';
import { Header } from './pages/Header';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { disposableAccount, signIn, signUp } from './fixtures/auth';
import { waitForApi } from './fixtures/network';
import { SEED_ARTICLES, SEED_PASSWORD, SEED_USERS, uniqueRunId } from './fixtures/seed';

test.describe('Authentication', () => {
  test('4. register form and disabled submit [FR-005]', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();

    await expect(register.heading).toBeVisible();
    await expect(register.haveAccountLink).toHaveAttribute('href', '/login');
    await expect(register.usernameInput).toBeVisible();
    await expect(register.emailInput).toBeVisible();
    await expect(register.passwordInput).toBeVisible();
    await expect(register.signUpButton).toBeDisabled();

    await register.usernameInput.fill('qa-register-form');
    await expect(register.signUpButton).toBeDisabled();
    await register.emailInput.fill('qa.register.form@example.com');
    await expect(register.signUpButton).toBeDisabled();
    await register.passwordInput.fill(SEED_PASSWORD);
    await expect(register.signUpButton).toBeEnabled();
  });

  test('5. signs up a new user and stays signed in after reload [FR-006] [FR-014]', async ({ page }) => {
    const account = disposableAccount('signup');
    const header = new Header(page);
    const home = new HomePage(page);

    await signUp(page, account);
    await expect(home.globalFeedTab).toHaveClass(/active/);
    await expect(header.usernameLink(account.username)).toHaveAttribute('href', `/profile/${account.username}`);

    await page.reload();
    await expect(header.usernameLink(account.username)).toBeVisible();
    await expect(header.signInLink).toHaveCount(0);
  });

  test('6. rejects an invalid email on register and sign-in [FR-007] [FR-013] [FR-073]', async ({ page }) => {
    const runId = uniqueRunId();
    const register = new RegisterPage(page);
    const username = `qa-invalid-email-${runId}`;

    await register.goto();
    await register.usernameInput.fill(username);
    await register.emailInput.fill('not-an-email');
    await register.passwordInput.fill(SEED_PASSWORD);
    // The address is validated in the browser: no request is sent, so assert the error directly.
    await register.signUpButton.click();

    await expect(register.errors).toHaveText(['email is invalid']);
    await expect(page).toHaveURL('/register');
    await expect(register.usernameInput).toHaveValue(username);
    await expect(register.emailInput).toHaveValue('not-an-email');
    await expect(register.passwordInput).toHaveValue(SEED_PASSWORD);
    await expect(new Header(page).signInLink).toBeVisible();

    const login = new LoginPage(page);
    await login.goto();
    await login.emailInput.fill('not-an-email');
    await login.passwordInput.fill(SEED_PASSWORD);
    await login.signInButton.click();

    await expect(page).toHaveURL('/login');
    await expect(login.errors).toHaveText(['email is invalid']);
  });

  test('7. rejects duplicate username and duplicate email at sign-up [FR-008]', async ({ page }) => {
    const runId = uniqueRunId();
    const register = new RegisterPage(page);
    const header = new Header(page);

    await register.goto();
    await register.usernameInput.fill('alice');
    await register.emailInput.fill(`qa.taken-user.${runId}@example.com`);
    await register.passwordInput.fill(SEED_PASSWORD);
    const takenUsername = waitForApi(page, 'POST', '/api/users');
    await register.signUpButton.click();
    expect((await takenUsername).status()).toBe(409);

    await expect(page).toHaveURL('/register');
    await expect(header.signInLink).toBeVisible();
    await expect(register.errors.filter({ hasText: 'username has already been taken' })).toHaveCount(1);

    await register.goto();
    await register.usernameInput.fill(`qa-taken-email-${runId}`);
    await register.emailInput.fill(SEED_USERS.alice.email);
    await register.passwordInput.fill(SEED_PASSWORD);
    const takenEmail = waitForApi(page, 'POST', '/api/users');
    await register.signUpButton.click();
    expect((await takenEmail).status()).toBe(409);

    await expect(page).toHaveURL('/register');
    await expect(header.signInLink).toBeVisible();
    await expect(register.errors.filter({ hasText: 'email has already been taken' })).toHaveCount(1);
  });

  test('8. rejects spaces-only username and password [FR-009]', async ({ page }) => {
    const runId = uniqueRunId();
    const register = new RegisterPage(page);
    const header = new Header(page);

    await register.goto();
    await register.usernameInput.fill('   ');
    await register.emailInput.fill(`qa.spaces-user.${runId}@example.com`);
    await register.passwordInput.fill(SEED_PASSWORD);
    const blankUsername = waitForApi(page, 'POST', '/api/users');
    await register.signUpButton.click();
    expect((await blankUsername).status()).toBe(422);

    await expect(register.errors.filter({ hasText: "username can't be blank" })).toHaveCount(1);
    await expect(page).toHaveURL('/register');
    await expect(register.usernameInput).toHaveValue('   ');
    await expect(header.signInLink).toBeVisible();

    await register.usernameInput.fill(`qa-spaces-pass-${runId}`);
    await register.emailInput.fill(`qa.spaces-pass.${runId}@example.com`);
    await register.passwordInput.fill('   ');
    const blankPassword = waitForApi(page, 'POST', '/api/users');
    await register.signUpButton.click();
    expect((await blankPassword).status()).toBe(422);

    await expect(register.errors.filter({ hasText: "password can't be blank" })).toHaveCount(1);
    await expect(page).toHaveURL('/register');
    await expect(header.signInLink).toBeVisible();
  });

  test('9. signs in with seed credentials [FR-010] [FR-011]', async ({ page }) => {
    const login = new LoginPage(page);
    const header = new Header(page);
    const home = new HomePage(page);
    await login.goto();

    await expect(login.heading).toBeVisible();
    await expect(login.needAccountLink).toHaveAttribute('href', '/register');
    await expect(login.emailInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
    await expect(login.signInButton).toBeDisabled();
    await login.emailInput.fill(SEED_USERS.alice.email);
    await expect(login.signInButton).toBeDisabled();
    await login.passwordInput.fill(SEED_PASSWORD);
    await expect(login.signInButton).toBeEnabled();

    const response = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL('/');
    await expect(home.globalFeedTab).toHaveClass(/active/);
    await expect(header.usernameLink('alice')).toHaveAttribute('href', '/profile/alice');
  });

  test('10. rejects wrong password and unknown email [FR-012]', async ({ page }) => {
    const login = new LoginPage(page);
    const header = new Header(page);

    await login.goto();
    await login.emailInput.fill(SEED_USERS.alice.email);
    await login.passwordInput.fill('WrongPassword1!');
    const wrongPassword = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await wrongPassword).status()).toBe(401);

    await expect(page).toHaveURL('/login');
    await expect(login.errors.filter({ hasText: 'credentials invalid' })).toHaveCount(1);
    await expect(header.signInLink).toBeVisible();

    await login.emailInput.fill('nobody@example.com');
    await login.passwordInput.fill(SEED_PASSWORD);
    const unknownEmail = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await unknownEmail).status()).toBe(401);

    await expect(page).toHaveURL('/login');
    await expect(login.errors.filter({ hasText: 'credentials invalid' })).toHaveCount(1);
    await expect(header.signInLink).toBeVisible();
  });

  test('11. logs out from settings and stays logged out [FR-015]', async ({ page }) => {
    const settings = new SettingsPage(page);
    const header = new Header(page);
    const home = new HomePage(page);

    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await settings.goto();
    await expect(settings.heading).toBeVisible();

    await settings.logout();
    await expect(page).toHaveURL('/');
    await expect(header.signInLink).toBeVisible();
    await expect(header.signUpLink).toBeVisible();
    await expect(header.settingsLink).toHaveCount(0);
    await expect(header.usernameLink('alice')).toHaveCount(0);
    await expect(home.banner).toBeVisible();

    await page.reload();
    await expect(header.signInLink).toBeVisible();
    await expect(header.settingsLink).toHaveCount(0);
  });

  test('12. redirects signed-out visitors to login [FR-017]', async ({ page }) => {
    const login = new LoginPage(page);
    const paths = ['/settings', '/editor', `/editor/${SEED_ARTICLES.flaky}`, '/?feed=following'];

    for (const path of paths) {
      await page.goto(path);
      await expect(page).toHaveURL('/login');
      await expect(login.heading).toBeVisible();
    }
  });
});
