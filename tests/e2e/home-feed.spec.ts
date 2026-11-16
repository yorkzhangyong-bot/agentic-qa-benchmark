import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { PASSWORD, signInAs } from './fixtures/auth';

test.describe('Home feed', () => {
  test('3. banner shows only when signed out [FR-003]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.banner).toBeVisible();
    await expect(home.banner.getByText('This is the')).toBeVisible();
    await expect(home.banner.getByRole('img', { name: 'Conduit' })).toBeVisible();
    await expect(home.previews.first()).toBeVisible();

    await signInAs(page, 'alice@example.com', PASSWORD);
    await expect(home.banner).toHaveCount(0);
    await expect(home.previews.first()).toBeVisible();
  });

  test('5. global feed page 1 shows ten newest articles [FR-027]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.previews).toHaveCount(10);
    const titles = await home.titles();
    expect(titles[0]).toBe('Release notes for testers');
    expect(titles[9]).toBe('Migrating a Node service to ESM');

    const first = home.previews.first();
    await expect(first.locator('a.author')).toHaveText('alice');
    await expect(first.locator('.date')).toHaveText('January 28, 2026');

    await expect(home.pageItems).toHaveCount(3);
    await expect(home.pageButton(1)).toHaveCount(1);
    await expect(home.pageButton(2)).toHaveCount(1);
    await expect(home.pageButton(3)).toHaveCount(1);
    await expect(home.activePage.getByRole('button')).toHaveText('1');
  });

  test('6. article preview shows all parts with alphabetical tags [FR-028]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const release = home.preview('Release notes for testers');
    await expect(release.title).toBeVisible();
    await expect(release.authorAvatarLink).toHaveAttribute('href', '/profile/alice');
    await expect(release.author).toHaveText('alice');
    await expect(release.author).toHaveAttribute('href', '/profile/alice');
    await expect(release.date).toHaveText('January 28, 2026');
    await expect(release.favoriteButton).toHaveClass(/btn-outline-primary/);
    await expect(release.favoriteButton).toHaveText(/0/);
    await expect(release.title).toHaveText('Release notes for testers');
    await expect(release.description).toHaveText('What we need to know before a release, in one page');
    await expect(release.root.getByText('Read more...')).toBeVisible();
    expect((await release.tags.allInnerTexts()).map(t => t.trim())).toEqual(['ci', 'testing']);

    await home.goto('/?page=2');
    const flaky = home.preview('Flaky tests: a field guide');
    await expect(flaky.favoriteButton).toHaveClass(/btn-outline-primary/);
    await expect(flaky.favoriteButton).toHaveText(/4/);
    expect((await flaky.tags.allInnerTexts()).map(t => t.trim())).toEqual(['automation', 'ci', 'testing']);
  });

  test('7. preview title opens the article page [FR-029]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/?page=2');

    await home.preview('Flaky tests: a field guide').open();
    await expect(page).toHaveURL(/\/article\/Flaky-tests:-a-field-guide-[a-z0-9]+$/);
    await expect(page.getByRole('heading', { name: 'Flaky tests: a field guide' })).toBeVisible();
  });

  test('8. feed tabs match the visitor and default to global feed [FR-030]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    expect(await home.tabNames()).toEqual(['Global Feed']);
    await expect(home.activeTab).toHaveText('Global Feed');

    await signInAs(page, 'alice@example.com', PASSWORD);
    expect(await home.tabNames()).toEqual(['Your Feed', 'Global Feed']);
    await expect(home.activeTab).toHaveText('Global Feed');

    await page.getByRole('link', { name: 'Your Feed' }).click();
    await expect(page).toHaveURL('/?feed=following');
    await expect(home.activeTab).toHaveText('Your Feed');
    await expect(home.previews.first()).toBeVisible();

    await page.getByRole('link', { name: 'Global Feed' }).click();
    await expect(page).toHaveURL('/');
    await expect(home.activeTab).toHaveText('Global Feed');
  });
});
