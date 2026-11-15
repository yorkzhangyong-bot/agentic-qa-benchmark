import { test, expect } from '@playwright/test';
import { Header } from './pages/Header';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { disposableAccount, signIn, signOut, signUp } from './fixtures/auth';
import { waitForApi } from './fixtures/network';
import {
  ALICE_AVATAR,
  DEFAULT_AVATAR,
  SEED_PASSWORD,
  SEED_USERS,
  uniqueRunId,
} from './fixtures/seed';

test.describe('Settings', () => {
  test('51. settings prefilled with current values [FR-018]', async ({ page }) => {
    const settings = new SettingsPage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await settings.goto();

    await expect(settings.heading).toBeVisible();
    await expect(settings.pictureInput).toHaveValue('http://localhost:3000/images/demo-avatar.png');
    await expect(settings.usernameInput).toHaveValue('alice');
    await expect(settings.bioInput).toHaveValue('QA lead. Writes about test strategy and automation.');
    await expect(settings.emailInput).toHaveValue('alice@example.com');
    await expect(settings.newPasswordInput).toHaveValue('');
    await expect(settings.updateButton).toBeVisible();
    await expect(settings.logoutButton).toBeVisible();
  });

  test('52. updates the bio [FR-019]', async ({ page }) => {
    const account = disposableAccount('bio');
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);
    const bio = `QA bio ${uniqueRunId()}`;

    await signUp(page, account);
    await settings.goto();
    await settings.bioInput.fill(bio);
    const saved = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await saved).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${account.username}`);
    await expect(profile.bio).toHaveText(bio);
  });

  test('53. clearing bio and picture shows defaults [FR-020]', async ({ page }) => {
    const account = disposableAccount('defaults');
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);
    const header = new Header(page);

    await signUp(page, account);
    await settings.goto();
    await settings.bioInput.fill('QA bio before clearing');
    await settings.pictureInput.fill(ALICE_AVATAR);
    const firstSave = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await firstSave).status()).toBe(200);
    await expect(page).toHaveURL(`/profile/${account.username}`);

    await settings.goto();
    await settings.bioInput.fill('');
    await settings.pictureInput.fill('');
    const secondSave = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await secondSave).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${account.username}`);
    await expect(profile.bio).toBeEmpty();
    await expect(profile.avatar).toHaveAttribute('src', DEFAULT_AVATAR);
    await expect(header.avatar()).toHaveAttribute('src', DEFAULT_AVATAR);
  });

  test('54. changes the username [FR-021]', async ({ page }) => {
    const account = disposableAccount('rename');
    const settings = new SettingsPage(page);
    const header = new Header(page);
    const newUsername = `qa-renamed-${uniqueRunId()}`;

    await signUp(page, account);
    await settings.goto();
    await settings.usernameInput.fill(newUsername);
    const saved = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await saved).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${newUsername}`);
    await expect(header.usernameLink(newUsername)).toBeVisible();
    await expect(header.usernameLink(newUsername)).toHaveAttribute('href', `/profile/${newUsername}`);
  });

  test('55. changes the password [FR-022]', async ({ page }) => {
    const account = disposableAccount('password');
    const settings = new SettingsPage(page);
    const login = new LoginPage(page);
    const header = new Header(page);
    const newPassword = 'NewPassword456!';

    await signUp(page, account);
    await settings.goto();
    await settings.newPasswordInput.fill(newPassword);
    const saved = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await saved).status()).toBe(200);
    await expect(page).toHaveURL(`/profile/${account.username}`);

    await signOut(page);

    await login.goto();
    await login.emailInput.fill(account.email);
    await login.passwordInput.fill(account.password);
    const rejected = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await rejected).status()).toBe(401);
    await expect(page).toHaveURL('/login');
    await expect(login.errors.filter({ hasText: 'credentials invalid' })).toHaveCount(1);

    await login.emailInput.fill(account.email);
    await login.passwordInput.fill(newPassword);
    const accepted = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await accepted).status()).toBe(200);
    await expect(page).toHaveURL('/');
    await expect(header.usernameLink(account.username)).toBeVisible();
  });

  test('56. rejects a too-short password [FR-023]', async ({ page }) => {
    const account = disposableAccount('shortpass');
    const settings = new SettingsPage(page);
    const header = new Header(page);
    const login = new LoginPage(page);

    await signUp(page, account);
    await settings.goto();
    await settings.newPasswordInput.fill('short');
    const rejected = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await rejected).status()).toBe(422);

    await expect(page).toHaveURL('/settings');
    await expect(
      settings.errors.filter({ hasText: 'password must be at least 8 characters long' }),
    ).toHaveCount(1);

    await signOut(page);
    await login.goto();
    await login.emailInput.fill(account.email);
    await login.passwordInput.fill(account.password);
    const accepted = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await accepted).status()).toBe(200);
    await expect(page).toHaveURL('/');
    await expect(header.usernameLink(account.username)).toBeVisible();
  });

  test('57. validates settings email and username [FR-024] [FR-025]', async ({ page }) => {
    const account = disposableAccount('validate');
    const settings = new SettingsPage(page);
    const login = new LoginPage(page);
    const header = new Header(page);

    await signUp(page, account);
    await settings.goto();

    await settings.emailInput.fill('');
    const blankEmail = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await blankEmail).status()).toBe(422);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors.filter({ hasText: "email can't be blank" })).toHaveCount(1);

    await settings.emailInput.fill('not-an-email');
    const invalidEmail = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await invalidEmail).status()).toBe(422);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors.filter({ hasText: 'email is invalid' })).toHaveCount(1);

    await settings.emailInput.fill(account.email);
    await settings.usernameInput.fill('   ');
    const blankUsername = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await blankUsername).status()).toBe(422);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors.filter({ hasText: "username can't be blank" })).toHaveCount(1);

    await signOut(page);
    await login.goto();
    await login.emailInput.fill(account.email);
    await login.passwordInput.fill(account.password);
    const accepted = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await accepted).status()).toBe(200);
    await expect(page).toHaveURL('/');
    await expect(header.usernameLink(account.username)).toBeVisible();
  });

  test('58. rejects taken settings values [FR-026]', async ({ page }) => {
    const account = disposableAccount('duplicate');
    const settings = new SettingsPage(page);
    const login = new LoginPage(page);
    const header = new Header(page);

    await signUp(page, account);
    await settings.goto();

    await settings.usernameInput.fill('bob');
    const takenUsername = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await takenUsername).status()).toBe(409);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors.filter({ hasText: 'username has already been taken' })).toHaveCount(1);

    await settings.usernameInput.fill(account.username);
    await settings.emailInput.fill(SEED_USERS.bob.email);
    const takenEmail = waitForApi(page, 'PUT', '/api/user');
    await settings.updateButton.click();
    expect((await takenEmail).status()).toBe(409);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors.filter({ hasText: 'email has already been taken' })).toHaveCount(1);

    await signOut(page);
    await login.goto();
    await login.emailInput.fill(account.email);
    await login.passwordInput.fill(account.password);
    const accepted = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await accepted).status()).toBe(200);
    await expect(page).toHaveURL('/');
    await expect(header.usernameLink(account.username)).toBeVisible();
  });
});
