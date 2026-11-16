import { test, expect } from './support/fixtures';
import { PASSWORD, accountName, signInWithToken } from './support/api';
import { HeaderComponent } from './pages/HeaderComponent';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditorPage } from './pages/EditorPage';

const FLAKY_SLUG = 'Flaky-tests:-a-field-guide-45af9838';

test.describe('Authentication and header', () => {
  /** Covers the spec's known-behaviour section for routing */
  test('14. known upstream routing shows header and footer only [KNOWN]', async ({ page, request }) => {
    const header = new HeaderComponent(page);
    const login = new LoginPage(page);

    await page.goto('/article/does-not-exist');
    await expect(page).toHaveURL('/article/does-not-exist');
    await expect(header.nav).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
    await expect(page.locator('app-article-comment')).toHaveCount(0);

    await page.goto('/profile/nobody');
    await expect(page).toHaveURL('/profile/nobody');
    await expect(header.nav).toBeVisible();
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'My Posts' })).toHaveCount(0);

    await page.goto('/no-such-page');
    await expect(page).toHaveURL('/');
    await expect(header.nav).toBeVisible();
    await expect(page.locator('app-article-preview')).toHaveCount(0);

    await signInWithToken(page, request, 'alice@example.com', '/login');
    await expect(page).toHaveURL('/');
    await expect(login.heading).toHaveCount(0);
    await expect(page.locator('app-article-preview')).toHaveCount(0);

    await page.goto('/register');
    await expect(page).toHaveURL('/');
    await expect(login.heading).toHaveCount(0);
    await expect(page.locator('app-article-preview')).toHaveCount(0);
  });

  /** Covers FR-005, FR-010 */
  test('16. auth pages have the documented fields and disabled submit buttons [FR-005, FR-010]', async ({
    page,
  }) => {
    const register = new RegisterPage(page);
    const login = new LoginPage(page);

    await register.goto();
    await expect(register.heading).toBeVisible();
    await expect(register.haveAccountLink).toHaveAttribute('href', '/login');
    await expect(register.username).toBeVisible();
    await expect(register.email).toBeVisible();
    await expect(register.password).toBeVisible();
    await expect(register.submit).toBeDisabled();

    await register.username.fill('someone');
    await expect(register.submit).toBeDisabled();
    await register.email.fill('someone@example.com');
    await expect(register.submit).toBeDisabled();
    await register.password.fill(PASSWORD);
    await expect(register.submit).toBeEnabled();
    await register.password.fill('');
    await expect(register.submit).toBeDisabled();

    await login.goto();
    await expect(login.heading).toBeVisible();
    await expect(login.needAccountLink).toHaveAttribute('href', '/register');
    await expect(login.email).toBeVisible();
    await expect(login.password).toBeVisible();
    await expect(login.submit).toBeDisabled();
    await login.email.fill('someone@example.com');
    await expect(login.submit).toBeDisabled();
    await login.password.fill(PASSWORD);
    await expect(login.submit).toBeEnabled();
  });

  /** Covers FR-006, AC2.1 */
  test('17. signing up a new user lands on the home page with global feed selected [FR-006]', async ({
    page,
  }) => {
    const register = new RegisterPage(page);
    const home = new HomePage(page);
    const header = new HeaderComponent(page);
    const username = accountName('signup');

    await register.goto();
    await register.username.fill(username);
    await register.email.fill(`${username}@example.com`);
    await register.password.fill(PASSWORD);

    const response = page.waitForResponse(
      res => res.url().endsWith('/api/users') && res.request().method() === 'POST',
    );
    await register.submit.click();
    expect((await response).status()).toBe(201);

    await expect(page).toHaveURL('/');
    await expect(home.globalFeedTab).toHaveClass(/active/);
    await expect(header.userLink(username)).toBeVisible();
    await expect(header.homeLink).toBeVisible();
    await expect(header.newArticleLink).toBeVisible();
    await expect(header.settingsLink).toBeVisible();
    await expect(home.banner).toHaveCount(0);
  });

  /** Covers FR-007, FR-013, FR-073, SC-004 */
  test('18. an invalid email is rejected on sign-up and on sign-in [FR-007, FR-013, SC-004]', async ({ page }) => {
    const register = new RegisterPage(page);
    const login = new LoginPage(page);
    const username = accountName('invalid-email');
    let registerPosted = false;
    let loginPosted = false;

    page.on('request', request => {
      if (request.url().endsWith('/api/users') && request.method() === 'POST') registerPosted = true;
      if (request.url().endsWith('/api/users/login') && request.method() === 'POST') loginPosted = true;
    });

    await register.goto();
    await register.username.fill(username);
    await register.email.fill('not-an-email');
    await register.password.fill(PASSWORD);
    await register.submit.click();

    await expect(page).toHaveURL('/register');
    await expect(register.errors).toHaveText(['email is invalid']);
    await expect(register.username).toHaveValue(username);
    await expect(register.email).toHaveValue('not-an-email');
    expect(registerPosted).toBe(false);

    await login.goto();
    await login.email.fill('not-an-email');
    await login.password.fill(PASSWORD);
    await login.submit.click();

    await expect(page).toHaveURL('/login');
    await expect(login.errors).toHaveText(['email is invalid']);
    await expect(login.email).toHaveValue('not-an-email');
    expect(loginPosted).toBe(false);
  });

  /** Covers FR-008 and the spec's known-behaviour section */
  test('19. reusing a username or email is rejected and creates no account [FR-008, KNOWN]', async ({
    page,
  }) => {
    const register = new RegisterPage(page);
    const login = new LoginPage(page);
    const email = `${accountName('taken')}@example.com`;

    await register.goto();
    await register.username.fill('alice');
    await register.email.fill(email);
    await register.password.fill(PASSWORD);
    let response = page.waitForResponse(
      res => res.url().endsWith('/api/users') && res.request().method() === 'POST',
    );
    await register.submit.click();
    expect((await response).status()).toBe(409);
    await expect(page).toHaveURL('/register');
    await expect(register.errors).toHaveText([
      'email has already been taken',
      'username has already been taken',
    ]);

    const otherUsername = accountName('taken-email');
    await register.username.fill(otherUsername);
    await register.email.fill('alice@example.com');
    await register.password.fill(PASSWORD);
    response = page.waitForResponse(res => res.url().endsWith('/api/users') && res.request().method() === 'POST');
    await register.submit.click();
    expect((await response).status()).toBe(409);
    await expect(page).toHaveURL('/register');
    await expect(register.errors).toHaveText([
      'email has already been taken',
      'username has already been taken',
    ]);

    await login.goto();
    await login.email.fill(email);
    await login.password.fill(PASSWORD);
    const loginResponse = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await loginResponse).status()).toBe(401);
    await expect(login.errors).toHaveText(['credentials invalid']);
  });

  /** Covers FR-009 (edge case) */
  test("20. spaces-only username or password is rejected with can't be blank [FR-009]", async ({ page }) => {
    const register = new RegisterPage(page);
    const username = accountName('spaces-user');
    const email = `${username}@example.com`;

    await register.goto();
    await register.username.fill('   ');
    await register.email.fill(email);
    await register.password.fill(PASSWORD);
    await expect(register.submit).toBeEnabled();
    let response = page.waitForResponse(
      res => res.url().endsWith('/api/users') && res.request().method() === 'POST',
    );
    await register.submit.click();
    expect((await response).status()).toBe(422);
    await expect(page).toHaveURL('/register');
    await expect(register.errors).toHaveText(["username can't be blank"]);

    const secondUsername = accountName('spaces-pass');
    await register.username.fill(secondUsername);
    await register.email.fill(`${secondUsername}@example.com`);
    await register.password.fill('   ');
    await expect(register.submit).toBeEnabled();
    response = page.waitForResponse(res => res.url().endsWith('/api/users') && res.request().method() === 'POST');
    await register.submit.click();
    expect((await response).status()).toBe(422);
    await expect(page).toHaveURL('/register');
    await expect(register.errors).toHaveText(["password can't be blank"]);
  });

  /** Covers FR-011, FR-002, AC2.3 */
  test('21. signing in as alice lands on the home page with alice in the header [FR-011]', async ({ page }) => {
    const login = new LoginPage(page);
    const home = new HomePage(page);
    const header = new HeaderComponent(page);

    await login.goto();
    await login.email.fill('alice@example.com');
    await login.password.fill(PASSWORD);
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await response).status()).toBe(200);

    await expect(page).toHaveURL('/');
    await expect(home.globalFeedTab).toHaveClass(/active/);
    await expect(header.homeLink).toBeVisible();
    await expect(header.newArticleLink).toBeVisible();
    await expect(header.settingsLink).toBeVisible();
    await expect(header.userLink('alice')).toHaveAttribute('href', '/profile/alice');
    await expect(home.banner).toHaveCount(0);
  });

  /** Covers FR-012, SC-004 */
  test('22. a wrong password or unknown email shows credentials invalid [FR-012, SC-004]', async ({ page }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.email.fill('alice@example.com');
    await login.password.fill('wrong-password');
    let response = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await response).status()).toBe(401);
    await expect(page).toHaveURL('/login');
    await expect(login.errors).toHaveText(['credentials invalid']);
    await expect(login.email).toHaveValue('alice@example.com');
    await expect(login.password).toHaveValue('wrong-password');

    await login.email.fill('nobody@example.com');
    await login.password.fill(PASSWORD);
    response = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await response).status()).toBe(401);
    await expect(page).toHaveURL('/login');
    await expect(login.errors).toHaveText(['credentials invalid']);
    await expect(login.email).toHaveValue('nobody@example.com');
  });

  /** Covers FR-002 */
  test('23. the signed-in header shows the documented links and destinations [FR-002]', async ({
    page,
    request,
  }) => {
    const header = new HeaderComponent(page);
    const home = new HomePage(page);
    const editor = new EditorPage(page);
    const settings = new SettingsPage(page);
    const profile = new ProfilePage(page);

    await signInWithToken(page, request, 'alice@example.com', '/');
    await expect(header.homeLink).toHaveClass(/active/);
    await expect(header.homeLink).toHaveAttribute('href', '/');
    await expect(header.newArticleLink).toHaveAttribute('href', '/editor');
    await expect(header.settingsLink).toHaveAttribute('href', '/settings');
    await expect(header.userLink('alice')).toHaveAttribute('href', '/profile/alice');
    await expect(header.userAvatar('alice')).toBeVisible();

    await header.newArticleLink.click();
    await expect(page).toHaveURL('/editor');
    await expect(editor.titleInput).toBeVisible();

    await header.settingsLink.click();
    await expect(page).toHaveURL('/settings');
    await expect(settings.heading).toBeVisible();

    await header.userLink('alice').click();
    await expect(page).toHaveURL('/profile/alice');
    await expect(profile.username).toHaveText('alice');

    await header.homeLink.click();
    await expect(page).toHaveURL('/');
    await expect(home.previews).toHaveCount(10);
  });

  /** Covers FR-014 */
  test('24. the session survives a page reload [FR-014]', async ({ page, request }) => {
    const header = new HeaderComponent(page);
    const home = new HomePage(page);

    await signInWithToken(page, request, 'alice@example.com', '/');
    await expect(header.userLink('alice')).toBeVisible();

    await page.reload();

    await expect(header.userLink('alice')).toBeVisible();
    await expect(header.newArticleLink).toBeVisible();
    await expect(header.settingsLink).toBeVisible();
    await expect(header.signInLink).toHaveCount(0);
    await expect(header.signUpLink).toHaveCount(0);
    await expect(home.banner).toHaveCount(0);
  });

  /** Covers FR-015, AC2.2 */
  test('25. logging out from settings shows the signed-out home page and banner [FR-015]', async ({
    page,
    request,
  }) => {
    const settings = new SettingsPage(page);
    const header = new HeaderComponent(page);
    const home = new HomePage(page);

    await signInWithToken(page, request, 'alice@example.com', '/settings');
    await expect(settings.heading).toBeVisible();
    await settings.logoutButton.click();

    await expect(page).toHaveURL('/');
    await expect(header.homeLink).toBeVisible();
    await expect(header.signInLink).toBeVisible();
    await expect(header.signUpLink).toBeVisible();
    await expect(header.userLink('alice')).toHaveCount(0);
    await expect(home.banner).toBeVisible();

    await page.reload();
    await expect(header.signInLink).toBeVisible();
    await expect(header.userLink('alice')).toHaveCount(0);
  });

  /** Covers FR-017, SC-007 */
  test('26. signed-out visitors are sent to log in from every protected page [FR-017, SC-007]', async ({
    page,
  }) => {
    const login = new LoginPage(page);

    for (const path of ['/settings', '/editor', `/editor/${FLAKY_SLUG}`, '/?feed=following']) {
      await page.goto(path);
      await expect(page).toHaveURL('/login');
      await expect(login.heading).toBeVisible();
      await expect(login.email).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Your Settings' })).toHaveCount(0);
      await expect(page.getByPlaceholder('Article Title')).toHaveCount(0);
    }
  });
});
