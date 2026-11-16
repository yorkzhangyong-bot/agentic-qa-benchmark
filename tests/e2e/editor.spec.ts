import { test, expect } from './support/fixtures';
import {
  PASSWORD,
  articlesCount,
  createArticle,
  deleteArticle,
  signInWithToken,
  unique,
} from './support/api';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';

const FLAKY_SLUG = 'Flaky-tests:-a-field-guide-45af9838';
const KEYBOARD_SLUG = 'Keyboard-navigation-checklist-7459b474';

test.describe('Editor', () => {
  /** Covers FR-047 */
  test('53. the editor shows the documented fields and publish button [FR-047]', async ({ page, request }) => {
    const editor = new EditorPage(page);

    await signInWithToken(page, request, 'alice@example.com', '/editor');

    await expect(editor.titleInput).toBeVisible();
    await expect(editor.titleInput).toHaveAttribute('placeholder', 'Article Title');
    await expect(editor.descriptionInput).toHaveAttribute('placeholder', "What's this article about?");
    await expect(editor.bodyInput).toHaveAttribute('placeholder', 'Write your article (in markdown)');
    await expect(editor.tagInput).toHaveAttribute('placeholder', 'Enter tags');
    await expect(editor.publishButton).toBeVisible();
    await expect(editor.tagChips).toHaveCount(0);
    await expect(editor.tagInput).toHaveValue('');
  });

  /** Covers FR-049, AC3.1, SC-003 */
  test('54. publishing a new article with two tags opens its page and puts it first in both lists [FR-049, SC-003]', async ({
    page,
    request,
    cleanup,
  }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    const id = unique('publish');
    const title = `QA publish ${id}`;
    const description = `QA description ${id}`;
    const body = `QA body ${id}`;
    const tag = `qa-${id}`;

    const token = await signInWithToken(page, request, 'alice@example.com', '/editor');
    await editor.fill(title, description, body);
    await editor.addTag(tag);
    await editor.addTag('testing');

    const response = page.waitForResponse(
      res => res.url().endsWith('/api/articles') && res.request().method() === 'POST',
    );
    await editor.publish();
    const created = await response;
    expect(created.status()).toBe(201);
    const json = await created.json();
    cleanup.add(() => deleteArticle(request, token, json.article.slug));

    await expect(page).toHaveURL(new RegExp(`/article/QA-publish-${id}-[A-Za-z0-9]{8}$`));
    await expect(article.title).toHaveText(title);
    await expect(page.getByText(body)).toBeVisible();
    const tags = (await article.tags.allTextContents()).map(value => value.trim()).sort();
    expect(tags).toEqual([tag, 'testing'].sort());

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    expect((await home.previewTitles())[0]).toBe(title);
    // The article page shows title, body and tags; the description is shown by the list previews.
    await expect(home.preview(title).getByText(description)).toBeVisible();

    await profile.goto('alice');
    await expect(profile.previews).toHaveCount(10);
    await expect(profile.previews.getByRole('heading', { level: 1 }).first()).toHaveText(title);
  });

  /** Covers FR-048 (edge case) */
  test('55. tag entry adds on enter ignores duplicates and spaces and adds leftover text [FR-048]', async ({
    page,
    request,
    cleanup,
  }) => {
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const id = unique('tags');
    const title = `QA tags ${id}`;

    const token = await signInWithToken(page, request, 'alice@example.com', '/editor');

    await editor.addTag('zebra');
    await expect(editor.tagChips).toHaveCount(1);
    await expect(editor.tagChips).toHaveText(['zebra']);
    await expect(editor.tagInput).toHaveValue('');

    await editor.addTag('testing');
    await expect(editor.tagChips).toHaveCount(2);
    await expect(editor.tagInput).toHaveValue('');

    await editor.addTag('zebra');
    await expect(editor.tagChips).toHaveCount(2);

    await editor.addTag('   ');
    await expect(editor.tagChips).toHaveCount(2);

    await editor.removeTag('testing').click();
    await expect(editor.tagChips).toHaveCount(1);
    await expect(editor.tagChips).toHaveText(['zebra']);

    await editor.fill(title, `QA tags description ${id}`, `QA tags body ${id}`);
    await editor.tagInput.fill('leftover');
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/articles') && res.request().method() === 'POST',
    );
    await editor.publish();
    const created = await response;
    expect(created.status()).toBe(201);
    const json = await created.json();
    cleanup.add(() => deleteArticle(request, token, json.article.slug));

    await expect(article.title).toHaveText(title);
    const tags = (await article.tags.allTextContents()).map(value => value.trim()).sort();
    expect(tags).toEqual(['leftover', 'zebra']);
  });

  /** Covers FR-050, AC3.4, SC-004 */
  test('56. publishing with every field empty shows three messages and creates nothing [FR-050, SC-004]', async ({
    page,
    request,
  }) => {
    const editor = new EditorPage(page);

    await signInWithToken(page, request, 'alice@example.com', '/editor');
    const before = await articlesCount(request);

    const response = page.waitForResponse(
      res => res.url().endsWith('/api/articles') && res.request().method() === 'POST',
    );
    await editor.publish();
    expect((await response).status()).toBe(422);

    await expect(page).toHaveURL('/editor');
    await expect(editor.errors).toHaveText([
      "title can't be blank",
      "description can't be blank",
      "body can't be blank",
    ]);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);

    const after = await articlesCount(request);
    expect(after).toBe(before);
  });

  /** Covers FR-051, FR-052, AC3.2 */
  test('57. edit article opens prefilled and a new title saves at a new address [FR-051, FR-052]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const editor = new EditorPage(page);
    const id = unique('edit');
    const title = `QA edit ${id}`;
    const description = `QA edit description ${id}`;
    const body = `QA edit body ${id}`;
    const tag = `qa-${id}`;

    const token = await signInWithToken(page, request, 'alice@example.com', '/');
    const created = await createArticle(request, token, { title, description, body, tagList: [tag, 'testing'] });
    let slug = created.slug;
    cleanup.add(() => deleteArticle(request, token, slug));

    await article.goto(slug);
    await expect(article.title).toHaveText(title);
    await article.editLinks.first().click();
    await expect(page).toHaveURL(`/editor/${slug}`);

    await expect(editor.titleInput).toHaveValue(title);
    await expect(editor.descriptionInput).toHaveValue(description);
    await expect(editor.bodyInput).toHaveValue(body);
    const chips = (await editor.tagChips.allTextContents()).map(value => value.trim()).sort();
    expect(chips).toEqual([tag, 'testing'].sort());

    const newTitle = `QA edited ${id}`;
    await editor.titleInput.fill(newTitle);
    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${slug}`) && res.request().method() === 'PUT',
    );
    await editor.publish();
    const updated = await response;
    expect(updated.status()).toBe(200);
    const json = await updated.json();
    slug = json.article.slug;

    expect(slug).not.toBe(created.slug);
    await expect(page).toHaveURL(new RegExp(`/article/QA-edited-${id}-[A-Za-z0-9]{8}$`));
    await expect(article.title).toHaveText(newTitle);
  });

  /** Covers FR-052 (edge case) */
  test('58. saving without changing the title still changes the address [FR-052]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const editor = new EditorPage(page);
    const id = unique('reslug');
    const title = `QA reslug ${id}`;

    const token = await signInWithToken(page, request, 'alice@example.com', '/');
    const created = await createArticle(request, token, {
      title,
      description: `QA reslug description ${id}`,
      body: `QA reslug body ${id}`,
    });
    let slug = created.slug;
    cleanup.add(() => deleteArticle(request, token, slug));

    await editor.goto(slug);
    await expect(editor.titleInput).toHaveValue(title);

    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${slug}`) && res.request().method() === 'PUT',
    );
    await editor.publish();
    const updated = await response;
    expect(updated.status()).toBe(200);
    const json = await updated.json();
    const newSlug = json.article.slug as string;

    expect(newSlug).not.toBe(slug);
    expect(newSlug.replace(/-[A-Za-z0-9]{8}$/, '')).toBe(slug.replace(/-[A-Za-z0-9]{8}$/, ''));
    slug = newSlug;

    await expect(page).toHaveURL(`/article/${newSlug}`);
    await expect(article.title).toHaveText(title);
  });

  /** Covers FR-052 and the known-behaviour section */
  test('59. after an edit the other parts stay the lists update and the old address is empty [FR-052, KNOWN]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const editor = new EditorPage(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    const id = unique('after');
    const title = `QA after ${id}`;
    const description = `QA after description ${id}`;
    const body = `QA after body ${id}`;
    const tag = `qa-${id}`;
    const newTitle = `QA after edited ${id}`;

    const token = await signInWithToken(page, request, 'alice@example.com', '/');
    const created = await createArticle(request, token, { title, description, body, tagList: [tag, 'testing'] });
    const oldSlug = created.slug;
    let slug = oldSlug;
    cleanup.add(() => deleteArticle(request, token, slug));

    await article.goto(oldSlug);
    await article.editLinks.first().click();
    await expect(editor.titleInput).toHaveValue(title);
    await editor.titleInput.fill(newTitle);
    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${oldSlug}`) && res.request().method() === 'PUT',
    );
    await editor.publish();
    const updated = await response;
    expect(updated.status()).toBe(200);
    const json = await updated.json();
    slug = json.article.slug;

    await expect(article.title).toHaveText(newTitle);
    await expect(page.getByText(body)).toBeVisible();
    const tags = (await article.tags.allTextContents()).map(value => value.trim()).sort();
    expect(tags).toEqual([tag, 'testing'].sort());

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    expect((await home.previewTitles())[0]).toBe(newTitle);
    // The article page shows title, body and tags; the description is shown by the list previews.
    await expect(home.preview(newTitle).getByText(description)).toBeVisible();

    await profile.goto('alice');
    await expect(profile.previews.getByRole('heading', { level: 1 }).first()).toHaveText(newTitle);

    await page.goto(`/article/${oldSlug}`);
    await expect(page).toHaveURL(`/article/${oldSlug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  /** Covers FR-053, AC9.3, SC-004 */
  test('60. editing with emptied fields shows the string-must-contain messages [FR-053, SC-004]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const editor = new EditorPage(page);
    const id = unique('blankedit');
    const title = `QA blankedit ${id}`;
    const description = `QA blankedit description ${id}`;
    const body = `QA blankedit body ${id}`;

    const token = await signInWithToken(page, request, 'alice@example.com', '/');
    const created = await createArticle(request, token, { title, description, body });
    const slug = created.slug;
    cleanup.add(() => deleteArticle(request, token, slug));

    await editor.goto(slug);
    await expect(editor.titleInput).toHaveValue(title);
    await editor.titleInput.fill('');
    await editor.descriptionInput.fill('');
    await editor.bodyInput.fill('');

    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${slug}`) && res.request().method() === 'PUT',
    );
    await editor.publish();
    expect((await response).status()).toBe(422);

    await expect(page).toHaveURL(`/editor/${slug}`);
    await expect(editor.errors).toHaveText([
      'title String must contain at least 1 character(s)',
      'description String must contain at least 1 character(s)',
      'body String must contain at least 1 character(s)',
    ]);

    await page.reload();
    await expect(editor.titleInput).toHaveValue(title);
    await expect(editor.descriptionInput).toHaveValue(description);
    await expect(editor.bodyInput).toHaveValue(body);
    await article.goto(slug);
    await expect(article.title).toHaveText(title);
  });

  /** Covers FR-054 */
  test("61. opening another user's editor opens the home page [FR-054]", async ({ page, request }) => {
    const home = new HomePage(page);
    const editor = new EditorPage(page);

    await signInWithToken(page, request, 'alice@example.com', `/editor/${KEYBOARD_SLUG}`);

    await expect(page).toHaveURL('/');
    await expect(home.previews).toHaveCount(10);
    await expect(editor.titleInput).toHaveCount(0);
    await expect(page.getByText('Ten checks you can run in five minutes')).toHaveCount(0);
  });

  /** Covers FR-055, AC3.3 and the known-behaviour section */
  test('62. delete article removes it immediately and opens the home page [FR-055]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    const id = unique('delete');
    const title = `QA delete ${id}`;
    let dialogSeen = false;

    const token = await signInWithToken(page, request, 'alice@example.com', '/');
    const created = await createArticle(request, token, {
      title,
      description: `QA delete description ${id}`,
      body: `QA delete body ${id}`,
    });
    const slug = created.slug;
    cleanup.add(() => deleteArticle(request, token, slug));

    await article.goto(slug);
    await expect(article.title).toHaveText(title);

    page.on('dialog', async dialog => {
      dialogSeen = true;
      await dialog.dismiss();
    });
    const response = page.waitForResponse(
      res => res.url().endsWith(`/api/articles/${slug}`) && res.request().method() === 'DELETE',
    );
    await article.deleteButtons.first().click();
    expect((await response).status()).toBe(204);
    expect(dialogSeen).toBe(false);

    await expect(page).toHaveURL('/');
    await expect(home.previews).toHaveCount(10);
    await expect(home.preview(title)).toHaveCount(0);

    await profile.goto('alice');
    await expect(profile.preview(title)).toHaveCount(0);

    await page.goto(`/article/${slug}`);
    await expect(page).toHaveURL(`/article/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  /** Covers FR-044 (edge case) */
  test('63. a script tag in an article body is not executed while markdown still renders [FR-044]', async ({
    page,
    request,
    cleanup,
  }) => {
    const article = new ArticlePage(page);
    const editor = new EditorPage(page);
    const id = unique('xss');
    const title = `QA xss ${id}`;
    const marker = `QA bold ${id}`;
    const rest = `QA rest ${id}`;
    const body = `**${marker}**\n\n<script>window.__qaXss = true; alert('xss')</script>\n\n${rest}`;
    let dialogSeen = false;

    const token = await signInWithToken(page, request, 'alice@example.com', '/editor');
    await editor.fill(title, `QA xss description ${id}`, body);

    page.on('dialog', async dialog => {
      dialogSeen = true;
      await dialog.dismiss();
    });
    const response = page.waitForResponse(
      res => res.url().endsWith('/api/articles') && res.request().method() === 'POST',
    );
    await editor.publish();
    const created = await response;
    expect(created.status()).toBe(201);
    const json = await created.json();
    cleanup.add(() => deleteArticle(request, token, json.article.slug));

    await expect(article.title).toHaveText(title);
    await expect(article.body.locator('strong')).toHaveText(marker);
    await expect(article.body.locator('script')).toHaveCount(0);
    await expect(page.getByText(rest)).toBeVisible();
    expect(dialogSeen).toBe(false);
    const flag = await page.evaluate(() => (window as unknown as { __qaXss?: boolean }).__qaXss);
    expect(flag).toBeUndefined();
  });

  /** Covers FR-045 */
  test('64. author non-author and signed-out visitors see different article controls [FR-045]', async ({
    page,
  }) => {
    const article = new ArticlePage(page);
    const login = new LoginPage(page);
    const settings = new SettingsPage(page);

    await article.goto(FLAKY_SLUG);
    await expect(article.followButtons).toHaveCount(2);
    await expect(article.followButtons.first()).toHaveText('Follow alice');
    await expect(article.followButtons.last()).toHaveText('Follow alice');
    await expect(article.favoriteButtons).toHaveCount(2);
    await expect(article.favoriteButtons.first()).toHaveText('Favorite Article (4)');
    await expect(article.favoriteButtons.last()).toHaveText('Favorite Article (4)');
    await expect(article.editLinks).toHaveCount(0);
    await expect(article.deleteButtons).toHaveCount(0);

    await login.goto();
    await login.email.fill('alice@example.com');
    await login.password.fill(PASSWORD);
    let response = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await response).status()).toBe(200);
    await article.goto(FLAKY_SLUG);
    await expect(article.editLinks).toHaveCount(2);
    await expect(article.deleteButtons).toHaveCount(2);
    await expect(article.followButtons).toHaveCount(0);
    await expect(article.favoriteButtons).toHaveCount(0);

    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');
    await login.goto();
    await login.email.fill('erin@example.com');
    await login.password.fill(PASSWORD);
    response = page.waitForResponse(
      res => res.url().endsWith('/api/users/login') && res.request().method() === 'POST',
    );
    await login.submit.click();
    expect((await response).status()).toBe(200);

    await article.goto(FLAKY_SLUG);
    await expect(article.followButtons).toHaveCount(2);
    await expect(article.followButtons.first()).toHaveText('Follow alice');
    await expect(article.favoriteButtons).toHaveCount(2);
    await expect(article.favoriteButtons.first()).toHaveText('Unfavorite Article (4)');
    await expect(article.editLinks).toHaveCount(0);
    await expect(article.deleteButtons).toHaveCount(0);
  });
});
