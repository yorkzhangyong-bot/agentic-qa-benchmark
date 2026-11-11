import { test, expect } from '@playwright/test';
import {
  API_ORIGIN,
  expectSeedDataIntact,
  restoreAliceAccount,
  restoreAlicePassword,
  restoreProfile,
  uniqueId,
} from './fixtures/api';
import { signIn } from './fixtures/ui';
import { AuthPage } from './pages/AuthPage';
import { HeaderPage } from './pages/HeaderPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

test.describe('Settings', () => {
  let cleanup: (() => Promise<void>) | undefined;

  test.afterEach(async () => {
    if (cleanup) await cleanup();
    cleanup = undefined;
  });

  test('66. settings fields and current values [FR-018]', async ({ page }) => {
    const settings = new SettingsPage(page);
    await signIn(page);
    await settings.goto();

    await expect(settings.heading).toHaveText('Your Settings');
    await expect(settings.imageInput).toBeVisible();
    await expect(settings.usernameInput).toBeVisible();
    await expect(settings.bioInput).toBeVisible();
    await expect(settings.emailInput).toBeVisible();
    await expect(settings.passwordInput).toBeVisible();
    await expect(settings.updateButton).toBeVisible();
    await expect(settings.logoutButton).toBeVisible();

    await expect(settings.imageInput).toHaveValue(`${API_ORIGIN}/images/demo-avatar.png`);
    await expect(settings.usernameInput).toHaveValue('alice');
    await expect(settings.bioInput).toHaveValue('QA lead. Writes about test strategy and automation.');
    await expect(settings.emailInput).toHaveValue('alice@example.com');
    await expect(settings.passwordInput).toHaveValue('');
  });

  test('67. update bio opens profile with new bio [FR-019, SC-008]', async ({ page }) => {
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);
    const header = new HeaderPage(page);
    const bio = `Updated bio ${uniqueId('qa')}`;
    cleanup = () => restoreProfile('alice');

    await signIn(page);
    await settings.goto();
    await settings.bioInput.fill(bio);
    await settings.update();

    await expect(page).toHaveURL('/profile/alice');
    await expect(profile.bio).toHaveText(bio);
    await expect(header.userLink('alice')).toBeVisible();
  });

  test('68. clear bio and image shows default avatar [FR-020]', async ({ page }) => {
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);
    const header = new HeaderPage(page);
    cleanup = () => restoreProfile('alice');

    await signIn(page);
    await settings.goto();
    await settings.bioInput.fill('');
    await settings.imageInput.fill('');
    await settings.update();

    await expect(page).toHaveURL('/profile/alice');
    await expect(profile.bio).toHaveText('');
    await expect(profile.avatar).toHaveAttribute('src', /\/assets\/default-avatar\.svg$/);
    await expect(header.avatar).toHaveAttribute('src', /\/assets\/default-avatar\.svg$/);
  });

  test('69. update username opens new profile and header [FR-021]', async ({ page }) => {
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);
    const header = new HeaderPage(page);
    const username = `alice-qa-${uniqueId('user')}`;
    cleanup = () => restoreAliceAccount();

    await signIn(page);
    await settings.goto();
    await settings.usernameInput.fill(username);
    await settings.update();

    await expect(page).toHaveURL(`/profile/${username}`);
    await expect(profile.username).toHaveText(username);
    await expect(header.userLink(username)).toBeVisible();
    await expect(profile.followButton).toHaveCount(0);
  });

  test('70. empty new password keeps current password [FR-022]', async ({ page }) => {
    const settings = new SettingsPage(page);
    const header = new HeaderPage(page);

    await signIn(page);
    await settings.goto();
    await expect(settings.passwordInput).toHaveValue('');
    await settings.update();
    await expect(page).toHaveURL('/profile/alice');

    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');

    await signIn(page);
    await expect(header.userLink('alice')).toBeVisible();
  });

  test('71. update password replaces old password [FR-022, SC-008]', async ({ page }) => {
    const settings = new SettingsPage(page);
    const auth = new AuthPage(page);
    const header = new HeaderPage(page);
    cleanup = () => restoreAlicePassword();

    await signIn(page);
    await settings.goto();
    await settings.passwordInput.fill('NewPassword456!');
    await settings.update();
    await expect(page).toHaveURL('/profile/alice');

    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');

    await auth.goto('/login');
    await auth.fillLogin('alice@example.com', 'Password123!');
    await auth.submit();
    await expect(auth.errors).toContainText('credentials invalid');
    await expect(page).toHaveURL('/login');

    await auth.fillLogin('alice@example.com', 'NewPassword456!');
    await auth.submit();
    await expect(page).toHaveURL('/');
    await expect(header.userLink('alice')).toBeVisible();
  });

  test('72. short password shows minimum-length error [FR-023, SC-004]', async ({ page }) => {
    const settings = new SettingsPage(page);

    await signIn(page);
    await settings.goto();
    await settings.passwordInput.fill('short');
    await settings.update();

    await expect(settings.errors).toContainText('password must be at least 8 characters long');
    await expect(page).toHaveURL('/settings');
    await expectSeedDataIntact();
  });

  test('73. settings rejects blank and invalid email [FR-024, SC-004]', async ({ page }) => {
    const settings = new SettingsPage(page);

    await signIn(page);
    await settings.goto();

    await settings.emailInput.fill('');
    await settings.update();
    await expect(settings.errors).toContainText("email can't be blank");
    await expect(page).toHaveURL('/settings');

    await settings.emailInput.fill('not-an-email');
    await settings.update();
    await expect(settings.errors).toContainText('email is invalid');
    await expect(page).toHaveURL('/settings');
    await expectSeedDataIntact();
  });

  test('74. settings rejects spaces-only username [FR-025, SC-004]', async ({ page }) => {
    const settings = new SettingsPage(page);

    await signIn(page);
    await settings.goto();
    await settings.usernameInput.fill('   ');
    await settings.update();

    await expect(settings.errors).toContainText("username can't be blank");
    await expect(page).toHaveURL('/settings');
    await expectSeedDataIntact();
  });

  test('75. settings rejects taken username and email [FR-026, SC-004]', async ({ page }) => {
    const settings = new SettingsPage(page);
    cleanup = () => restoreAliceAccount();

    await signIn(page);
    await settings.goto();

    await settings.usernameInput.fill('bob');
    await settings.update();
    await expect(settings.errors).toContainText('username has already been taken');
    await expect(page).toHaveURL('/settings');

    await settings.usernameInput.fill('alice');
    await settings.emailInput.fill('bob@example.com');
    await settings.update();
    await expect(settings.errors).toContainText('email has already been taken');
    await expect(page).toHaveURL('/settings');
    await expectSeedDataIntact();
  });
});
