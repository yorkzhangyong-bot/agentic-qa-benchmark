import { test, expect } from '@playwright/test';
import { clearFollow, withApi } from './fixtures/api';
import { signIn } from './fixtures/ui';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';

test.describe('Following and the personal feed', () => {
  test.afterEach(async () => {
    await clearFollow('erin', 'bob');
  });

  test('30. alice your feed content and order [FR-031, SC-009]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page);

    await home.yourFeedTab.click();

    await expect(home.previews).toHaveCount(10);
    await expect(home.previews.getByRole('heading')).toHaveText([
      'Rate limiting in Node without Redis',
      'Backups for SQLite, the boring way',
      'Angular performance quick wins',
      'Migrating a Node service to ESM',
      'Keyboard navigation checklist',
      'Indexes, explained without the jargon',
      'Signals in Angular, explained with a shopping cart',
      'Designing a REST API that frontends enjoy',
      'Accessible forms in Angular',
      'SQLite is enough for most side projects',
    ]);
    await expect(home.previews.locator('.article-meta .author')).toHaveText([
      'bob',
      'bob',
      'carol',
      'bob',
      'carol',
      'bob',
      'carol',
      'bob',
      'carol',
      'bob',
    ]);
    await expect(home.previews.locator('.date')).toHaveText([
      'January 26, 2026',
      'January 24, 2026',
      'January 23, 2026',
      'January 19, 2026',
      'January 17, 2026',
      'January 15, 2026',
      'January 13, 2026',
      'January 11, 2026',
      'January 8, 2026',
      'January 6, 2026',
    ]);
  });

  test('31. erin empty your feed message [FR-033]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page, 'erin@example.com');

    await home.yourFeedTab.click();

    await expect(home.emptyMessage).toHaveText(
      'Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!',
    );
    await expect(home.emptyMessage.getByRole('link', { name: 'Global Feed' })).toHaveAttribute('href', '/');
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageButtons).toHaveCount(0);
  });

  test('32. erin follows bob and your feed round-trips [FR-065, FR-066, SC-006]', async ({ page }) => {
    const profile = new ProfilePage(page);
    const home = new HomePage(page);
    await signIn(page, 'erin@example.com');

    await profile.goto('bob');
    await expect(profile.followButton).toHaveText(/Follow bob/);
    await expect(profile.followButton).toHaveClass(/btn-outline-secondary/);

    await profile.followButton.click();
    await expect(profile.followButton).toHaveText(/Unfollow bob/);
    await expect(profile.followButton).toHaveClass(/btn-secondary/);

    await home.goto('/');
    await home.yourFeedTab.click();
    await expect(home.previews).toHaveCount(6);
    await expect(home.previews.getByRole('heading').first()).toHaveText('Rate limiting in Node without Redis');
    await expect(home.previews.getByRole('heading').last()).toHaveText('SQLite is enough for most side projects');
    await expect(home.pageButtons).toHaveText(['1']);

    await profile.goto('bob');
    await expect(profile.followButton).toHaveText(/Unfollow bob/);
    await profile.followButton.click();
    await expect(profile.followButton).toHaveText(/Follow bob/);
    await expect(profile.followButton).toHaveClass(/btn-outline-secondary/);

    await home.goto('/');
    await home.yourFeedTab.click();
    await expect(home.previews).toHaveCount(0);
    await expect(home.emptyMessage).toContainText('Your feed is empty.');
  });

  test('33. your feed page 2 keeps feed param [FR-040]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page, 'bob@example.com');

    await home.yourFeedTab.click();
    await home.clickPage(2);

    await expect(page).toHaveURL('/?feed=following&page=2');
    await expect(home.previews).toHaveCount(2);
    await expect(home.previews.getByRole('heading')).toHaveText([
      'Writing your first end-to-end test',
      'Why we test',
    ]);
    await expect(home.activePage).toHaveText('2');
  });

  test('34. follow controls and own-profile edit link [FR-065, FR-068]', async ({ page }) => {
    const article = new ArticlePage(page);
    const profile = new ProfilePage(page);
    await signIn(page);

    const slugs = await withApi(async api => ({
      rateLimiting: (await api.findArticle('Rate limiting in Node without Redis')).slug,
      flaky: (await api.findArticle('Flaky tests: a field guide')).slug,
    }));

    await article.goto(slugs.rateLimiting);
    await expect(article.followButton('top')).toHaveText(/Unfollow bob/);
    await expect(article.followButton('bottom')).toHaveText(/Unfollow bob/);

    await profile.goto('bob');
    await expect(profile.followButton).toHaveText(/Unfollow bob/);

    await profile.goto('alice');
    await expect(profile.editProfileLink).toHaveAttribute('href', '/settings');
    await expect(profile.followButton).toHaveCount(0);

    await article.goto(slugs.flaky);
    await expect(article.topActions.getByRole('link', { name: /Edit Article/ })).toBeVisible();
    await expect(article.bottomActions.getByRole('link', { name: /Edit Article/ })).toBeVisible();
    await expect(article.page.getByRole('link', { name: /Edit Article/ })).toHaveCount(2);
    await expect(article.page.getByRole('button', { name: /Delete Article/ })).toHaveCount(2);
    await expect(article.page.getByRole('button', { name: /Follow|Favorite/ })).toHaveCount(0);  });

  test('35. signed-out follow redirects to login [FR-067, SC-007]', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto('bob');

    await profile.followButton.click();

    await expect(page).toHaveURL('/login');
    await withApi(async api => {
      expect((await api.profile('bob')).following).toBe(false);
    });
  });
});
