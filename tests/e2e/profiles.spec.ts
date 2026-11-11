import { test, expect } from '@playwright/test';
import { ProfilePage } from './pages/ProfilePage';

test.describe('Profiles', () => {
  test('62. alice profile content and pagination [FR-069, FR-070]', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto('alice');

    await expect(profile.username).toHaveText('alice');
    await expect(profile.bio).toHaveText('QA lead. Writes about test strategy and automation.');
    await expect(profile.avatar).toHaveAttribute('src', /\/images\/demo-avatar\.png$/);
    await expect(profile.myPostsTab).toHaveClass(/active/);
    await expect(profile.favoritesTab).toBeVisible();
    await expect(profile.previews).toHaveCount(10);
    await expect(profile.pageButtons).toHaveText(['1', '2']);
    await expect(profile.previews.getByRole('heading').first()).toHaveText('Release notes for testers');
  });

  test('63. alice favorites tab lists six articles [FR-069]', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto('alice');

    await profile.favoritesTab.click();

    await expect(page).toHaveURL('/profile/alice/favorites');
    await expect(profile.activeTab).toHaveText('Favorited Posts');
    await expect(profile.previews).toHaveCount(6);
    await expect(profile.previews.getByRole('heading').first()).toHaveText(
      'Rate limiting in Node without Redis',
    );
  });

  test('64. seed profile counts [FR-038, FR-070]', async ({ page }) => {
    const profile = new ProfilePage(page);

    await profile.goto('bob');
    await expect(profile.previews).toHaveCount(6);

    await profile.goto('carol');
    await expect(profile.previews).toHaveCount(4);

    await profile.goto('dave');
    await expect(profile.previews).toHaveCount(2);
    await expect(profile.bio).toHaveText('');
    await expect(profile.avatar).toHaveAttribute('src', /\/assets\/default-avatar\.svg$/);

    await profile.goto('erin');
    await expect(profile.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(profile.pageButtons).toHaveCount(0);

    await profile.favoritesTab.click();
    await expect(page).toHaveURL('/profile/erin/favorites');
    // 11 favourites, but the list shows 10 per page.
    await expect(profile.previews).toHaveCount(10);
    await expect(profile.pageButtons).toHaveText(['1', '2']);
  });

  test('65. alice my posts page 2 [FR-041]', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto('alice');

    await page.getByRole('button', { name: '2', exact: true }).click();

    await expect(profile.previews.getByRole('heading')).toHaveText([
      'Writing your first end-to-end test',
      'Why we test',
    ]);
    await expect(profile.activePage).toHaveText('2');
  });
});
