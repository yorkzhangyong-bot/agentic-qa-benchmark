import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { disposableAccount, signIn, signUp } from './fixtures/auth';
import { waitForApi } from './fixtures/network';
import {
  SEED_ARTICLES,
  SEED_PASSWORD,
  SEED_USERS,
  slugPattern,
  uniqueRunId,
} from './fixtures/seed';

const ARTICLE_PATH = /^\/api\/articles\/[^/]+$/;

function slugFromArticleUrl(url: string): string {
  return new URL(url).pathname.replace('/article/', '');
}

test.describe('Article editor', () => {
  test('30. editor fields and tag management [FR-047] [FR-048]', async ({ page }) => {
    const account = disposableAccount('tags');
    await signUp(page, account);

    const editor = new EditorPage(page);
    const article = new ArticlePage(page);

    await editor.goto();
    await expect(editor.titleInput).toBeVisible();
    await expect(editor.descriptionInput).toBeVisible();
    await expect(editor.bodyInput).toBeVisible();
    await expect(editor.tagsInput).toBeVisible();
    await expect(editor.publishButton).toBeVisible();

    await editor.addTag('zebra');
    await expect(editor.tags).toHaveText(['zebra']);
    await expect(editor.tagsInput).toHaveValue('');

    await editor.addTag('zebra');
    await expect(editor.tags).toHaveCount(1);

    await editor.addTag('   ');
    await expect(editor.tags).toHaveCount(1);

    await editor.addTag('testing');
    await expect(editor.tags).toHaveText(['zebra', 'testing']);

    await editor.removeTag('zebra');
    await expect(editor.tags).toHaveText(['testing']);

    await editor.tagsInput.fill('leftover');
    const title = `QA tag test ${uniqueRunId()}`;
    await editor.fillArticle({
      title,
      description: 'Tags from the editor',
      body: 'Body for the tag test.',
    });

    const created = waitForApi(page, 'POST', '/api/articles');
    await editor.publish();
    expect((await created).status()).toBe(201);

    await expect(page).toHaveURL(slugPattern(title));
    await expect(article.title).toHaveText(title);
    const tags = (await article.tags.allTextContents()).map((tag) => tag.trim()).sort();
    expect(tags).toEqual(['leftover', 'testing']);

    const deleted = waitForApi(page, 'DELETE', ARTICLE_PATH);
    await article.deleteButtons.first().click();
    expect((await deleted).status()).toBe(204);
    await expect(page).toHaveURL('/');
  });

  test('31. publishes and deletes an article [FR-049] [FR-055]', async ({ page }) => {
    const account = disposableAccount('publish');
    await signUp(page, account);

    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    const title = `QA publish test ${uniqueRunId()}`;

    await editor.goto();
    await editor.fillArticle({
      title,
      description: 'Published by an automated check',
      body: 'First paragraph.',
    });
    await editor.addTag('zebra');
    await editor.addTag('testing');

    const created = waitForApi(page, 'POST', '/api/articles');
    await editor.publish();
    expect((await created).status()).toBe(201);

    await expect(page).toHaveURL(slugPattern(title));
    await expect(article.title).toHaveText(title);
    const articleUrl = page.url();

    await home.goto('/');
    await expect(home.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);

    await profile.goto(account.username);
    await expect(profile.activeTab).toHaveText('My Posts');
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);

    await page.goto(articleUrl);
    let dialogs = 0;
    page.on('dialog', (dialog) => {
      dialogs++;
      void dialog.dismiss();
    });
    const deleted = waitForApi(page, 'DELETE', ARTICLE_PATH);
    await article.deleteButtons.first().click();
    expect((await deleted).status()).toBe(204);

    await expect(page).toHaveURL('/');
    expect(dialogs).toBe(0);
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);

    await profile.goto(account.username);
    await expect(profile.emptyMessage).toBeVisible();
    await expect(profile.previews).toHaveCount(0);
  });

  test('32. rejects publishing an empty article [FR-050]', async ({ page }) => {
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);

    const editor = new EditorPage(page);
    const home = new HomePage(page);

    await editor.goto();
    const response = waitForApi(page, 'POST', '/api/articles');
    await editor.publish();
    expect((await response).status()).toBe(422);

    await expect(page).toHaveURL('/editor');
    await expect(editor.errors).toHaveText([
      "title can't be blank",
      "description can't be blank",
      "body can't be blank",
    ]);

    await home.goto('/');
    await expect(home.previews.first().getByRole('heading', { level: 1 })).toHaveText(
      'Release notes for testers',
    );
    await expect(home.previews).toHaveCount(10);
    await home.pagination.goTo(2);
    await expect(home.previews).toHaveCount(10);
    await home.pagination.goTo(3);
    await expect(home.previews).toHaveCount(4);
  });

  test('33. edits an article and gets a new address [FR-051] [FR-052]', async ({ page }) => {
    const account = disposableAccount('edit');
    await signUp(page, account);

    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const profile = new ProfilePage(page);
    const runId = uniqueRunId();
    const sourceTitle = `QA edit source ${runId}`;
    const editedTitle = `QA edited title ${runId}`;

    await editor.goto();
    await editor.fillArticle({
      title: sourceTitle,
      description: 'Before the edit',
      body: 'Body before the edit.',
    });
    await editor.addTag('testing');
    const created = waitForApi(page, 'POST', '/api/articles');
    await editor.publish();
    expect((await created).status()).toBe(201);
    await expect(page).toHaveURL(slugPattern(sourceTitle));
    const sourceSlug = slugFromArticleUrl(page.url());

    await article.editLinks.first().click();
    await expect(page).toHaveURL(`/editor/${sourceSlug}`);
    await expect(editor.titleInput).toHaveValue(sourceTitle);
    await expect(editor.descriptionInput).toHaveValue('Before the edit');
    await expect(editor.bodyInput).toHaveValue('Body before the edit.');
    await expect(editor.tags).toHaveText(['testing']);

    await editor.titleInput.fill(editedTitle);
    const updated = waitForApi(page, 'PUT', ARTICLE_PATH);
    await editor.publish();
    expect((await updated).status()).toBe(200);

    await expect(page).toHaveURL(slugPattern(editedTitle));
    await expect(article.title).toHaveText(editedTitle);
    const editedUrl = page.url();

    await profile.goto(account.username);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(editedTitle);

    await page.goto(editedUrl);
    const deleted = waitForApi(page, 'DELETE', ARTICLE_PATH);
    await article.deleteButtons.first().click();
    expect((await deleted).status()).toBe(204);
    await expect(page).toHaveURL('/');
  });

  test('34. reslugs every save and rejects an emptied title [FR-052] [FR-053]', async ({ page }) => {
    const account = disposableAccount('reslug');
    await signUp(page, account);

    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const title = `QA reslug test ${uniqueRunId()}`;

    await editor.goto();
    await editor.fillArticle({
      title,
      description: 'Reslug check',
      body: 'Body for the reslug check.',
    });
    const created = waitForApi(page, 'POST', '/api/articles');
    await editor.publish();
    expect((await created).status()).toBe(201);
    await expect(page).toHaveURL(slugPattern(title));
    const firstUrl = page.url();

    await article.editLinks.first().click();
    await expect(editor.titleInput).toHaveValue(title);
    const firstUpdate = waitForApi(page, 'PUT', ARTICLE_PATH);
    await editor.publish();
    expect((await firstUpdate).status()).toBe(200);
    await expect(page).toHaveURL(slugPattern(title));
    const secondUrl = page.url();
    expect(secondUrl).not.toBe(firstUrl);
    await expect(article.title).toHaveText(title);

    await article.editLinks.first().click();
    const secondSlug = slugFromArticleUrl(secondUrl);
    await expect(page).toHaveURL(`/editor/${secondSlug}`);
    await expect(editor.titleInput).toHaveValue(title);
    await editor.titleInput.fill('');
    const rejected = waitForApi(page, 'PUT', ARTICLE_PATH);
    await editor.publish();
    expect((await rejected).status()).toBe(422);

    await expect(page).toHaveURL(`/editor/${secondSlug}`);
    await expect(
      editor.errors.filter({ hasText: 'title String must contain at least 1 character(s)' }),
    ).toHaveCount(1);

    await page.goto(secondUrl);
    await expect(article.title).toHaveText(title);

    const deleted = waitForApi(page, 'DELETE', ARTICLE_PATH);
    await article.deleteButtons.first().click();
    expect((await deleted).status()).toBe(204);
    await expect(page).toHaveURL('/');
  });

  test("35. blocks editing another user's article [FR-054]", async ({ page }) => {
    await signIn(page, SEED_USERS.erin.email, SEED_PASSWORD);

    const editor = new EditorPage(page);
    const home = new HomePage(page);

    await editor.goto(SEED_ARTICLES.flaky);
    await expect(page).toHaveURL('/');
    await expect(editor.titleInput).toHaveCount(0);
    await expect(home.globalFeedTab).toHaveClass(/active/);
  });
});
