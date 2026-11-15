import { test, expect } from '@playwright/test';
import { ProfilePage } from './pages/ProfilePage';
import { DEFAULT_AVATAR, SEED_ARTICLE_TITLES } from './fixtures/seed';

function expectNewestFirst(dateTexts: string[]): void {
  const times = dateTexts.map((text) => Date.parse(text.trim()));
  for (let i = 1; i < times.length; i++) {
    expect(times[i], `date ${dateTexts[i]} should not be newer than ${dateTexts[i - 1]}`).toBeLessThanOrEqual(
      times[i - 1],
    );
  }
}

test.describe('Profiles', () => {
  test('48. views a profile and its favourites tab [FR-069] [FR-070]', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto('alice');

    await expect(profile.username).toHaveText('alice');
    await expect(profile.bio).toHaveText('QA lead. Writes about test strategy and automation.');
    await expect(profile.activeTab).toHaveText('My Posts');
    await expect(profile.previews).toHaveCount(10);
    await expect(profile.pagination.buttons).toHaveCount(2);
    await expect(profile.pagination.activeItem).toHaveText('1');

    await profile.favoritesTab.click();
    await expect(page).toHaveURL('/profile/alice/favorites');
    await expect(profile.activeTab).toHaveText('Favorited Posts');
    await expect(profile.previews).toHaveCount(6);
    await expect(profile.previews.first().getByRole('heading', { level: 1 })).toHaveText(
      SEED_ARTICLE_TITLES.rateLimiting,
    );
    expectNewestFirst(await profile.previews.locator('.date').allTextContents());
  });

  test('49. seed profile counts and default avatars [FR-070] [FR-004]', async ({ page }) => {
    const profile = new ProfilePage(page);
    const counts = [
      { username: 'bob', posts: 6 },
      { username: 'carol', posts: 4 },
      { username: 'dave', posts: 2 },
    ] as const;

    for (const { username, posts } of counts) {
      await profile.goto(username);
      await expect(profile.username).toHaveText(username);
      await expect(profile.previews).toHaveCount(posts);
    }

    await profile.goto('dave');
    await expect(profile.bio).toBeEmpty();
    await expect(profile.avatar).toHaveAttribute('src', DEFAULT_AVATAR);

    await profile.goto('erin');
    await expect(profile.previews).toHaveCount(0);
    await expect(profile.emptyMessage).toBeVisible();

    await profile.goto('erin', 'favorites');
    await expect(profile.activeTab).toHaveText('Favorited Posts');
    await expect(profile.previews).toHaveCount(10);
    await expect(profile.pagination.buttons).toHaveCount(2);
    await expect(profile.pagination.activeItem).toHaveText('1');

    await profile.pagination.goTo(2);
    await expect(profile.previews).toHaveCount(1);
    await expect(profile.pagination.activeItem).toHaveText('2');
  });

  test("50. pages a profile's posts [FR-041]", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto('alice');
    // Let the first page settle before paging, otherwise the initial load resets the page state.
    await expect(profile.previews).toHaveCount(10);

    await profile.pagination.goTo(2);
    await expect(profile.previews).toHaveCount(2);
    await expect(profile.previews.getByRole('heading', { level: 1 })).toHaveText([
      'Writing your first end-to-end test',
      'Why we test',
    ]);
    await expect(profile.pagination.activeItem).toHaveText('2');
    await expect(page).toHaveURL('/profile/alice?page=2');
  });
});
