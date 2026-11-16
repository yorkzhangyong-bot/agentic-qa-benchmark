import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { HeaderPage } from './pages/HeaderPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { PASSWORD, registerUser, signInAs, throwawayUser, uniqueSuffix } from './fixtures/auth';

const SMILEY = 'http://localhost:3000/images/smiley-cyrus.jpeg';
const DEFAULT_AVATAR = /\/assets\/default-avatar\.svg$/;

test.describe('Settings', () => {
  test('31. settings shows current values [FR-018]', async ({ page }) => {
    const settings = new SettingsPage(page);
    await signInAs(page, 'alice@example.com', PASSWORD);
    await settings.goto();

    await expect(settings.heading).toHaveText('Your Settings');
    await expect(settings.imageInput).toHaveValue('http://localhost:3000/images/demo-avatar.png');
    await expect(settings.usernameInput).toHaveValue('alice');
    await expect(settings.bioInput).toHaveValue('QA lead. Writes about test strategy and automation.');
    await expect(settings.emailInput).toHaveValue('alice@example.com');
    await expect(settings.passwordInput).toHaveValue('');
    await expect(settings.updateButton).toBeVisible();
    await expect(settings.logoutButton).toHaveText('Or click here to logout.');
  });

  test('32. saving bio and picture shows them on the profile [FR-019]', async ({ page }) => {
    const user = throwawayUser('bio');
    const bio = `Updated bio ${uniqueSuffix()}`;
    await registerUser(page, user);

    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.bioInput.fill(bio);
    await settings.imageInput.fill(SMILEY);
    const response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${user.username}`);
    const profile = new ProfilePage(page);
    await expect(profile.name).toHaveText(user.username);
    await expect(profile.bio).toHaveText(bio);
    await expect(profile.avatar).toHaveAttribute('src', SMILEY);
    await expect(new HeaderPage(page).avatar).toHaveAttribute('src', SMILEY);

    await settings.goto();
    await expect(settings.usernameInput).toHaveValue(user.username);
    await expect(settings.emailInput).toHaveValue(user.email);
  });

  test('33. emptying bio and picture removes them [FR-020]', async ({ page }) => {
    const user = throwawayUser('emptybio');
    await registerUser(page, user);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.bioInput.fill('Temporary bio');
    await settings.imageInput.fill(SMILEY);
    let response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(200);

    const profile = new ProfilePage(page);
    await expect(profile.bio).toHaveText('Temporary bio');
    await expect(profile.avatar).toHaveAttribute('src', SMILEY);

    await settings.goto();
    await settings.bioInput.fill('');
    await settings.imageInput.fill('');
    response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${user.username}`);
    await expect(profile.name).toHaveText(user.username);
    await expect(profile.bio).toHaveText('');
    await expect(profile.avatar).toHaveAttribute('src', DEFAULT_AVATAR);
    await expect(new HeaderPage(page).avatar).toHaveAttribute('src', DEFAULT_AVATAR);

    await settings.goto();
    await expect(settings.usernameInput).toHaveValue(user.username);
    await expect(settings.emailInput).toHaveValue(user.email);
  });

  test('34. changing the username updates profile and header [FR-021]', async ({ page }) => {
    const user = throwawayUser('rename');
    const newName = `renamed${uniqueSuffix()}`;
    await registerUser(page, user);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.usernameInput.fill(newName);
    const response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${newName}`);
    const profile = new ProfilePage(page);
    await expect(profile.name).toHaveText(newName);
    await expect(new HeaderPage(page).link(newName)).toHaveAttribute('href', `/profile/${newName}`);

    await settings.goto();
    await expect(settings.usernameInput).toHaveValue(newName);
    await expect(settings.emailInput).toHaveValue(user.email);
    await expect(settings.bioInput).toHaveValue('');
  });

  test('35. changing the password replaces it [FR-022]', async ({ page }) => {
    const user = throwawayUser('pass');
    const newPassword = 'Abcdef12';
    await registerUser(page, user);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.passwordInput.fill(newPassword);
    const updated = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await updated).status()).toBe(200);
    await expect(page).toHaveURL(`/profile/${user.username}`);

    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');

    const auth = new AuthPage(page);
    await auth.goto('/login');
    await auth.emailInput.fill(user.email);
    await auth.passwordInput.fill(PASSWORD);
    const oldPassword = page.waitForResponse(r => r.url().endsWith('/api/users/login'));
    await auth.submitButton.click();
    expect((await oldPassword).status()).toBe(401);
    await expect(page).toHaveURL('/login');
    expect(await auth.errorMessages()).toEqual(['credentials invalid']);

    await auth.passwordInput.fill(newPassword);
    const newCredentials = page.waitForResponse(r => r.url().endsWith('/api/users/login'));
    await auth.submitButton.click();
    expect((await newCredentials).status()).toBe(200);
    await expect(page).toHaveURL('/');
    await expect(new HeaderPage(page).link(user.username)).toBeVisible();
  });

  test('36. empty new password keeps the current password [FR-022]', async ({ page }) => {
    const user = throwawayUser('keep');
    await registerUser(page, user);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.bioInput.fill('Kept password bio');
    await expect(settings.passwordInput).toHaveValue('');
    const updated = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await updated).status()).toBe(200);
    await expect(page).toHaveURL(`/profile/${user.username}`);
    await expect(new ProfilePage(page).bio).toHaveText('Kept password bio');

    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');

    await signInAs(page, user.email, PASSWORD);
    await expect(new HeaderPage(page).link(user.username)).toBeVisible();
  });

  test('37. short password is rejected [FR-023]', async ({ page }) => {
    const user = throwawayUser('short');
    await registerUser(page, user);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.passwordInput.fill('short');
    const response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(422);

    await expect(page).toHaveURL('/settings');
    expect(await settings.errorMessages()).toEqual(['password must be at least 8 characters long']);
    await expect(settings.usernameInput).toHaveValue(user.username);
    await expect(settings.emailInput).toHaveValue(user.email);

    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');
    await signInAs(page, user.email, PASSWORD);
    await expect(new HeaderPage(page).link(user.username)).toBeVisible();
  });

  test('38. settings rejects empty and invalid email [FR-024][FR-073]', async ({ page }) => {
    const user = throwawayUser('mail');
    await registerUser(page, user);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.emailInput.fill('');
    let response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(422);

    await expect(page).toHaveURL('/settings');
    expect(await settings.errorMessages()).toEqual(["email can't be blank"]);
    const above = await page.evaluate(() => {
      const errors = document.querySelector('ul.error-messages');
      const form = document.querySelector('app-settings-page form');
      if (!errors || !form) return false;
      return errors.getBoundingClientRect().bottom <= form.getBoundingClientRect().top;
    });
    expect(above).toBe(true);
    await expect(settings.usernameInput).toHaveValue(user.username);

    await settings.emailInput.fill('not-an-email');
    response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(422);
    await expect(page).toHaveURL('/settings');
    expect(await settings.errorMessages()).toEqual(['email is invalid']);
    await expect(settings.usernameInput).toHaveValue(user.username);

    await page.reload();
    await expect(settings.emailInput).toHaveValue(user.email);
  });

  test('39. settings rejects a whitespace-only username [FR-025]', async ({ page }) => {
    const user = throwawayUser('blankname');
    await registerUser(page, user);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.usernameInput.fill('   ');
    const response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(422);

    await expect(page).toHaveURL('/settings');
    expect(await settings.errorMessages()).toEqual(["username can't be blank"]);
    await expect(new HeaderPage(page).link(user.username)).toBeVisible();

    await page.reload();
    await expect(settings.usernameInput).toHaveValue(user.username);
    await expect(new HeaderPage(page).link(user.username)).toBeVisible();
  });

  test('40. settings rejects taken username and email [FR-026]', async ({ page }) => {
    const user = throwawayUser('taken');
    await registerUser(page, user);
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.usernameInput.fill('bob');
    let response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(409);
    await expect(page).toHaveURL('/settings');
    expect(await settings.errorMessages()).toEqual(['username has already been taken']);

    await page.reload();
    await settings.emailInput.fill('bob@example.com');
    response = page.waitForResponse(r => r.url().endsWith('/api/user') && r.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(409);
    await expect(page).toHaveURL('/settings');
    expect(await settings.errorMessages()).toEqual(['email has already been taken']);

    await expect(new HeaderPage(page).link(user.username)).toBeVisible();
    await page.goto(`/profile/${user.username}`);
    await expect(new ProfilePage(page).name).toHaveText(user.username);
    await settings.goto();
    await expect(settings.emailInput).toHaveValue(user.email);
  });
});
