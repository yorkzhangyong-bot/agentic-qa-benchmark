import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { PASSWORD, signInAs } from './fixtures/auth';

test.describe('Popular tags and tag pages', () => {
  test('9. popular tags lists ten tags in use order [FR-034]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    expect(await home.popularTagNames()).toEqual([
      'testing',
      'automation',
      'sqlite',
      'nodejs',
      'angular',
      'ci',
      'career',
      'playwright',
      'performance',
      'accessibility',
    ]);
    await expect(home.popularTags).toHaveCount(10);
    await expect(home.popularTags.filter({ hasText: 'security' })).toHaveCount(0);
  });

  test('10. clicking a tag opens its page with a selected tag tab [FR-035]', async ({ page }) => {
    const home = new HomePage(page);
    await signInAs(page, 'alice@example.com', PASSWORD);

    await home.popularTags.filter({ hasText: 'playwright' }).click();
    await expect(page).toHaveURL('/tag/playwright');

    expect(await home.tabNames()).toEqual(['Your Feed', 'Global Feed', 'playwright']);
    await expect(home.activeTab).toHaveText('playwright');
    expect(await home.titles()).toEqual([
      'Exploratory testing sessions that actually find bugs',
      'Page objects or not?',
      'Writing your first end-to-end test',
    ]);

    for (const title of await home.titles()) {
      expect((await home.preview(title).tags.allInnerTexts()).map(t => t.trim())).toContain('playwright');
    }
  });

  test('11. tag pages work by address including an unused tag [FR-036]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/tag/security');

    expect(await home.titles()).toEqual(['Backups for SQLite, the boring way']);
    expect(await home.tabNames()).toEqual(['Global Feed', 'security']);
    await expect(home.activeTab).toHaveText('security');

    await home.goto('/tag/nonexistent');
    await expect(home.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageItems).toHaveCount(0);
  });

  test('12. global feed on a tag page removes the tag tab [FR-037]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/tag/playwright');
    await expect(home.activeTab).toHaveText('playwright');

    await page.getByRole('link', { name: 'Global Feed' }).click();
    await expect(page).toHaveURL('/');
    expect(await home.tabNames()).toEqual(['Global Feed']);
    await expect(home.activeTab).toHaveText('Global Feed');
    await expect(home.previews).toHaveCount(10);
  });
});
