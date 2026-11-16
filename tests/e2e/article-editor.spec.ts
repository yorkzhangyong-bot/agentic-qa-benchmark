import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { deleteArticle, publishArticle, registerUser, signInAs, throwawayUser, uniqueSuffix } from './fixtures/auth';

test.describe('Article editor', () => {
  test('52. editor shows its fields [FR-047]', async ({ page }) => {
    await signInAs(page, 'alice@example.com');
    const editor = new EditorPage(page);
    await editor.goto();

    await expect(editor.titleInput).toBeVisible();
    await expect(editor.descriptionInput).toBeVisible();
    await expect(editor.bodyInput).toBeVisible();
    await expect(editor.tagInput).toBeVisible();
    await expect(editor.publishButton).toBeVisible();
    await expect(editor.errors).toHaveCount(0);
  });

  test('53. editor tag input adds, deduplicates and removes tags [FR-048]', async ({ page }) => {
    const user = throwawayUser('tags');
    await registerUser(page, user);
    const editor = new EditorPage(page);
    await editor.goto();

    await editor.addTag('zebra');
    await expect(editor.tagPills).toHaveCount(1);
    await expect(editor.tagPills.filter({ hasText: 'zebra' })).toHaveCount(1);
    await expect(editor.tagInput).toHaveValue('');

    await editor.addTag('zebra');
    await expect(editor.tagPills).toHaveCount(1);

    await editor.addTag('   ');
    await expect(editor.tagPills).toHaveCount(1);

    await editor.addTag('testing');
    await expect(editor.tagPills).toHaveCount(2);

    await editor.removeTag('zebra');
    await expect(editor.tagPills).toHaveCount(1);
    await expect(editor.tagPills.filter({ hasText: 'zebra' })).toHaveCount(0);

    await editor.tagInput.fill('pending');
    const title = `Tag test ${uniqueSuffix()}`;
    await editor.fill(title, 'Tag description', 'Tag body');
    const created = page.waitForResponse(r => r.url().endsWith('/api/articles') && r.request().method() === 'POST');
    await editor.publish();
    expect((await created).status()).toBe(201);

    const article = new ArticlePage(page);
    await expect(article.heading).toHaveText(title);
    expect(await article.tagNames()).toEqual(expect.arrayContaining(['testing', 'pending']));
    await deleteArticle(page, new URL(page.url()).pathname.replace('/article/', ''));
  });

  test('54. publishing creates the article first in feed and posts [FR-049]', async ({ page }) => {
    const user = throwawayUser('publish');
    const suffix = uniqueSuffix();
    const title = `Zebra tags test ${suffix}`;
    const description = `Description ${suffix}`;
    const body = `Body **markdown** ${suffix}`;
    await registerUser(page, user);

    const slug = await publishArticle(page, { title, description, body, tags: ['testing', 'automation'] });
    expect(page.url()).toMatch(new RegExp(`/article/Zebra-tags-test-${suffix}-[a-z0-9]{8}$`));

    const article = new ArticlePage(page);
    await expect(article.heading).toHaveText(title);
    await expect(article.body.locator('strong')).toHaveText('markdown');
    await expect(article.body).toContainText(`markdown ${suffix}`);
    expect(await article.tagNames()).toEqual(expect.arrayContaining(['testing', 'automation']));

    const home = new HomePage(page);
    await home.goto();
    const first = home.previews.first();
    await expect(first.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(first.locator('p')).toHaveText(description);

    const profile = new ProfilePage(page);
    await profile.goto(user.username);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);

    await deleteArticle(page, slug);
  });

  test('55. editing an article updates it at a new address [FR-051][FR-052]', async ({ page }) => {
    const user = throwawayUser('edit');
    const suffix = uniqueSuffix();
    const oldTitle = `Edit probe ${suffix}`;
    const newTitle = `Edited probe ${suffix}`;
    await registerUser(page, user);
    const oldSlug = await publishArticle(page, {
      title: oldTitle,
      description: `First description ${suffix}`,
      body: `First body ${suffix}`,
      tags: ['testing', 'automation'],
    });

    await expect(page.getByRole('heading', { name: oldTitle })).toBeVisible();
    await page.getByRole('link', { name: 'Edit Article' }).first().click();
    await expect(page).toHaveURL(`/editor/${oldSlug}`);
    const editor = new EditorPage(page);
    await expect(editor.titleInput).toHaveValue(oldTitle);
    await expect(editor.descriptionInput).toHaveValue(`First description ${suffix}`);
    await expect(editor.bodyInput).toHaveValue(`First body ${suffix}`);
    expect(await editor.tagNames()).toEqual(expect.arrayContaining(['testing', 'automation']));

    await editor.titleInput.fill(newTitle);
    await editor.descriptionInput.fill(`Second description ${suffix}`);
    await editor.bodyInput.fill(`Second body ${suffix}`);
    const updated = page.waitForResponse(
      r => r.url().endsWith(`/api/articles/${oldSlug}`) && r.request().method() === 'PUT',
    );
    await editor.publish();
    expect((await updated).status()).toBe(200);

    await expect(page).toHaveURL(new RegExp(`/article/Edited-probe-${suffix}-[a-z0-9]{8}$`));
    const newSlug = new URL(page.url()).pathname.replace('/article/', '');
    expect(newSlug).not.toBe(oldSlug);

    const article = new ArticlePage(page);
    await expect(article.heading).toHaveText(newTitle);
    await expect(article.body).toContainText(`Second body ${suffix}`);
    await expect(article.body).not.toContainText(`First body ${suffix}`);
    await expect(article.author).toHaveText(user.username);
    expect(await article.tagNames()).toEqual(expect.arrayContaining(['testing', 'automation']));

    const profile = new ProfilePage(page);
    await profile.goto(user.username);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(newTitle);

    await deleteArticle(page, newSlug);
  });

  test('56. every save gives an article a new address [FR-052]', async ({ page }) => {
    const user = throwawayUser('resave');
    const suffix = uniqueSuffix();
    const title = `Resave probe ${suffix}`;
    await registerUser(page, user);
    const firstSlug = await publishArticle(page, {
      title,
      description: `Resave description ${suffix}`,
      body: `Resave body ${suffix}`,
    });
    const firstUrl = page.url();

    await page.getByRole('link', { name: 'Edit Article' }).first().click();
    const editor = new EditorPage(page);
    await expect(editor.titleInput).toHaveValue(title);
    const updated = page.waitForResponse(
      r => r.url().endsWith(`/api/articles/${firstSlug}`) && r.request().method() === 'PUT',
    );
    await editor.publish();
    expect((await updated).status()).toBe(200);

    await expect(page).toHaveURL(new RegExp(`/article/Resave-probe-${suffix}-[a-z0-9]{8}$`));
    const secondUrl = page.url();
    expect(secondUrl).not.toBe(firstUrl);
    const secondSlug = new URL(secondUrl).pathname.replace('/article/', '');
    expect(secondSlug.split('-').slice(-1)[0]).not.toBe(firstSlug.split('-').slice(-1)[0]);
    await expect(new ArticlePage(page).heading).toHaveText(title);

    await deleteArticle(page, secondSlug);
  });

  test('57. emptying fields while editing is rejected [FR-053]', async ({ page }) => {
    const user = throwawayUser('emptyedit');
    const suffix = uniqueSuffix();
    const title = `Keep probe ${suffix}`;
    await registerUser(page, user);
    const slug = await publishArticle(page, {
      title,
      description: `Keep description ${suffix}`,
      body: `Keep body ${suffix}`,
    });
    const articleUrl = page.url();

    await page.getByRole('link', { name: 'Edit Article' }).first().click();
    const editor = new EditorPage(page);
    await editor.titleInput.fill('');
    await editor.descriptionInput.fill('');
    await editor.bodyInput.fill('');
    const rejected = page.waitForResponse(
      r => r.url().endsWith(`/api/articles/${slug}`) && r.request().method() === 'PUT',
    );
    await editor.publish();
    expect((await rejected).status()).toBe(422);

    await expect(page).toHaveURL(`/editor/${slug}`);
    expect(await editor.errorMessages()).toEqual([
      'title String must contain at least 1 character(s)',
      'description String must contain at least 1 character(s)',
      'body String must contain at least 1 character(s)',
    ]);

    await page.goto(articleUrl);
    const article = new ArticlePage(page);
    await expect(article.heading).toHaveText(title);
    await expect(article.body).toContainText(`Keep body ${suffix}`);
    await expect(page).toHaveURL(new RegExp(`/article/Keep-probe-${suffix}-[a-z0-9]{8}$`));

    const profile = new ProfilePage(page);
    await profile.goto(user.username);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(title);

    await deleteArticle(page, slug);
  });

  test('58. publishing an empty article is rejected [FR-050]', async ({ page }) => {
    const user = throwawayUser('emptyarticle');
    await registerUser(page, user);
    const editor = new EditorPage(page);
    await editor.goto();
    await expect(editor.titleInput).toHaveValue('');
    await expect(editor.descriptionInput).toHaveValue('');
    await expect(editor.bodyInput).toHaveValue('');

    const rejected = page.waitForResponse(r => r.url().endsWith('/api/articles') && r.request().method() === 'POST');
    await editor.publish();
    expect((await rejected).status()).toBe(422);

    await expect(page).toHaveURL('/editor');
    expect(await editor.errorMessages()).toEqual([
      "title can't be blank",
      "description can't be blank",
      "body can't be blank",
    ]);

    const home = new HomePage(page);
    await home.goto();
    await expect(home.previews.first().getByRole('heading', { level: 1 })).toHaveText('Release notes for testers');

    const profile = new ProfilePage(page);
    await profile.goto(user.username);
    await expect(profile.emptyMessage).toHaveText('No articles are here... yet.');
  });

  test("59. another user's editor redirects home [FR-054]", async ({ page }) => {
    await signInAs(page, 'alice@example.com');
    await page.goto('/editor/Rate-limiting-in-Node-without-Redis-c538a5ec');

    await expect(page).toHaveURL('/');
    await expect(new HomePage(page).previews.first()).toBeVisible();
    await expect(page.getByPlaceholder('Article Title')).toHaveCount(0);
  });

  test('60. deleting an article removes it immediately [FR-055]', async ({ page }) => {
    const user = throwawayUser('delete');
    const suffix = uniqueSuffix();
    const title = `Delete probe ${suffix}`;
    const tag = `deletetag${suffix}`;
    await registerUser(page, user);
    const slug = await publishArticle(page, {
      title,
      description: `Delete description ${suffix}`,
      body: `Delete body ${suffix}`,
      tags: [tag],
    });

    const dialogs: string[] = [];
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    const removed = page.waitForResponse(
      r => r.url().endsWith(`/api/articles/${slug}`) && r.request().method() === 'DELETE',
    );
    await page.getByRole('button', { name: 'Delete Article' }).first().click();
    expect((await removed).status()).toBe(204);

    await expect(page).toHaveURL('/');
    expect(dialogs).toEqual([]);
    const home = new HomePage(page);
    await expect(home.previews.first()).toBeVisible();
    await expect(home.previews.filter({ hasText: title })).toHaveCount(0);

    const profile = new ProfilePage(page);
    await profile.goto(user.username);
    await expect(profile.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(profile.previews.filter({ hasText: title })).toHaveCount(0);

    await home.goto(`/tag/${tag}`);
    await expect(home.emptyMessage).toHaveText('No articles are here... yet.');
  });
});
