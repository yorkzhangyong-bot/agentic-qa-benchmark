import { test, expect } from './support/fixtures';
import { apiLogin, followUser, signInWithToken, switchUser, unfollowUser } from './support/api';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { ArticlePage } from './pages/ArticlePage';
import { HeaderComponent } from './pages/HeaderComponent';
import { LoginPage } from './pages/LoginPage';

const FLAKY_SLUG = 'Flaky-tests:-a-field-guide-45af9838';

test.describe('Feeds and following', () => {
  /** Covers FR-033, AC4.1 */
  test("36. erin's empty your feed shows the message link and no page buttons [FR-033]", async ({
    page,
    request,
  }) => {
    const home = new HomePage(page);

    await signInWithToken(page, request, 'erin@example.com', '/?feed=following');

    await expect(page).toHaveURL('/?feed=following');
    await expect(home.yourFeedTab).toHaveClass(/active/);
    await expect(home.emptyMessage).toContainText(
      'Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!',
    );
    await expect(home.emptyMessage.getByRole('link', { name: 'Global Feed', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(home.paginationItems).toHaveCount(0);
    await expect(home.previews).toHaveCount(0);
  });

  /** Covers FR-065, FR-066, AC4.2, SC-006 */
  test("37. following bob fills erin's feed with his six articles [FR-065, FR-066, SC-006]", async ({
    page,
    request,
    cleanup,
  }) => {
    const home = new HomePage(page);
    const profile = new ProfilePage(page);

    const token = await signInWithToken(page, request, 'erin@example.com', '/profile/bob');
    await expect(profile.username).toHaveText('bob');
    await expect(profile.followButton).toHaveText('Follow bob');

    const response = page.waitForResponse(
      res => res.url().endsWith('/api/profiles/bob/follow') && res.request().method() === 'POST',
    );
    await profile.followButton.click();
    expect((await response).status()).toBe(200);
    cleanup.add(() => unfollowUser(request, token, 'bob'));

    await expect(profile.followButton).toHaveText('Unfollow bob');

    await home.goto('/?feed=following');
    await expect(home.yourFeedTab).toHaveClass(/active/);
    await expect(home.previews).toHaveCount(6);
    expect(await home.previewTitles()).toEqual([
      'Rate limiting in Node without Redis',
      'Backups for SQLite, the boring way',
      'Migrating a Node service to ESM',
      'Indexes, explained without the jargon',
      'Designing a REST API that frontends enjoy',
      'SQLite is enough for most side projects',
    ]);
    await expect(home.paginationItems).toHaveCount(1);
  });

  /** Covers FR-066, SC-006 */
  test("38. unfollowing bob empties erin's feed again and stays empty after reload [FR-066, SC-006]", async ({
    page,
    request,
    cleanup,
  }) => {
    const home = new HomePage(page);
    const profile = new ProfilePage(page);

    const token = await apiLogin(request, 'erin@example.com');
    await followUser(request, token, 'bob');
    cleanup.add(() => unfollowUser(request, token, 'bob'));

    await signInWithToken(page, request, 'erin@example.com', '/profile/bob');
    await expect(profile.followButton).toHaveText('Unfollow bob');

    const response = page.waitForResponse(
      res => res.url().endsWith('/api/profiles/bob/follow') && res.request().method() === 'DELETE',
    );
    await profile.followButton.click();
    expect((await response).status()).toBe(200);
    await expect(profile.followButton).toHaveText('Follow bob');

    await home.goto('/?feed=following');
    await expect(home.emptyMessage).toBeVisible();
    await expect(home.previews).toHaveCount(0);

    await page.reload();
    await expect(home.emptyMessage).toBeVisible();
    await expect(home.previews).toHaveCount(0);
  });

  /** Covers FR-031, AC4.3 */
  test("39. alice's your feed lists the ten bob and carol articles newest first [FR-031]", async ({
    page,
    request,
  }) => {
    const home = new HomePage(page);

    await signInWithToken(page, request, 'alice@example.com', '/?feed=following');

    await expect(home.yourFeedTab).toHaveClass(/active/);
    await expect(home.previews).toHaveCount(10);
    const titles = await home.previewTitles();
    expect(titles[0]).toBe('Rate limiting in Node without Redis');
    expect(titles[titles.length - 1]).toBe('SQLite is enough for most side projects');
    await expect(home.previews.getByRole('link', { name: /^(bob|carol)$/ })).toHaveCount(10);
    await expect(home.paginationItems).toHaveCount(1);
    await expect(home.activePageItem).toHaveText('1');
  });

  /** Covers FR-032, SC-002 */
  test('40. your feed counts and page buttons match the seed for bob carol and dave [FR-032, SC-002]', async ({
    page,
    request,
  }) => {
    const home = new HomePage(page);
    const header = new HeaderComponent(page);
    const accounts: Array<{ username: string; pageCounts: number[] }> = [
      { username: 'bob', pageCounts: [10, 2] },
      { username: 'carol', pageCounts: [10, 8] },
      { username: 'dave', pageCounts: [10, 10, 2] },
    ];

    for (const account of accounts) {
      await switchUser(page, request, `${account.username}@example.com`, '/?feed=following');
      await expect(header.userLink(account.username)).toBeVisible();
      await expect(home.yourFeedTab).toHaveClass(/active/);
      await expect(home.paginationItems).toHaveCount(account.pageCounts.length);
      await expect(home.previews).toHaveCount(account.pageCounts[0]);
      expect((await home.previewTitles())[0]).toBe('Release notes for testers');

      for (let pageNumber = 2; pageNumber <= account.pageCounts.length; pageNumber += 1) {
        await home.pageButton(pageNumber).click();
        await expect(page).toHaveURL(`/?feed=following&page=${pageNumber}`);
        await expect(home.previews).toHaveCount(account.pageCounts[pageNumber - 1]);
        await expect(home.activePageItem).toHaveText(String(pageNumber));
      }

      const lastPageTitles = await home.previewTitles();
      expect(lastPageTitles[lastPageTitles.length - 1]).toBe('Why we test');
    }
  });

  /** Covers FR-040 */
  test('41. paging your feed keeps the feed in the address [FR-040]', async ({ page, request }) => {
    const home = new HomePage(page);

    await signInWithToken(page, request, 'bob@example.com', '/?feed=following');
    await expect(home.previews).toHaveCount(10);
    await home.pageButton(2).click();

    await expect(page).toHaveURL('/?feed=following&page=2');
    await expect(home.previews).toHaveCount(2);
    expect(await home.previewTitles()).toEqual([
      'Writing your first end-to-end test',
      'Why we test',
    ]);
    await expect(home.activePageItem).toHaveText('2');
    await expect(home.yourFeedTab).toHaveClass(/active/);
  });

  /** Covers FR-067, SC-007 */
  test('42. a signed-out follow click sends the visitor to log in [FR-067, SC-007]', async ({ page }) => {
    const profile = new ProfilePage(page);
    const login = new LoginPage(page);
    let followRequested = false;

    page.on('request', request => {
      if (request.url().endsWith('/api/profiles/bob/follow') && request.method() === 'POST') {
        followRequested = true;
      }
    });

    await profile.goto('bob');
    await expect(profile.previews).toHaveCount(6);
    await expect(profile.followButton).toHaveText('Follow bob');
    await profile.followButton.click();

    await expect(page).toHaveURL('/login');
    await expect(login.heading).toBeVisible();
    expect(followRequested).toBe(false);
  });

  /** Covers FR-068, FR-045 */
  test('43. users see management controls on their own profile and articles, never follow [FR-068, FR-045]', async ({
    page,
    request,
  }) => {
    const profile = new ProfilePage(page);
    const article = new ArticlePage(page);

    await signInWithToken(page, request, 'alice@example.com', '/profile/alice');
    await expect(profile.username).toHaveText('alice');
    await expect(profile.editProfileLink).toHaveAttribute('href', '/settings');
    await expect(profile.followButton).toHaveCount(0);

    await article.goto(FLAKY_SLUG);
    await expect(article.title).toHaveText('Flaky tests: a field guide');
    await expect(article.editLinks).toHaveCount(2);
    await expect(article.deleteButtons).toHaveCount(2);
    await expect(article.followButtons).toHaveCount(0);
    await expect(article.favoriteButtons).toHaveCount(0);
  });
});
