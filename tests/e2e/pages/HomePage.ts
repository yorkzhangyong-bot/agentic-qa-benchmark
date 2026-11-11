import { type Locator, type Page } from '@playwright/test';

/** The home page: feed tabs, article previews, pagination, popular tags and banner. */
export class HomePage {
  readonly page: Page;
  readonly previews: Locator;
  readonly banner: Locator;
  readonly feedToggle: Locator;
  readonly globalFeedTab: Locator;
  readonly yourFeedTab: Locator;
  readonly popularTags: Locator;
  readonly pageButtons: Locator;
  readonly activePage: Locator;
  readonly emptyMessage: Locator;
  readonly errors: Locator;
  readonly activeTab: Locator;

  constructor(page: Page) {
    this.page = page;
    // Article previews are custom elements; there is no accessible list/role around them.
    this.previews = page.locator('app-article-preview');
    this.banner = page.locator('.home-page .banner');
    this.feedToggle = page.locator('.feed-toggle');
    // Scoped to the tab bar: "Global Feed" also appears as a link in the empty-feed message.
    this.globalFeedTab = this.feedToggle.getByRole('link', { name: 'Global Feed', exact: true });
    this.yourFeedTab = this.feedToggle.getByRole('link', { name: 'Your Feed', exact: true });
    this.popularTags = page.locator('.sidebar').getByRole('link');
    this.pageButtons = page.locator('.pagination .page-link');
    this.activePage = page.locator('.pagination .page-item.active .page-link');
    this.emptyMessage = page.locator('.empty-feed-message');
    this.errors = page.locator('.error-messages');
    // Only real navigation tabs have an href; the tag tab is a plain <a> and would also match.
    this.activeTab = this.feedToggle.locator('a.nav-link.active[href]');
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /** The article preview containing the given card title. */
  preview(title: string): Locator {
    return this.previews.filter({ has: this.page.getByRole('heading', { name: title, exact: true }) });
  }

  async openArticle(title: string): Promise<void> {
    await this.preview(title).getByRole('heading', { name: title, exact: true }).click();
  }

  async clickPage(pageNumber: number): Promise<void> {
    await this.page.getByRole('button', { name: String(pageNumber), exact: true }).click();
  }

  async clickTag(tag: string): Promise<void> {
    await this.page.locator('.sidebar').getByRole('link', { name: tag, exact: true }).click();
  }
}
