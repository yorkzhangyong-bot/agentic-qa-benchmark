import { test, expect } from '@playwright/test';
import { cleanupArticle, uniqueId, withApi } from './fixtures/api';
import { signIn } from './fixtures/ui';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';

test.describe('Article authoring', () => {
  let createdTitle: string | undefined;

  test.afterEach(async () => {
    if (createdTitle) await cleanupArticle(createdTitle);
    createdTitle = undefined;
  });

  test('42. editor fields [FR-047]', async ({ page }) => {
    const editor = new EditorPage(page);
    await signIn(page);
    await editor.goto('/editor');

    await expect(editor.titleInput).toBeVisible();
    await expect(editor.descriptionInput).toBeVisible();
    await expect(editor.bodyInput).toBeVisible();
    await expect(editor.tagInput).toBeVisible();
    await expect(editor.publishButton).toBeVisible();
  });

  test('43. publish article opens slug and appears first [FR-049, SC-003]', async ({ page }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    const runId = uniqueId('run');
    const title = `Zebra tags test ${runId}`;
    createdTitle = title;

    await signIn(page);
    await editor.goto('/editor');
    await editor.fill(title, 'A zebra article for testing', 'Body for the zebra article.');
    await editor.addTag('zebra');
    await editor.addTag('testing');
    await editor.publish();

    await expect(page).toHaveURL(new RegExp(`/article/Zebra-tags-test-${runId}-[A-Za-z0-9]{8}$`));
    await expect(article.title).toHaveText(title);
    // Both tags must be shown; their order is not specified (FR-042).
    await expect(article.tagItems).toHaveCount(2);
    await expect(article.tagItems.filter({ hasText: 'zebra' })).toHaveCount(1);
    await expect(article.tagItems.filter({ hasText: 'testing' })).toHaveCount(1);

    await home.goto('/');
    await expect(home.previews.getByRole('heading').first()).toHaveText(title);

    await profile.goto('alice');
    await expect(profile.previews.getByRole('heading').first()).toHaveText(title);
  });

  test('44. publish empty article shows three errors [FR-050, SC-004]', async ({ page }) => {
    const editor = new EditorPage(page);
    await signIn(page);
    await editor.goto('/editor');

    await editor.publish();

    await expect(editor.errors).toContainText("title can't be blank");
    await expect(editor.errors).toContainText("description can't be blank");
    await expect(editor.errors).toContainText("body can't be blank");
    await expect(page).toHaveURL('/editor');
    await withApi(async api => {
      expect(await api.articleCount()).toBe(24);
    });
  });

  test('45. editor tag entry behaviour [FR-048]', async ({ page }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const title = `Tag behaviour ${uniqueId('run')}`;
    createdTitle = title;

    await signIn(page);
    await editor.goto('/editor');

    await editor.addTag('zebra');
    await expect(editor.tagChip('zebra')).toBeVisible();
    await expect(editor.tagInput).toHaveValue('');

    await editor.addTag('zebra');
    await expect(editor.tagChips).toHaveCount(1);

    await editor.addTag('   ');
    await expect(editor.tagChips).toHaveCount(1);

    await editor.tagChip('zebra').locator('.ion-close-round').click();
    await expect(editor.tagChips).toHaveCount(0);

    await editor.tagInput.fill('leftover');
    await editor.fill(title, 'Tag entry behaviour', 'Body for the tag entry article.');
    await editor.publish();

    await expect(article.title).toHaveText(title);
    await expect(article.tagItems).toHaveText(['leftover']);
  });

  test('46. edit article prefills title, description, body and tags [FR-051]', async ({ page }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    await signIn(page);
    const slug = await withApi(async api => (await api.findArticle('Page objects or not?')).slug);

    await article.goto(slug);
    await article.topActions.getByRole('link', { name: /Edit Article/ }).click();

    await expect(page).toHaveURL(`/editor/${slug}`);
    await expect(editor.titleInput).toHaveValue('Page objects or not?');
    await expect(editor.descriptionInput).toHaveValue('Structuring UI tests so they survive redesigns');
    await expect(editor.bodyInput).toHaveValue(/Page objects help when many tests share the same screens/);
    // Both tags must be filled in; their order is not specified (FR-051).
    await expect(editor.tagChips).toHaveCount(2);
    await expect(editor.tagChip('testing')).toHaveCount(1);
    await expect(editor.tagChip('playwright')).toHaveCount(1);
  });

  test('47. edit title saves and changes slug [FR-052]', async ({ page }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const runId = uniqueId('run');
    const originalTitle = `qa-edit ${runId}`;
    const newTitle = `Edited title ${runId}`;

    const created = await withApi(async api => {
      const token = await api.userToken('alice');
      return api.createArticle(token, {
        title: originalTitle,
        description: 'A disposable article for editing',
        body: 'The original body of the disposable article.',
      });
    });
    createdTitle = originalTitle;

    await signIn(page);
    await article.goto(created.slug);
    await article.topActions.getByRole('link', { name: /Edit Article/ }).click();
    await expect(page).toHaveURL(`/editor/${created.slug}`);

    await editor.titleInput.fill(newTitle);
    await editor.publish();
    createdTitle = newTitle;

    await expect(page).toHaveURL(new RegExp(`/article/Edited-title-${runId}-[A-Za-z0-9]{8}$`));
    await expect(article.title).toHaveText(newTitle);
  });

  test('48. save unchanged title still changes slug [FR-052]', async ({ page }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const runId = uniqueId('run');
    const title = `Unchanged title ${runId}`;

    const created = await withApi(async api => {
      const token = await api.userToken('alice');
      return api.createArticle(token, {
        title,
        description: 'A disposable article for the unchanged-title edit',
        body: 'The body does not change either.',
      });
    });
    createdTitle = title;

    await signIn(page);
    await article.goto(created.slug);
    const originalUrl = page.url();
    await article.topActions.getByRole('link', { name: /Edit Article/ }).click();
    await editor.publish();

    await expect(article.title).toHaveText(title);
    await expect(page).toHaveURL(new RegExp(`/article/Unchanged-title-${runId}-[A-Za-z0-9]{8}$`));
    expect(page.url()).not.toBe(originalUrl);
  });

  test('49. edit empty fields show String must contain messages [FR-053, SC-004]', async ({ page }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const title = `qa-empty-fields ${uniqueId('run')}`;
    const description = 'A disposable article that must not be blanked';
    const body = 'The original body stays even when the editor is cleared.';

    const created = await withApi(async api => {
      const token = await api.userToken('alice');
      return api.createArticle(token, { title, description, body });
    });
    createdTitle = title;

    await signIn(page);
    await article.goto(created.slug);
    await article.topActions.getByRole('link', { name: /Edit Article/ }).click();
    await expect(page).toHaveURL(`/editor/${created.slug}`);

    await editor.titleInput.fill('');
    await editor.descriptionInput.fill('');
    await editor.bodyInput.fill('');
    await editor.publish();

    await expect(editor.errors).toContainText('title String must contain at least 1 character(s)');
    await expect(editor.errors).toContainText('description String must contain at least 1 character(s)');
    await expect(editor.errors).toContainText('body String must contain at least 1 character(s)');
    await expect(page).toHaveURL(`/editor/${created.slug}`);

    await article.goto(created.slug);
    await expect(article.title).toHaveText(title);
    await expect(article.articleBody).toContainText(body);

    // The description is not rendered on the article page, so confirm it through the API.
    await withApi(async api => {
      const stored = await api.articleBySlug(created.slug);
      expect(stored.title).toBe(title);
      expect(stored.description).toBe(description);
      expect(stored.body).toBe(body);
    });
  });

  test('50. other author editor URL redirects home [FR-054]', async ({ page }) => {
    await signIn(page, 'bob@example.com');
    const slug = await withApi(async api => (await api.findArticle('Flaky tests: a field guide')).slug);

    await page.goto(`/editor/${slug}`);

    await expect(page).toHaveURL('/');
  });

  test('51. delete article immediately returns home [FR-055]', async ({ page }) => {
    const article = new ArticlePage(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    const title = `qa-delete ${uniqueId('run')}`;

    const created = await withApi(async api => {
      const token = await api.userToken('alice');
      return api.createArticle(token, {
        title,
        description: 'A disposable article for deletion',
        body: 'Delete me.',
      });
    });
    // If the test fails before the article is deleted, afterEach removes it, so later tests see the seed data.
    createdTitle = title;

    await signIn(page);
    await article.goto(created.slug);
    await article.topActions.getByRole('button', { name: /Delete Article/ }).click();

    await expect(page).toHaveURL('/');
    await expect(home.previews.filter({ hasText: title })).toHaveCount(0);

    await profile.goto('alice');
    await expect(profile.previews.filter({ hasText: title })).toHaveCount(0);
  });
});
