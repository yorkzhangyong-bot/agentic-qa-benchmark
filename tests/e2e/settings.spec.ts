import { test, expect } from './support/fixtures';
import {
  PASSWORD,
  accountName,
  createAccount,
  signInWithToken,
  unique,
  updateUser,
} from './support/api';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { HeaderComponent } from './pages/HeaderComponent';
import { LoginPage } from './pages/LoginPage';

const AVATAR = 'http://localhost:3000/images/demo-avatar.png';

test.describe('Settings', () => {
  /** Covers FR-018 */
  test('27. settings shows the documented fields with current values [FR-018]', async ({ page, request }) => {
    const settings = new SettingsPage(page);

    await signInWithToken(page, request, 'alice@example.com', '/settings');

    await expect(settings.heading).toBeVisible();
    await expect(settings.image).toHaveValue(AVATAR);
    await expect(settings.username).toHaveValue('alice');
    await expect(settings.bio).toHaveValue('QA lead. Writes about test strategy and automation.');
    await expect(settings.email).toHaveValue('alice@example.com');
    await expect(settings.newPassword).toHaveValue('');
    await expect(settings.updateButton).toBeVisible();
    await expect(settings.logoutButton).toBeVisible();
  });

  /** Covers FR-019, FR-022, SC-008 */
  test('28. updating the bio saves it and an empty new password keeps the current password [FR-019, FR-022, SC-008]', async ({
    page,
    request,
  }) => {
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);
    const header = new HeaderComponent(page);
    const login = new LoginPage(page);
    const username = accountName('bio');
    const email = `${username}@example.com`;
    const bio = `QA bio ${unique('bio')}`;

    await createAccount(request, username);
    await signInWithToken(page, request, email, '/settings');
    await expect(settings.username).toHaveValue(username);

    await settings.bio.fill(bio);
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${username}`);
    await expect(profile.bio).toHaveText(bio);
    await expect(header.userLink(username)).toBeVisible();

    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');

    await login.goto();
    await login.email.fill(email);
    await login.password.fill(PASSWORD);
    const loginResponse = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await loginResponse).status()).toBe(200);
    await expect(page).toHaveURL('/');

    await profile.goto(username);
    await expect(profile.bio).toHaveText(bio);
  });

  /** Covers FR-020, FR-004 */
  test('29. clearing the bio and picture removes both and shows the default avatar [FR-020]', async ({
    page,
    request,
  }) => {
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);
    const header = new HeaderComponent(page);
    const username = accountName('clear');
    const email = `${username}@example.com`;
    const token = await createAccount(request, username);
    await updateUser(request, token, { bio: `QA bio ${unique('bio')}`, image: AVATAR });

    await signInWithToken(page, request, email, '/settings');
    await expect(settings.image).toHaveValue(AVATAR);

    await settings.bio.fill('');
    await settings.image.fill('');
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${username}`);
    await expect(profile.bio).toHaveText('');
    await expect(profile.avatar).toHaveAttribute('src', '/assets/default-avatar.svg');
    await expect(header.userAvatar(username)).toHaveAttribute('src', '/assets/default-avatar.svg');

    await page.reload();
    await expect(profile.bio).toHaveText('');
    await expect(profile.avatar).toHaveAttribute('src', '/assets/default-avatar.svg');
    await expect(header.userAvatar(username)).toHaveAttribute('src', '/assets/default-avatar.svg');
  });

  /** Covers FR-021 */
  test('30. changing the username updates the profile address and the header [FR-021]', async ({
    page,
    request,
  }) => {
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);
    const header = new HeaderComponent(page);
    const username = accountName('rename');
    const email = `${username}@example.com`;
    const newUsername = accountName('renamed');

    await createAccount(request, username);
    await signInWithToken(page, request, email, '/settings');

    await settings.username.fill(newUsername);
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL(`/profile/${newUsername}`);
    await expect(profile.username).toHaveText(newUsername);
    await expect(header.userLink(newUsername)).toBeVisible();

    await profile.goto(username);
    await expect(page).toHaveURL(`/profile/${username}`);
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'My Posts' })).toHaveCount(0);
    await expect(header.nav).toBeVisible();
  });

  /** Covers FR-022 */
  test('31. a new password of eight or more characters replaces the old one [FR-022]', async ({
    page,
    request,
  }) => {
    const settings = new SettingsPage(page);
    const login = new LoginPage(page);
    const header = new HeaderComponent(page);
    const username = accountName('pass');
    const email = `${username}@example.com`;
    const newPassword = `NewPass${unique('pw').replace(/-/g, '')}`;

    await createAccount(request, username);
    await signInWithToken(page, request, email, '/settings');

    await settings.newPassword.fill(newPassword);
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await response).status()).toBe(200);
    await expect(page).toHaveURL(`/profile/${username}`);

    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');

    await login.goto();
    await login.email.fill(email);
    await login.password.fill(PASSWORD);
    let loginResponse = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await loginResponse).status()).toBe(401);
    await expect(login.errors).toHaveText(['credentials invalid']);

    await login.password.fill(newPassword);
    loginResponse = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await loginResponse).status()).toBe(200);
    await expect(page).toHaveURL('/');
    await expect(header.userLink(username)).toBeVisible();
  });

  /** Covers FR-023, SC-004 */
  test('32. a new password shorter than eight characters is rejected [FR-023, SC-004]', async ({
    page,
    request,
  }) => {
    const settings = new SettingsPage(page);
    const login = new LoginPage(page);
    const header = new HeaderComponent(page);

    await signInWithToken(page, request, 'alice@example.com', '/settings');
    await settings.newPassword.fill('short');
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await response).status()).toBe(422);

    await expect(page).toHaveURL('/settings');
    await expect(settings.errors).toHaveText(['password must be at least 8 characters long']);

    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');
    await login.goto();
    await login.email.fill('alice@example.com');
    await login.password.fill(PASSWORD);
    const loginResponse = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await loginResponse).status()).toBe(200);
    await expect(page).toHaveURL('/');
    await expect(header.userLink('alice')).toBeVisible();
  });

  /** Covers FR-024, FR-073 */
  test('33. an empty or malformed email in settings is rejected [FR-024]', async ({ page, request }) => {
    const settings = new SettingsPage(page);

    await signInWithToken(page, request, 'alice@example.com', '/settings');

    await settings.email.fill('');
    let response = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await response).status()).toBe(422);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors).toHaveText(["email can't be blank"]);

    await settings.email.fill('not-an-email');
    response = page.waitForResponse(res => res.url().endsWith('/api/user') && res.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(422);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors).toHaveText(['email is invalid']);

    await page.reload();
    await expect(settings.email).toHaveValue('alice@example.com');
    await expect(settings.username).toHaveValue('alice');
  });

  /** Covers FR-025 */
  test('34. a spaces-only username in settings is rejected [FR-025]', async ({ page, request }) => {
    const settings = new SettingsPage(page);

    await signInWithToken(page, request, 'alice@example.com', '/settings');
    await settings.username.fill('   ');
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await response).status()).toBe(422);

    await expect(page).toHaveURL('/settings');
    await expect(settings.errors).toHaveText(["username can't be blank"]);

    await page.reload();
    await expect(settings.username).toHaveValue('alice');
  });

  /** Covers FR-026 and the spec's known-behaviour section */
  test('35. a taken username or email in settings is rejected and saves nothing [FR-026, KNOWN]', async ({
    page,
    request,
  }) => {
    const settings = new SettingsPage(page);

    await signInWithToken(page, request, 'alice@example.com', '/settings');

    await settings.username.fill('bob');
    let response = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await response).status()).toBe(409);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors).toHaveText([
      'email has already been taken',
      'username has already been taken',
    ]);

    await page.reload();
    await expect(settings.username).toHaveValue('alice');

    await settings.email.fill('bob@example.com');
    response = page.waitForResponse(res => res.url().endsWith('/api/user') && res.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(409);
    await expect(page).toHaveURL('/settings');
    await expect(settings.errors).toHaveText([
      'email has already been taken',
      'username has already been taken',
    ]);

    await page.reload();
    await expect(settings.username).toHaveValue('alice');
    await expect(settings.email).toHaveValue('alice@example.com');
  });
});
