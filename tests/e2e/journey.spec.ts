import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';
import { Header } from './pages/Header';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { disposableAccount, signIn, signOut, signUp } from './fixtures/auth';
import { waitForApi } from './fixtures/network';
import {
  SEED_PASSWORD,
  SEED_USERS,
  slugPattern,
  uniqueRunId,
} from './fixtures/seed';

const ARTICLE_PATH = /^\/api\/articles\/[^/]+$/;
const COMMENT_PATH = /^\/api\/articles\/[^/]+\/comments$/;
const COMMENT_DELETE_PATH = /^\/api\/articles\/[^/]+\/comments\/\d+$/;
const FAVORITE_PATH = /^\/api\/articles\/[^/]+\/favorite$/;

test.describe('End-to-end journeys', () => {
  test('59. new-user journey across article, comment and favourite [SC-003]', async ({ page }) => {
    const account = disposableAccount('journey');
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    const title = `QA journey ${uniqueRunId()}`;
    const commentText = `QA journey comment ${uniqueRunId()}`;

    await signUp(page, account);

    await editor.goto();
    await editor.fillArticle({
      title,
      description: 'A journey through the app',
      body: 'The body of the journey article.',
    });
    await editor.addTag('zebra');
    await editor.addTag('testing');
    const created = waitForApi(page, 'POST', '/api/articles');
    await editor.publish();
    expect((await created).status()).toBe(201);
    await expect(page).toHaveURL(slugPattern(title));
    await expect(article.title).toHaveText(title);
    const articleUrl = page.url();

    const commented = waitForApi(page, 'POST', COMMENT_PATH);
    await article.postComment(commentText);
    expect((await commented).status()).toBe(201);
    await expect(article.comment(commentText).getByRole('link', { name: account.username, exact: true }))
      .toHaveAttribute('href', `/profile/${account.username}`);

    // The author's own article page offers Edit/Delete rather than a favourite button, so the
    // favourite is toggled from the article's preview in the feed.
    await home.goto('/');
    await expect(home.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);
    const favorited = waitForApi(page, 'POST', FAVORITE_PATH);
    await home.preview(title).heart.click();
    expect((await favorited).status()).toBe(200);
    await expect(home.preview(title).heart).toHaveText('1');

    await profile.goto(account.username);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);

    await profile.goto(account.username, 'favorites');
    await expect(profile.preview(title).root).toBeVisible();

    await profile.goto(account.username, 'favorites');
    const unfavorited = waitForApi(page, 'DELETE', FAVORITE_PATH);
    await profile.preview(title).heart.click();
    expect((await unfavorited).status()).toBe(200);

    await page.goto(articleUrl);

    const deletedComment = waitForApi(page, 'DELETE', COMMENT_DELETE_PATH);
    await article.commentTrash(article.comment(commentText)).click();
    expect((await deletedComment).status()).toBe(204);

    const deletedArticle = waitForApi(page, 'DELETE', ARTICLE_PATH);
    await article.deleteButtons.first().click();
    expect((await deletedArticle).status()).toBe(204);
    await expect(page).toHaveURL('/');

    await profile.goto(account.username);
    await expect(profile.previews).toHaveCount(0);
    await expect(profile.emptyMessage).toBeVisible();

    await profile.goto(account.username, 'favorites');
    await expect(profile.previews).toHaveCount(0);

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    await home.pagination.goTo(2);
    await expect(home.previews).toHaveCount(10);
    await home.pagination.goTo(3);
    await expect(home.previews).toHaveCount(4);
  });

  test('60. rejected input changes no data [SC-004]', async ({ page }) => {
    const runId = uniqueRunId();
    const register = new RegisterPage(page);
    const login = new LoginPage(page);
    const editor = new EditorPage(page);
    const home = new HomePage(page);

    // Invalid email on sign-up: validated in the browser, no account is created.
    await register.goto();
    await register.usernameInput.fill(`qa-noop-invalid-${runId}`);
    await register.emailInput.fill('not-an-email');
    await register.passwordInput.fill(SEED_PASSWORD);
    await register.signUpButton.click();
    await expect(register.errors).toHaveText(['email is invalid']);

    // Spaces-only username: rejected by the API.
    await register.goto();
    await register.usernameInput.fill('   ');
    await register.emailInput.fill(`qa.noop.spaces.${runId}@example.com`);
    await register.passwordInput.fill(SEED_PASSWORD);
    const blankUsername = waitForApi(page, 'POST', '/api/users');
    await register.signUpButton.click();
    expect((await blankUsername).status()).toBe(422);
    await expect(register.errors.filter({ hasText: "username can't be blank" })).toHaveCount(1);

    // Wrong password: no session is created.
    await login.goto();
    await login.emailInput.fill(SEED_USERS.alice.email);
    await login.passwordInput.fill('WrongPassword1!');
    const wrongPassword = waitForApi(page, 'POST', '/api/users/login');
    await login.signInButton.click();
    expect((await wrongPassword).status()).toBe(401);
    await expect(login.errors.filter({ hasText: 'credentials invalid' })).toHaveCount(1);

    // Empty article: rejected, nothing is published.
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await editor.goto();
    const emptyArticle = waitForApi(page, 'POST', '/api/articles');
    await editor.publish();
    expect((await emptyArticle).status()).toBe(422);
    await expect(editor.errors).toHaveText([
      "title can't be blank",
      "description can't be blank",
      "body can't be blank",
    ]);
    await signOut(page);

    await home.goto('/');
    await expect(home.previews.first().getByRole('heading', { level: 1 })).toHaveText(
      'Release notes for testers',
    );
    await expect(home.previews).toHaveCount(10);
    await home.pagination.goTo(2);
    await expect(home.previews).toHaveCount(10);
    await home.pagination.goTo(3);
    await expect(home.previews).toHaveCount(4);
    await expect(home.previews.getByRole('heading', { level: 1 }).last()).toHaveText('Why we test');

    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await expect(page).toHaveURL('/');
    await expect(new Header(page).usernameLink('alice')).toBeVisible();
  });
});
