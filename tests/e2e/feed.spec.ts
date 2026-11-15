import { test, expect } from '@playwright/test';
import { Header } from './pages/Header';
import { HomePage } from './pages/HomePage';
import { ArticlePage } from './pages/ArticlePage';
import { signIn, signOut } from './fixtures/auth';
import { waitForArticles, waitForFollowingFeed } from './fixtures/network';
import { SEED_PASSWORD, SEED_USERS } from './fixtures/seed';

const FIRST_PAGE_TITLES = [
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
];

function expectNewestFirst(dateTexts: string[]): void {
  const times = dateTexts.map((text) => Date.parse(text.trim()));
  for (let i = 1; i < times.length; i++) {
    expect(times[i], `date ${dateTexts[i]} should not be newer than ${dateTexts[i - 1]}`).toBeLessThanOrEqual(
      times[i - 1],
    );
  }
}

test.describe('Global feed, pagination and tags', () => {
  test('13. Global Feed page 1 shows the 10 newest articles [FR-027] [FR-038]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto();
    await expect(home.previews).toHaveCount(10);
    await expect(home.previews.getByRole('heading', { level: 1 })).toHaveText(FIRST_PAGE_TITLES);

    await expect(home.preview('Release notes for testers').authorLink('alice')).toHaveAttribute(
      'href',
      '/profile/alice',
    );
    await expect(home.preview('Release notes for testers').date).toHaveText('January 28, 2026');
    await expect(home.preview('Migrating a Node service to ESM').authorLink('bob')).toHaveAttribute(
      'href',
      '/profile/bob',
    );
    await expect(home.preview('Migrating a Node service to ESM').date).toHaveText('January 19, 2026');

    expectNewestFirst(await home.previews.locator('.date').allTextContents());

    await expect(home.pagination.buttons).toHaveCount(3);
    await expect(home.pagination.buttons).toHaveText(['1', '2', '3']);
    await expect(home.pagination.activeItem).toHaveText('1');

    expect(new URL(page.url()).search).toBe('');
    await expect(home.tabs).toHaveText(['Global Feed']);
    await expect(home.globalFeedTab).toHaveClass(/active/);
  });

  test('14. pages the Global Feed to the last page [FR-039] [SC-001]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.pagination.goTo(3);
    await expect(page).toHaveURL('/?page=3');
    await expect(home.previews).toHaveCount(4);
    await expect(home.previews.getByRole('heading', { level: 1 })).toHaveText([
      'Accessible forms in Angular',
      'Writing your first end-to-end test',
      'SQLite is enough for most side projects',
      'Why we test',
    ]);
    await expect(home.pagination.activeItem).toHaveText('3');
  });

  test('15. supports direct page addresses and past-the-end pages [FR-039] [FR-038]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/?page=2');
    await expect(home.previews.getByRole('heading', { level: 1 }).first()).toHaveText(
      'Markdown cheat sheet for Conduit authors',
    );
    await expect(home.pagination.activeItem).toHaveText('2');

    await home.goto('/?page=9');
    await expect(home.emptyMessage).toBeVisible();
    await expect(home.previews).toHaveCount(0);
    await expect(home.pagination.buttons).toHaveText(['1', '2', '3']);
    await expect(home.pagination.activeItem).toHaveCount(0);
  });

  test('16. article preview contents and alphabetical tags [FR-028] [FR-004]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto('/?page=2');

    const preview = home.preview('Flaky tests: a field guide');
    await expect(preview.authorLink('alice')).toHaveAttribute('href', '/profile/alice');
    await expect(preview.avatarLink).toHaveAttribute('href', '/profile/alice');
    await expect(preview.date).toHaveText('January 9, 2026');
    await expect(preview.heart).toHaveText('4');
    await expect(preview.heart).toHaveClass(/btn-outline-primary/);
    await expect(preview.description).toHaveText(
      'How to find, fix and prevent tests that fail at random',
    );
    await expect(preview.readMore).toBeVisible();
    await expect(preview.tags).toHaveText(['automation', 'ci', 'testing']);

    const davePreview = home.preview('Notes from my first week on the team');
    await expect(davePreview.authorLink('dave')).toHaveAttribute('href', '/profile/dave');
    await expect(davePreview.avatar).toHaveAttribute('src', '/assets/default-avatar.svg');
  });

  test('17. opens an article from its preview [FR-029]', async ({ page }) => {
    const home = new HomePage(page);
    const article = new ArticlePage(page);

    await home.goto('/?page=2');
    await home.preview('Flaky tests: a field guide').heading.click();

    await expect(page).toHaveURL(/\/article\/Flaky-tests:-a-field-guide-[a-z0-9]{8}$/);
    await expect(article.title).toHaveText('Flaky tests: a field guide');
  });

  test('18. feed tabs and default selection [FR-030]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto();
    await expect(home.tabs).toHaveCount(1);
    await expect(home.tabs).toHaveText(['Global Feed']);
    await expect(home.globalFeedTab).toHaveClass(/active/);
    await expect(home.yourFeedTab).toHaveCount(0);

    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await page.goto('/');
    await expect(home.tabs).toHaveCount(2);
    await expect(home.tabs).toHaveText(['Your Feed', 'Global Feed']);
    await expect(home.globalFeedTab).toHaveClass(/active/);
    await expect(page).toHaveURL('/');
  });

  test("19. Alice's personal feed [FR-031]", async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await page.goto('/');

    const feed = waitForFollowingFeed(page);
    await home.yourFeedTab.click();
    await feed;

    await expect(page).toHaveURL('/?feed=following');
    await expect(home.previews).toHaveCount(10);
    await expect(home.previews.getByRole('heading', { level: 1 }).first()).toHaveText(
      'Rate limiting in Node without Redis',
    );
    await expect(home.previews.getByRole('heading', { level: 1 }).last()).toHaveText(
      'SQLite is enough for most side projects',
    );

    const authors = (await home.previews.locator('a.author').allTextContents()).map((author) =>
      author.trim(),
    );
    expect(authors).toHaveLength(10);
    for (const author of authors) expect(['bob', 'carol']).toContain(author);

    await expect(home.pagination.buttons).toHaveCount(1);
    await expect(home.pagination.activeItem).toHaveText('1');
    expectNewestFirst(await home.previews.locator('.date').allTextContents());
  });

  test('20. personal feed counts for seed accounts [FR-032]', async ({ page }) => {
    const home = new HomePage(page);
    const accounts = [
      { name: 'bob', total: 12 },
      { name: 'carol', total: 18 },
      { name: 'dave', total: 22 },
    ] as const;

    for (const account of accounts) {
      await signIn(page, SEED_USERS[account.name].email, SEED_PASSWORD);
      await page.goto('/');
      const feed = waitForFollowingFeed(page);
      await home.yourFeedTab.click();
      await feed;

      await expect(new Header(page).usernameLink(account.name)).toBeVisible();
      await expect(page).toHaveURL('/?feed=following');

      const pageCount = Math.ceil(account.total / 10);
      await expect(home.pagination.buttons).toHaveCount(pageCount);
      await expect(home.previews).toHaveCount(10);

      let seen = 10;
      for (let pageNumber = 2; pageNumber <= pageCount; pageNumber++) {
        await home.pagination.goTo(pageNumber);
        const expectedOnPage = Math.min(10, account.total - (pageNumber - 1) * 10);
        await expect(home.previews).toHaveCount(expectedOnPage);
        seen += expectedOnPage;
      }
      expect(seen).toBe(account.total);

      if (account.name !== 'dave') await signOut(page);
    }
  });

  test('21. empty personal feed [FR-033]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page, SEED_USERS.erin.email, SEED_PASSWORD);
    await page.goto('/');

    const feed = waitForFollowingFeed(page);
    await home.yourFeedTab.click();
    await feed;

    await expect(page).toHaveURL('/?feed=following');
    await expect(home.emptyFeedMessage).toBeVisible();
    await expect(home.emptyFeedGlobalLink()).toHaveAttribute('href', '/');
    await expect(home.previews).toHaveCount(0);
    await expect(home.pagination.buttons).toHaveCount(0);
  });

  test('22. pages the personal feed keeping feed=following [FR-040]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page, SEED_USERS.bob.email, SEED_PASSWORD);
    await page.goto('/?feed=following');
    await expect(home.previews.first()).toBeVisible();

    await home.pagination.goTo(2);
    await expect(page).toHaveURL('/?feed=following&page=2');
    await expect(home.previews).toHaveCount(2);
    await expect(home.pagination.activeItem).toHaveText('2');
    await expect(home.yourFeedTab).toHaveClass(/active/);
  });

  test('23. popular tags order [FR-034]', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.popularTags).toHaveCount(10);
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
    await expect(home.popularTags.filter({ hasText: 'security' })).toHaveCount(0);
  });

  test('24. filters by tag and returns to Global Feed [FR-035] [FR-037]', async ({ page }) => {
    const home = new HomePage(page);
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await page.goto('/');

    const tagged = waitForArticles(page, { tag: 'playwright' });
    await page.locator('.sidebar').getByRole('link', { name: 'playwright', exact: true }).click();
    await tagged;

    await expect(page).toHaveURL('/tag/playwright');
    await expect(home.tabs).toHaveText(['Your Feed', 'Global Feed', 'playwright']);
    await expect(home.activeTab).toHaveText('playwright');
    await expect(home.previews).toHaveCount(3);
    await expect(home.previews.getByRole('heading', { level: 1 })).toHaveText([
      'Exploratory testing sessions that actually find bugs',
      'Page objects or not?',
      'Writing your first end-to-end test',
    ]);
    await expect(home.pagination.buttons).toHaveCount(1);
    await expect(home.pagination.activeItem).toHaveText('1');

    const global = waitForArticles(page, { offset: '0' });
    await home.globalFeedTab.click();
    await global;
    await expect(page).toHaveURL('/');
    await expect(home.tabs).toHaveCount(2);
    await expect(home.globalFeedTab).toHaveClass(/active/);
  });

  test('25. tag pages by URL [FR-036] [FR-038]', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto('/tag/security');
    await expect(home.previews).toHaveCount(1);
    await expect(home.previews.getByRole('heading', { level: 1 })).toHaveText([
      'Backups for SQLite, the boring way',
    ]);

    await home.goto('/tag/nonexistent');
    await expect(home.emptyMessage).toBeVisible();
    await expect(home.previews).toHaveCount(0);
    await expect(home.pagination.buttons).toHaveCount(0);

    await home.goto('/tag/testing');
    await expect(home.previews).toHaveCount(10);
    await expect(home.pagination.buttons).toHaveCount(1);
    await expect(home.pagination.activeItem).toHaveText('1');
  });
});
