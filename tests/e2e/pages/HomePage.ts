import { type Locator, type Page } from '@playwright/test';

/**
 * Home page and tag pages. Article previews are the app-article-preview component elements; they
 * have no landmark or heading wrapper of their own, so their count is read from the component host.
 */
export class HomePage {
  readonly page: Page;
  readonly banner: Locator;
  readonly bannerLogo: Locator;
  readonly tabs: Locator;
  readonly globalFeedTab: Locator;
  readonly yourFeedTab: Locator;
  readonly previews: Locator;
  readonly sidebarTags: Locator;
  readonly emptyMessage: Locator;
  readonly paginationItems: Locator;
  readonly activePageItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.banner = page.locator('.home-page .banner');
    this.bannerLogo = this.banner.getByRole('img', { name: 'Conduit' });
    this.tabs = page.locator('.feed-toggle');
    this.globalFeedTab = this.tabs.getByRole('link', { name: 'Global Feed', exact: true });
    this.yourFeedTab = this.tabs.getByRole('link', { name: 'Your Feed', exact: true });
    this.previews = page.locator('app-article-preview');
    this.sidebarTags = page.locator('.sidebar .tag-list a');
    this.emptyMessage = page.locator('.empty-feed-message');
    this.paginationItems = page.locator('.pagination .page-item');
    this.activePageItem = page.locator('.pagination .page-item.active');
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /** A tag tab is a plain <a> without href, so it has no link role; match it by its text. */
  tagTab(tag: string): Locator {
    return this.tabs.getByText(tag, { exact: true });
  }

  sidebarTag(tag: string): Locator {
    return this.sidebarTags.filter({ hasText: tag });
  }

  preview(title: string): Locator {
    return this.previews.filter({ hasText: title });
  }

  previewTitle(title: string): Locator {
    return this.preview(title).getByRole('heading', { name: title, exact: true });
  }

  /** The single heart button inside a preview; its accessible name is only the count. */
  previewHeart(title: string): Locator {
    return this.preview(title).getByRole('button');
  }

  previewTags(title: string): Locator {
    return this.preview(title).getByRole('listitem');
  }

  pageButton(number: number): Locator {
    return this.page.getByRole('button', { name: String(number), exact: true });
  }

  async previewTitles(): Promise<string[]> {
    return this.previews.getByRole('heading', { level: 1 }).allTextContents();
  }
}
