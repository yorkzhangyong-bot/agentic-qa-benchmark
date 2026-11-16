import { test, expect } from '@playwright/test';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';
import { AuthPage } from './pages/AuthPage';
import { PASSWORD, registerUser, throwawayUser, uniqueSuffix } from './fixtures/auth';

test.describe('Security and third-party resources', () => {
  test('43. script tags in article body are not executed [FR-044]', async ({ page }) => {
    const user = throwawayUser('xss');
    const title = `Xss probe ${uniqueSuffix()}`;
    const body = `**bold** <script>window.__xssProbe = true; alert('xss')</script>`;
    await registerUser(page, user);

    const dialogs: string[] = [];
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    const editor = new EditorPage(page);
    await editor.goto();
    await editor.fill(title, 'Xss description', body);
    const created = page.waitForResponse(r => r.url().endsWith('/api/articles') && r.request().method() === 'POST');
    await editor.publish();
    expect((await created).status()).toBe(201);
    await expect(page).toHaveURL(/\/article\/Xss-probe-/);

    const article = new ArticlePage(page);
    await expect(article.heading).toHaveText(title);
    await expect(article.body.locator('strong')).toHaveText('bold');
    expect(await page.evaluate(() => (window as unknown as { __xssProbe?: boolean }).__xssProbe)).toBeUndefined();
    expect(dialogs).toEqual([]);

    const slug = new URL(page.url()).pathname.replace('/article/', '');
    const removed = page.waitForResponse(
      r => r.url().endsWith(`/api/articles/${slug}`) && r.request().method() === 'DELETE',
    );
    await page.getByRole('button', { name: 'Delete Article' }).first().click();
    expect((await removed).status()).toBe(204);
  });

  test('76. no page loads third-party resources [SC-010]', async ({ page }) => {
    const hosts = new Set<string>();
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        hosts.add(url.host);
      }
    });

    await page.goto('/');
    await expect(page.locator('app-article-preview').first()).toBeVisible();
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
    await page.goto('/register');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign up');
    await page.goto('/tag/playwright');
    await expect(page.locator('app-article-preview')).toHaveCount(3);
    await page.goto('/article/Flaky-tests:-a-field-guide-45af9838');
    await expect(page.locator('app-article-page h1')).toHaveText('Flaky tests: a field guide');
    await page.goto('/profile/alice');
    await expect(page.locator('.user-info h4')).toHaveText('alice');
    await page.goto('/profile/alice/favorites');
    await expect(page.locator('app-article-preview')).toHaveCount(6);

    const auth = new AuthPage(page);
    await auth.goto('/login');
    await auth.login('alice@example.com', PASSWORD);
    await expect(page).toHaveURL('/');
    await page.goto('/editor');
    await expect(page.getByPlaceholder('Article Title')).toBeVisible();
    await page.goto('/settings');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your Settings');
    await page.goto('/article/Release-notes-for-testers-e3d269ed');
    await expect(page.locator('app-article-page h1')).toHaveText('Release notes for testers');

    expect([...hosts].sort()).toEqual(['localhost:3000', 'localhost:4200']);
  });
});
