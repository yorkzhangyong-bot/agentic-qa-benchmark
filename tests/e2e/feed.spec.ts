import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { signIn } from './fixtures/ui';

test.describe('Feeds, pagination and tags', () => {
  test('5. global feed page 1 lists ten newest articles [FR-027, FR-038]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/');

    await expect(home.previews).toHaveCount(10);

    const first = home.preview('Release notes for testers');
    await expect(first.getByRole('heading')).toHaveText('Release notes for testers');
    await expect(first.getByRole('link', { name: 'alice', exact: true })).toBeVisible();
    await expect(first.locator('.date')).toHaveText('January 28, 2026');

    await expect(home.previews.getByRole('heading').last()).toHaveText('Migrating a Node service to ESM');
    await expect(home.preview('Migrating a Node service to ESM').getByRole('link', { name: 'bob', exact: true })).toBeVisible();

    await expect(home.pageButtons).toHaveText(['1', '2', '3']);
    await expect(home.activePage).toHaveText('1');

    await expect(home.feedToggle.getByRole('link')).toHaveCount(1);
    await expect(home.activeTab).toHaveText('Global Feed');
  });

  test('6. global feed page 3 shows four oldest articles [FR-027, FR-039, SC-001]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/');

    await home.clickPage(3);

    await expect(page).toHaveURL('/?page=3');
    await expect(home.previews).toHaveCount(4);
    await expect(home.previews.getByRole('heading')).toHaveText([
      'Accessible forms in Angular',
      'Writing your first end-to-end test',
      'SQLite is enough for most side projects',
      'Why we test',
    ]);
    await expect(home.activePage).toHaveText('3');

    await home.clickPage(1);
    await expect(page).toHaveURL('/');
    await expect(home.previews).toHaveCount(10);

    await home.goto('/?page=2');
    await expect(home.previews.getByRole('heading').first()).toHaveText('Markdown cheat sheet for Conduit authors');
    await expect(home.activePage).toHaveText('2');
  });

  test('7. article preview metadata and alphabetical tags [FR-028, SC-009]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/?page=2');

    const preview = home.preview('Flaky tests: a field guide');
    await expect(preview.getByRole('heading')).toHaveText('Flaky tests: a field guide');
    await expect(preview.getByRole('link', { name: 'alice', exact: true })).toBeVisible();
    await expect(preview.locator('a[href="/profile/alice"]')).toHaveCount(2);
    await expect(preview.locator('.date')).toHaveText('January 9, 2026');
    await expect(preview.getByRole('button')).toHaveText('4');
    await expect(preview.getByText('How to find, fix and prevent tests that fail at random')).toBeVisible();
    await expect(preview.getByText('Read more...')).toBeVisible();
    await expect(preview.locator('.tag-list li')).toHaveText(['automation', 'ci', 'testing']);
  });

  test('8. preview title opens article page [FR-029]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/');

    await home.openArticle('Release notes for testers');

    await expect(page).toHaveURL(/\/article\/Release-notes-for-testers-[A-Za-z0-9]{8}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Release notes for testers');
  });

  test('9. signed-in feed tabs order and default selection [FR-030]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page);
    await home.goto('/');

    await expect(home.feedToggle.getByRole('link')).toHaveText(['Your Feed', 'Global Feed']);
    await expect(home.activeTab).toHaveText('Global Feed');

    await home.yourFeedTab.click();
    await expect(page).toHaveURL('/?feed=following');
    await expect(home.activeTab).toHaveText('Your Feed');

    await home.globalFeedTab.click();
    await expect(home.activeTab).toHaveText('Global Feed');
  });

  test('10. page past the last page shows empty state [FR-038]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/?page=9');

    await expect(home.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageButtons).toHaveText(['1', '2', '3']);
    await expect(home.activePage).toHaveCount(0);
  });

  test('11. popular tags are the ten most used in order [FR-034]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/');

    await expect(home.popularTags).toHaveText([
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
    await expect(home.popularTags.getByText('security', { exact: true })).toHaveCount(0);
  });

  test('12. playwright tag opens filtered tag page [FR-035]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/');

    await home.clickTag('playwright');

    await expect(page).toHaveURL('/tag/playwright');
    await expect(home.feedToggle.locator('a.nav-link')).toHaveText(['Global Feed', 'playwright']);
    await expect(home.feedToggle.getByText('playwright', { exact: true })).toHaveClass(/active/);
    await expect(home.previews.getByRole('heading')).toHaveText([
      'Exploratory testing sessions that actually find bugs',
      'Page objects or not?',
      'Writing your first end-to-end test',
    ]);
  });

  test('13. direct tag URLs, ten-article tag and unknown tag [FR-036, FR-038]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/tag/security');
    await expect(home.previews.getByRole('heading')).toHaveText(['Backups for SQLite, the boring way']);

    await home.goto('/tag/testing');
    await expect(home.previews).toHaveCount(10);
    await expect(home.pageButtons).toHaveText(['1']);

    await home.goto('/tag/nonexistent');
    await expect(home.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(home.pageButtons).toHaveCount(0);
  });

  test('14. global feed clears the tag tab [FR-037]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/tag/playwright');

    await home.globalFeedTab.click();

    await expect(page).toHaveURL('/');
    await expect(home.feedToggle.getByRole('link')).toHaveText(['Global Feed']);
    await expect(home.activeTab).toHaveText('Global Feed');
    await expect(home.previews).toHaveCount(10);
    await expect(home.previews.getByRole('heading').first()).toHaveText('Release notes for testers');
  });
});
