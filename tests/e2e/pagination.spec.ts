import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { PASSWORD, signInAs } from './fixtures/auth';

async function clickPage(page: import('@playwright/test').Page, button: import('@playwright/test').Locator) {
  const response = page.waitForResponse(r => r.url().includes('/api/articles') && r.request().method() === 'GET');
  await button.click();
  await response;
}

test.describe('Pagination', () => {
  test('13. global feed paging shows all 24 articles once [FR-038][FR-039]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.previews).toHaveCount(10);

    await clickPage(page, home.pageButton(2));
    await expect(page).toHaveURL('/?page=2');
    await expect(home.previews).toHaveCount(10);
    expect((await home.titles())[0]).toBe('Markdown cheat sheet for Conduit authors');
    await expect(home.activePage.getByRole('button')).toHaveText('2');

    await clickPage(page, home.pageButton(3));
    await expect(page).toHaveURL('/?page=3');
    expect(await home.titles()).toEqual([
      'Accessible forms in Angular',
      'Writing your first end-to-end test',
      'SQLite is enough for most side projects',
      'Why we test',
    ]);
    await expect(home.activePage.getByRole('button')).toHaveText('3');

    await clickPage(page, home.pageButton(1));
    await expect(page).toHaveURL('/');
    await expect(home.activePage.getByRole('button')).toHaveText('1');

    const pageOne = await home.titles();
    await clickPage(page, home.pageButton(2));
    const pageTwo = await home.titles();
    await clickPage(page, home.pageButton(3));
    const pageThree = await home.titles();

    const all = [...pageOne, ...pageTwo, ...pageThree];
    expect(all).toHaveLength(24);
    expect(new Set(all).size).toBe(24);
    expect(all[0]).toBe('Release notes for testers');
    expect(all[23]).toBe('Why we test');
  });

  test('14. page past the last shows empty feed and no active page [FR-038]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/?page=9');

    await expect(home.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageItems).toHaveCount(3);
    await expect(home.pageButton(1)).toHaveCount(1);
    await expect(home.pageButton(2)).toHaveCount(1);
    await expect(home.pageButton(3)).toHaveCount(1);
    await expect(home.activePage).toHaveCount(0);
  });

  test('15. page buttons appear only for multi-page lists [FR-038]', async ({ page }) => {
    const home = new HomePage(page);
    const profile = new ProfilePage(page);

    await home.goto('/tag/testing');
    await expect(home.previews).toHaveCount(10);
    await expect(home.pageItems).toHaveCount(1);
    await expect(home.activePage.getByRole('button')).toHaveText('1');

    await profile.goto('alice', 'favorites');
    await expect(profile.previews).toHaveCount(6);
    await expect(profile.pageItems).toHaveCount(1);
    await expect(profile.activePage.getByRole('button')).toHaveText('1');

    await profile.goto('erin');
    await expect(profile.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(profile.pageItems).toHaveCount(0);

    await home.goto('/tag/nonexistent');
    await expect(home.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(home.pageItems).toHaveCount(0);
  });

  test('16. your feed paging keeps the feed parameter [FR-040]', async ({ page }) => {
    const home = new HomePage(page);
    await signInAs(page, 'bob@example.com', PASSWORD);
    await home.goto('/?feed=following');

    await expect(home.previews).toHaveCount(10);
    await expect(home.pageItems).toHaveCount(2);
    await expect(home.activeTab).toHaveText('Your Feed');

    await clickPage(page, home.pageButton(2));
    await expect(page).toHaveURL('/?feed=following&page=2');
    await expect(home.previews).toHaveCount(2);
    await expect(home.activePage.getByRole('button')).toHaveText('2');
    await expect(home.activeTab).toHaveText('Your Feed');
  });

  test('17. profile posts page two shows the oldest two articles [FR-041]', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto('alice');
    await expect(profile.previews).toHaveCount(10);

    await clickPage(page, profile.pageButton(2));
    await expect(page).toHaveURL('/profile/alice?page=2');
    expect(await profile.titles()).toEqual(['Writing your first end-to-end test', 'Why we test']);
    await expect(profile.activePage.getByRole('button')).toHaveText('2');
    await expect(profile.activeTab).toHaveText('My Posts');
  });
});
