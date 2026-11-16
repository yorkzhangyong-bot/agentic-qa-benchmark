import { test, expect } from './support/fixtures';
import {
  PASSWORD,
  accountName,
  articlesCount,
  commentCount,
  deleteArticle,
  signInWithToken,
  unique,
} from './support/api';
import { EditorPage } from './pages/EditorPage';
import { ArticlePage } from './pages/ArticlePage';
import { SettingsPage } from './pages/SettingsPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { HeaderComponent } from './pages/HeaderComponent';

const FLAKY_SLUG = 'Flaky-tests:-a-field-guide-45af9838';
const ALICE_BIO = 'QA lead. Writes about test strategy and automation.';

test.describe('Error messages and data integrity', () => {
  /** Covers FR-073 */
  test('70. form errors appear as one list above the form and keep typed values [FR-073]', async ({
    page,
    request,
  }) => {
    const register = new RegisterPage(page);
    const settings = new SettingsPage(page);
    const editor = new EditorPage(page);
    const username = accountName('form-errors');

    await register.goto();
    await register.username.fill(username);
    await register.email.fill('not-an-email');
    await register.password.fill(PASSWORD);
    await register.submit.click();

    await expect(register.errors).toHaveText(['email is invalid']);
    const registerErrorBox = await register.errors.first().boundingBox();
    const registerFormBox = await page.locator('form').boundingBox();
    expect(registerErrorBox!.y).toBeLessThan(registerFormBox!.y);
    await expect(register.username).toHaveValue(username);
    await expect(register.email).toHaveValue('not-an-email');
    await expect(register.password).toHaveValue(PASSWORD);

    await signInWithToken(page, request, 'alice@example.com', '/settings');
    await settings.email.fill('');
    const settingsResponse = page.waitForResponse(
      res => res.url().endsWith('/api/user') && res.request().method() === 'PUT',
    );
    await settings.update();
    expect((await settingsResponse).status()).toBe(422);
    await expect(settings.errors).toHaveText(["email can't be blank"]);
    const settingsErrorBox = await settings.errors.first().boundingBox();
    const settingsFormBox = await page.locator('form').boundingBox();
    expect(settingsErrorBox!.y).toBeLessThan(settingsFormBox!.y);
    await expect(settings.username).toHaveValue('alice');
    await expect(settings.bio).toHaveValue(ALICE_BIO);
    await expect(settings.email).toHaveValue('');
    await settings.email.fill('alice@example.com');

    await editor.goto();
    const editorResponse = page.waitForResponse(
      res => res.url().endsWith('/api/articles') && res.request().method() === 'POST',
    );
    await editor.publish();
    expect((await editorResponse).status()).toBe(422);
    await expect(editor.errors).toHaveText([
      "title can't be blank",
      "description can't be blank",
      "body can't be blank",
    ]);
    const editorErrorBox = await editor.errors.first().boundingBox();
    const editorFormBox = await page.locator('form').boundingBox();
    expect(editorErrorBox!.y).toBeLessThan(editorFormBox!.y);
    await expect(editor.titleInput).toHaveValue('');
    await expect(editor.descriptionInput).toHaveValue('');
    await expect(editor.bodyInput).toHaveValue('');
  });

  /** Covers SC-004 */
  test('71. bad input changes no data [SC-004]', async ({ page, request }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const settings = new SettingsPage(page);
    const login = new LoginPage(page);
    const header = new HeaderComponent(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);

    expect(await articlesCount(request)).toBe(24);
    await signInWithToken(page, request, 'alice@example.com', '/editor');

    let response = page.waitForResponse(
      res => res.url().endsWith('/api/articles') && res.request().method() === 'POST',
    );
    await editor.publish();
    expect((await response).status()).toBe(422);
    await expect(editor.errors).toHaveText([
      "title can't be blank",
      "description can't be blank",
      "body can't be blank",
    ]);

    await article.goto(FLAKY_SLUG);
    response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${FLAKY_SLUG}/comments`) && res.request().method() === 'POST',
    );
    await article.postCommentButton.click();
    expect((await response).status()).toBe(422);
    await expect(article.commentErrors).toHaveText(["body can't be blank"]);

    await settings.goto();
    await settings.email.fill('');
    response = page.waitForResponse(res => res.url().endsWith('/api/user') && res.request().method() === 'PUT');
    await settings.update();
    expect((await response).status()).toBe(422);
    await expect(settings.errors).toHaveText(["email can't be blank"]);
    await settings.email.fill('alice@example.com');

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

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    await expect(home.paginationItems).toHaveCount(3);
    expect(await articlesCount(request)).toBe(24);
    expect(await commentCount(request, FLAKY_SLUG)).toBe(2);

    await profile.goto('alice');
    await expect(profile.bio).toHaveText(ALICE_BIO);
    await settings.goto();
    await expect(settings.username).toHaveValue('alice');
    await expect(settings.email).toHaveValue('alice@example.com');
  });

  /** Covers SC-003, SC-008 */
  test("72. a new user's whole journey is found in the tabs and survives a sign-out and sign-in [SC-003, SC-008]", async ({
    page,
    request,
    cleanup,
  }) => {
    const register = new RegisterPage(page);
    const home = new HomePage(page);
    const header = new HeaderComponent(page);
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const profile = new ProfilePage(page);
    const login = new LoginPage(page);
    const settings = new SettingsPage(page);
    const username = accountName('journey');
    const email = `${username}@example.com`;
    const id = unique('journey');
    const title = `QA journey ${id}`;
    const description = `QA journey description ${id}`;
    const body = `QA journey body ${id}`;
    const tag = `qa-${id}`;
    const commentBody = `QA journey comment ${id}`;

    await register.goto();
    await register.username.fill(username);
    await register.email.fill(email);
    await register.password.fill(PASSWORD);
    const registerResponse = page.waitForResponse(
      res => res.url().endsWith('/api/users') && res.request().method() === 'POST',
    );
    await register.submit.click();
    expect((await registerResponse).status()).toBe(201);
    await expect(page).toHaveURL('/');
    await expect(header.userLink(username)).toBeVisible();

    const token = await page.evaluate(() => window.localStorage.getItem('jwtToken'));
    expect(token).not.toBeNull();

    await editor.goto();
    await editor.fill(title, description, body);
    await editor.addTag(tag);
    await editor.addTag('testing');
    const createResponse = page.waitForResponse(
      res => res.url().endsWith('/api/articles') && res.request().method() === 'POST',
    );
    await editor.publish();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    const createdJson = await created.json();
    const slug = createdJson.article.slug as string;
    cleanup.add(() => deleteArticle(request, token as string, slug));
    await expect(article.title).toHaveText(title);

    const commentResponse = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${slug}/comments`) && res.request().method() === 'POST',
    );
    await article.commentBox.fill(commentBody);
    await article.postCommentButton.click();
    expect((await commentResponse).status()).toBe(201);
    await expect(article.commentCard(commentBody)).toBeVisible();

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    expect((await home.previewTitles())[0]).toBe(title);
    const heart = home.previewHeart(title);
    await expect(heart).toHaveText('0');
    const favoriteResponse = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${slug}/favorite`) && res.request().method() === 'POST',
    );
    await heart.click();
    expect((await favoriteResponse).status()).toBe(200);
    await expect(heart).toHaveText('1');

    await profile.goto(username);
    await expect(profile.previews.getByRole('heading', { level: 1 }).first()).toHaveText(title);
    await profile.favoritedTab.click();
    await expect(page).toHaveURL(`/profile/${username}/favorites`);
    await expect(profile.preview(title)).toBeVisible();
    await expect(profile.previewHeart(title)).toHaveText('1');

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
    await expect(header.userLink(username)).toBeVisible();

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    expect((await home.previewTitles())[0]).toBe(title);
    await expect(home.previewHeart(title)).toHaveText('1');

    await profile.goto(username);
    await expect(profile.previews.getByRole('heading', { level: 1 }).first()).toHaveText(title);
    await profile.favoritedTab.click();
    await expect(profile.preview(title)).toBeVisible();

    await article.goto(slug);
    await expect(article.commentCard(commentBody)).toBeVisible();
  });
});
