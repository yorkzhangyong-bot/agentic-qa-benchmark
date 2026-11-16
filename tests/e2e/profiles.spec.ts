import { test, expect } from './support/fixtures';
import { ProfilePage } from './pages/ProfilePage';

const ALICE_AVATAR = 'http://localhost:3000/images/demo-avatar.png';
const DEFAULT_AVATAR = '/assets/default-avatar.svg';

test.describe('Profiles', () => {
  /** Covers FR-069, FR-070, AC7.1 */
  test("65. alice's profile shows her bio my posts tab ten posts and two pages [FR-069, FR-070]", async ({
    page,
  }) => {
    const profile = new ProfilePage(page);

    await profile.goto('alice');

    await expect(profile.username).toHaveText('alice');
    await expect(profile.bio).toHaveText('QA lead. Writes about test strategy and automation.');
    await expect(profile.avatar).toHaveAttribute('src', ALICE_AVATAR);
    await expect(profile.myPostsTab).toHaveClass(/active/);
    await expect(profile.previews).toHaveCount(10);
    await expect(profile.previews.getByRole('heading', { level: 1 }).first()).toHaveText(
      'Release notes for testers',
    );
    await expect(profile.paginationItems).toHaveCount(2);
    await expect(profile.pageButton(1)).toBeVisible();
    await expect(profile.pageButton(2)).toBeVisible();
    await expect(profile.activePageItem).toHaveText('1');
    await expect(profile.followButton).toHaveText('Follow alice');
    await expect(profile.editProfileLink).toHaveCount(0);
  });

  /** Covers FR-069, AC7.2 */
  test("66. alice's favorited posts tab shows her six favourites newest first [FR-069]", async ({ page }) => {
    const profile = new ProfilePage(page);

    await profile.goto('alice');
    await expect(profile.previews).toHaveCount(10);
    await profile.favoritedTab.click();

    await expect(page).toHaveURL('/profile/alice/favorites');
    await expect(profile.favoritedTab).toHaveClass(/active/);
    await expect(profile.myPostsTab).not.toHaveClass(/active/);
    await expect(profile.previews).toHaveCount(6);
    expect(await profile.previews.getByRole('heading', { level: 1 }).allTextContents()).toEqual([
      'Rate limiting in Node without Redis',
      'What I learned from breaking production',
      'Indexes, explained without the jargon',
      'Signals in Angular, explained with a shopping cart',
      'Accessible forms in Angular',
      'SQLite is enough for most side projects',
    ]);
    await expect(profile.paginationItems).toHaveCount(1);
  });

  /** Covers FR-070, FR-004 */
  test('67. profiles show the seeded counts empty states and default avatars [FR-070]', async ({ page }) => {
    const profile = new ProfilePage(page);

    await profile.goto('bob');
    await expect(profile.username).toHaveText('bob');
    await expect(profile.previews).toHaveCount(6);

    await profile.goto('carol');
    await expect(profile.username).toHaveText('carol');
    await expect(profile.previews).toHaveCount(4);

    await profile.goto('dave');
    await expect(profile.username).toHaveText('dave');
    await expect(profile.previews).toHaveCount(2);
    await expect(profile.bio).toHaveText('');
    await expect(profile.avatar).toHaveAttribute('src', DEFAULT_AVATAR);

    await profile.goto('erin');
    await expect(profile.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(profile.previews).toHaveCount(0);
    await expect(profile.paginationItems).toHaveCount(0);

    await profile.goto('erin', '/favorites');
    await expect(profile.previews).toHaveCount(10);
    await expect(profile.paginationItems).toHaveCount(2);
    await expect(profile.previews.getByRole('heading', { level: 1 }).first()).toHaveText(
      'Exploratory testing sessions that actually find bugs',
    );
    await profile.pageButton(2).click();
    await expect(page).toHaveURL('/profile/erin/favorites?page=2');
    await expect(profile.previews).toHaveCount(1);
  });

  /** Covers FR-041, FR-038 */
  test('68. profile tabs page the same way by button and by address [FR-041]', async ({ page }) => {
    const profile = new ProfilePage(page);

    await profile.goto('alice');
    await expect(profile.previews).toHaveCount(10);
    await profile.pageButton(2).click();

    await expect(page).toHaveURL('/profile/alice?page=2');
    await expect(profile.previews).toHaveCount(2);
    expect(await profile.previews.getByRole('heading', { level: 1 }).allTextContents()).toEqual([
      'Writing your first end-to-end test',
      'Why we test',
    ]);
    await expect(profile.activePageItem).toHaveText('2');
    await expect(profile.myPostsTab).toHaveClass(/active/);

    await profile.goto('alice', '?page=2');
    await expect(page).toHaveURL('/profile/alice?page=2');
    await expect(profile.previews).toHaveCount(2);
    expect(await profile.previews.getByRole('heading', { level: 1 }).allTextContents()).toEqual([
      'Writing your first end-to-end test',
      'Why we test',
    ]);
    await expect(profile.activePageItem).toHaveText('2');
    await expect(profile.myPostsTab).toHaveClass(/active/);
  });

  /** Covers FR-065, FR-068 */
  test('69. a signed-out profile shows follow not edit profile settings [FR-065, FR-068]', async ({ page }) => {
    const profile = new ProfilePage(page);

    await profile.goto('bob');

    await expect(profile.followButton).toHaveText('Follow bob');
    await expect(profile.followButton).toHaveClass(/btn-outline-secondary/);
    await expect(profile.editProfileLink).toHaveCount(0);
    await expect(profile.previews).toHaveCount(6);
  });
});
