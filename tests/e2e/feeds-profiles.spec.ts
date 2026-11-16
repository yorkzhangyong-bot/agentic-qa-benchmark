import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { PASSWORD, signInAs, signOut } from './fixtures/auth';

const EMPTY_FEED =
  'Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!';

async function clickPage(page: import('@playwright/test').Page, button: import('@playwright/test').Locator) {
  const response = page.waitForResponse(r => r.url().includes('/api/articles') && r.request().method() === 'GET');
  await button.click();
  await response;
}

test.describe('Feeds and profiles', () => {
  test("68. alice's your feed lists followed authors [FR-031]", async ({ page }) => {
    const home = new HomePage(page);
    await signInAs(page, 'alice@example.com', PASSWORD);
    await page.getByRole('link', { name: 'Your Feed' }).click();

    await expect(page).toHaveURL('/?feed=following');
    await expect(home.activeTab).toHaveText('Your Feed');
    await expect(home.previews).toHaveCount(10);

    const titles = await home.titles();
    expect(titles[0]).toBe('Rate limiting in Node without Redis');
    expect(titles[9]).toBe('SQLite is enough for most side projects');
    for (const card of await home.previews.all()) {
      expect(['bob', 'carol']).toContain((await card.locator('a.author').innerText()).trim());
    }
    await expect(home.pageItems).toHaveCount(1);
    await expect(home.activePage.getByRole('button')).toHaveText('1');
  });

  test("69. each seeded user's feed has the specified counts [FR-032]", async ({ page }) => {
    const home = new HomePage(page);
    const feeds: { email: string; total: number; pages: number }[] = [
      { email: 'bob@example.com', total: 12, pages: 2 },
      { email: 'carol@example.com', total: 18, pages: 2 },
      { email: 'dave@example.com', total: 22, pages: 3 },
    ];

    for (const feed of feeds) {
      await signInAs(page, feed.email, PASSWORD);
      await home.goto('/?feed=following');
      await expect(home.previews).toHaveCount(Math.min(feed.total, 10));
      await expect(home.pageItems).toHaveCount(feed.pages);
      if (feed.total > 10) {
        await clickPage(page, home.pageButton(2));
        await expect(home.previews).toHaveCount(Math.min(feed.total - 10, 10));
      }
      await signOut(page);
    }

    await signInAs(page, 'erin@example.com', PASSWORD);
    await home.goto('/?feed=following');
    await expect(home.emptyMessage).toHaveText(EMPTY_FEED);
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageItems).toHaveCount(0);
    await signOut(page);
  });

  test('70. empty your feed shows message and global feed link [FR-033]', async ({ page }) => {
    const home = new HomePage(page);
    await signInAs(page, 'erin@example.com', PASSWORD);
    await home.goto('/?feed=following');

    await expect(home.emptyMessage).toHaveText(EMPTY_FEED);
    await expect(home.emptyMessage.getByRole('link', { name: 'Global Feed' })).toHaveAttribute('href', '/');
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageItems).toHaveCount(0);

    await home.emptyMessage.getByRole('link', { name: 'Global Feed' }).click();
    await expect(page).toHaveURL('/');
    await expect(home.activeTab).toHaveText('Global Feed');
    await expect(home.previews).toHaveCount(10);
  });

  test("71. alice's profile shows posts and favourites [FR-069][FR-070]", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto('alice');

    await expect(profile.name).toHaveText('alice');
    await expect(profile.bio).toHaveText('QA lead. Writes about test strategy and automation.');
    await expect(profile.avatar).toHaveAttribute('src', /demo-avatar\.png$/);
    await expect(profile.myPostsLink).toHaveClass(/active/);
    await expect(profile.favoritesLink).not.toHaveClass(/active/);
    await expect(profile.previews).toHaveCount(10);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText('Release notes for testers');
    await expect(profile.pageItems).toHaveCount(2);

    await profile.favoritesLink.click();
    await expect(page).toHaveURL('/profile/alice/favorites');
    await expect(profile.favoritesLink).toHaveClass(/active/);
    await expect(profile.previews).toHaveCount(6);
    await expect(profile.preview('Rate limiting in Node without Redis').root).toHaveCount(1);
    await expect(profile.preview('SQLite is enough for most side projects').root).toHaveCount(1);
    await expect(profile.pageItems).toHaveCount(1);

    await profile.myPostsLink.click();
    await expect(page).toHaveURL('/profile/alice');
  });

  test('72. seeded profiles show the specified counts [FR-070]', async ({ page }) => {
    const profile = new ProfilePage(page);

    for (const expected of [
      { username: 'bob', posts: 6 },
      { username: 'carol', posts: 4 },
      { username: 'dave', posts: 2 },
    ]) {
      await profile.goto(expected.username);
      await expect(profile.name).toHaveText(expected.username);
      await expect(profile.previews).toHaveCount(expected.posts);
      // FR-038: a non-empty list of 10 or fewer articles shows page button "1".
      await expect(profile.pageItems).toHaveCount(1);
      await expect(profile.activePage.getByRole('button')).toHaveText('1');
    }

    await profile.goto('dave');
    await expect(profile.bio).toHaveText('');
    await expect(profile.avatar).toHaveAttribute('src', /\/assets\/default-avatar\.svg$/);

    await profile.goto('erin');
    await expect(profile.previews).toHaveCount(0);
    await expect(profile.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(profile.pageItems).toHaveCount(0);

    await profile.goto('erin', 'favorites');
    await expect(profile.favoritesLink).toHaveClass(/active/);
    await expect(profile.pageItems).toHaveCount(2);
    await expect(profile.previews).toHaveCount(10);

    await clickPage(page, profile.pageButton(2));
    await expect(page).toHaveURL('/profile/erin/favorites?page=2');
    await expect(profile.previews).toHaveCount(1);
  });
});
