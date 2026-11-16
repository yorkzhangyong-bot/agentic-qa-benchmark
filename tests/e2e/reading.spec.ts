import { test, expect } from './support/fixtures';
import { signInWithToken } from './support/api';
import { HomePage } from './pages/HomePage';
import { ArticlePage } from './pages/ArticlePage';
import { HeaderComponent } from './pages/HeaderComponent';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditorPage } from './pages/EditorPage';
import { SettingsPage } from './pages/SettingsPage';

const FLAKY_SLUG = 'Flaky-tests:-a-field-guide-45af9838';
const MARKDOWN_SLUG = 'Markdown-cheat-sheet-for-Conduit-authors-dfc9b07f';

test.describe('Reading articles', () => {
  /** Covers FR-001, FR-003 */
  test('1. signed-out header and home banner use the documented links [FR-001, FR-003]', async ({ page }) => {
    const home = new HomePage(page);
    const header = new HeaderComponent(page);

    await home.goto('/');

    await expect(header.logo).toHaveAttribute('href', '/');
    await expect(header.homeLink).toHaveAttribute('href', '/');
    await expect(header.signInLink).toHaveAttribute('href', '/login');
    await expect(header.signUpLink).toHaveAttribute('href', '/register');
    expect(await header.linkLabels()).toEqual(['Conduit', 'Home', 'Sign in', 'Sign up']);

    await expect(home.banner).toBeVisible();
    await expect(home.bannerLogo).toBeVisible();
  });

  /** Covers FR-027, FR-030, FR-038, AC1.1, SC-001 */
  test('2. global feed page 1 lists the ten newest articles and three page buttons [FR-027, FR-038, SC-001]', async ({
    page,
  }) => {
    const home = new HomePage(page);

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);

    expect(await home.previewTitles()).toEqual([
      'Release notes for testers',
      'Exploratory testing sessions that actually find bugs',
      'Rate limiting in Node without Redis',
      'How a five-person team cut its regression testing from two days to two hours without hiring anyone',
      'Backups for SQLite, the boring way',
      'Angular performance quick wins',
      'Reviewing test code',
      'What I learned from breaking production',
      'Running tests in CI without tears',
      'Migrating a Node service to ESM',
    ]);
    await expect(home.preview('Release notes for testers').getByText('January 28, 2026')).toBeVisible();

    await expect(home.paginationItems).toHaveCount(3);
    await expect(home.pageButton(1)).toBeVisible();
    await expect(home.pageButton(2)).toBeVisible();
    await expect(home.pageButton(3)).toBeVisible();
    await expect(home.activePageItem).toHaveText('1');

    await expect(home.yourFeedTab).toHaveCount(0);
    await expect(home.globalFeedTab).toBeVisible();
    await expect(home.globalFeedTab).toHaveClass(/active/);
  });

  /** Covers FR-028, FR-029, FR-004 */
  test('3. article previews show every documented part with alphabetical tags [FR-028, FR-029]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);
    const title = 'Flaky tests: a field guide';

    await home.goto('/?page=2');
    await expect(home.previews).toHaveCount(10);

    const preview = home.preview(title);
    await expect(preview.getByRole('link').filter({ has: page.locator('img') })).toHaveAttribute(
      'href',
      '/profile/alice',
    );
    await expect(preview.getByRole('link', { name: 'alice', exact: true })).toHaveAttribute(
      'href',
      '/profile/alice',
    );
    await expect(preview.getByText('January 9, 2026')).toBeVisible();
    await expect(home.previewHeart(title)).toHaveText('4');
    await expect(home.previewTitle(title)).toBeVisible();
    await expect(preview.getByText('How to find, fix and prevent tests that fail at random')).toBeVisible();
    await expect(preview.getByText('Read more...')).toBeVisible();

    const tags = (await home.previewTags(title).allTextContents()).map(tag => tag.trim());
    expect(tags).toEqual(['automation', 'ci', 'testing']);

    await home.previewTitle(title).click();
    await expect(page).toHaveURL(`/article/${FLAKY_SLUG}`);
    await expect(article.title).toHaveText(title);
  });

  /** Covers FR-039, FR-038, AC1.2, SC-001 */
  test('4. page button three shows the four oldest articles at page 3 [FR-039, SC-001]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    await home.pageButton(3).click();

    await expect(page).toHaveURL('/?page=3');
    await expect(home.previews).toHaveCount(4);
    expect(await home.previewTitles()).toEqual([
      'Accessible forms in Angular',
      'Writing your first end-to-end test',
      'SQLite is enough for most side projects',
      'Why we test',
    ]);
    await expect(home.activePageItem).toHaveText('3');
    await expect(home.paginationItems).toHaveCount(3);
  });

  /** Covers FR-039 */
  test('5. pages open by address and page one has no page parameter [FR-039]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/?page=2');
    await expect(home.previews).toHaveCount(10);
    await expect(home.previewTitle('Markdown cheat sheet for Conduit authors')).toBeVisible();
    await expect(home.activePageItem).toHaveText('2');

    await home.pageButton(1).click();
    await expect(page).toHaveURL('/');
    await expect(home.previews).toHaveCount(10);
    await expect(home.previewTitle('Release notes for testers')).toBeVisible();
    await expect(home.activePageItem).toHaveText('1');
  });

  /** Covers FR-038 (empty page edge case) */
  test('6. a page past the last page is empty with no highlighted button [FR-038]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/?page=9');

    await expect(home.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(home.previews).toHaveCount(0);
    await expect(home.pageButton(1)).toBeVisible();
    await expect(home.pageButton(2)).toBeVisible();
    await expect(home.pageButton(3)).toBeVisible();
    await expect(home.activePageItem).toHaveCount(0);
  });

  /** Covers FR-035, AC1.3 */
  test('7. clicking a tag opens the tag page with a selected tag tab [FR-035]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);
    await home.sidebarTag('playwright').click();

    await expect(page).toHaveURL('/tag/playwright');
    await expect(home.globalFeedTab).toBeVisible();
    await expect(home.tagTab('playwright')).toBeVisible();
    await expect(home.tagTab('playwright')).toHaveClass(/active/);
    await expect(home.yourFeedTab).toHaveCount(0);

    await expect(home.previews).toHaveCount(3);
    expect(await home.previewTitles()).toEqual([
      'Exploratory testing sessions that actually find bugs',
      'Page objects or not?',
      'Writing your first end-to-end test',
    ]);
    await expect(home.paginationItems).toHaveCount(1);
  });

  /** Covers FR-036, FR-035 */
  test('8. tag pages work by address including an unknown tag [FR-036]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/tag/security');
    await expect(page).toHaveURL('/tag/security');
    await expect(home.previews).toHaveCount(1);
    await expect(home.previewTitle('Backups for SQLite, the boring way')).toBeVisible();
    await expect(home.tagTab('security')).toHaveClass(/active/);

    await home.goto('/tag/nonexistent');
    await expect(page).toHaveURL('/tag/nonexistent');
    await expect(home.emptyMessage).toHaveText('No articles are here... yet.');
    await expect(home.previews).toHaveCount(0);
    await expect(home.paginationItems).toHaveCount(0);
    await expect(home.tagTab('nonexistent')).toHaveClass(/active/);
  });

  /** Covers FR-037 */
  test('9. global feed on a tag page returns home and removes the tag tab [FR-037]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/tag/playwright');
    await expect(home.previews).toHaveCount(3);
    await home.globalFeedTab.click();

    await expect(page).toHaveURL('/');
    await expect(home.tagTab('playwright')).toBeHidden();
    await expect(home.yourFeedTab).toHaveCount(0);
    await expect(home.globalFeedTab).toHaveClass(/active/);
    await expect(home.previews).toHaveCount(10);
    await expect(home.previewTitle('Release notes for testers')).toBeVisible();
  });

  /** Covers FR-034 */
  test('10. popular tags lists the ten most used tags in order [FR-034]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/');
    await expect(home.sidebarTags).toHaveCount(10);

    const tags = (await home.sidebarTags.allTextContents()).map(tag => tag.trim());
    expect(tags).toEqual([
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
    expect(tags).not.toContain('security');
  });

  /** Covers FR-042, FR-056, FR-004, AC1.4 */
  test('11. article page shows title author date body tags and comments [FR-042, FR-056]', async ({ page }) => {
    const article = new ArticlePage(page);

    await article.goto(FLAKY_SLUG);

    await expect(article.title).toHaveText('Flaky tests: a field guide');
    await expect(article.bannerAvatarLinks.first()).toHaveAttribute('href', '/profile/alice');
    await expect(article.authorLinks('alice').first()).toHaveAttribute('href', '/profile/alice');
    await expect(article.bannerDate).toHaveText('January 9, 2026');
    await expect(page.getByText('Most flaky tests share a handful of causes', { exact: false })).toBeVisible();
    await expect(page.getByText('Quarantine them quickly', { exact: false })).toBeVisible();

    const tags = (await article.tags.allTextContents()).map(tag => tag.trim()).sort();
    expect(tags).toEqual(['automation', 'ci', 'testing']);

    await expect(article.comments).toHaveCount(2);
    const bodies = (await article.comments.locator('.card-text').allTextContents()).map(body => body.trim());
    expect(bodies).toEqual([
      'Our worst offender was a test that depended on the clock.',
      'Bookmarking this for our next retro.',
    ]);
    await expect(
      article.commentAuthorLink('Our worst offender was a test that depended on the clock.', 'bob'),
    ).toHaveAttribute('href', '/profile/bob');
    await expect(article.commentAuthorLink('Bookmarking this for our next retro.', 'erin')).toHaveAttribute(
      'href',
      '/profile/erin',
    );
    await expect(article.commentCard('Bookmarking this for our next retro.').locator('img')).toHaveAttribute(
      'src',
      '/assets/default-avatar.svg',
    );
  });

  /** Covers FR-057, AC1.5 */
  test('12. signed-out article page shows the sign-in prompt instead of the comment form [FR-057]', async ({
    page,
  }) => {
    const article = new ArticlePage(page);

    await article.goto(FLAKY_SLUG);

    await expect(article.signInPrompt).toBeVisible();
    await expect(article.signInPrompt.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
      'href',
      '/login',
    );
    await expect(article.signInPrompt.getByRole('link', { name: 'sign up', exact: true })).toHaveAttribute(
      'href',
      '/register',
    );
    await expect(article.commentBox).toHaveCount(0);
    await expect(article.postCommentButton).toHaveCount(0);
  });

  /** Covers FR-043 */
  test('13. article bodies render markdown including headings lists code quote and links [FR-043]', async ({
    page,
  }) => {
    const article = new ArticlePage(page);

    await article.goto(MARKDOWN_SLUG);

    for (const heading of ['Headings', 'Lists', 'Code', 'Quotes and links']) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    }
    await expect(article.body.locator('ul li')).toHaveCount(2);
    await expect(article.body.locator('ol li')).toHaveCount(2);
    await expect(article.body.locator('code').filter({ hasText: 'const greeting' })).toContainText(
      'const greeting = `Hello, Conduit`;',
    );
    await expect(article.body.locator('blockquote')).toHaveText('Quality is never an accident.');
    await expect(article.body.getByRole('link', { name: 'home page' })).toHaveAttribute('href', '/');
  });

  /** Covers SC-010 */
  test('15. no page loads anything from outside localhost [SC-010]', async ({ page, request }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);
    const profile = new ProfilePage(page);
    const login = new LoginPage(page);
    const editor = new EditorPage(page);
    const settings = new SettingsPage(page);
    const hosts = new Set<string>();

    page.on('request', req => {
      const url = new URL(req.url());
      if (url.protocol.startsWith('http')) hosts.add(url.hostname);
    });

    await home.goto('/');
    await expect(home.previews).toHaveCount(10);

    await home.goto('/tag/playwright');
    await expect(home.previews).toHaveCount(3);

    await article.goto(FLAKY_SLUG);
    await expect(article.title).toHaveText('Flaky tests: a field guide');

    await profile.goto('alice');
    await expect(profile.username).toHaveText('alice');

    await login.goto();
    await expect(login.heading).toBeVisible();

    await signInWithToken(page, request, 'alice@example.com', '/editor');
    await expect(editor.titleInput).toBeVisible();

    await settings.goto();
    await expect(settings.heading).toBeVisible();

    expect(hosts.size).toBeGreaterThan(0);
    expect([...hosts].filter(host => host !== 'localhost')).toEqual([]);
  });
});
