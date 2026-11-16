import { type Locator, type Page } from '@playwright/test';
import { ArticlePreview } from './ArticlePreview';

export class HomePage {
  readonly previews: Locator;
  readonly tabs: Locator;
  readonly activeTab: Locator;
  readonly pageItems: Locator;
  readonly activePage: Locator;
  readonly banner: Locator;
  readonly popularTags: Locator;
  readonly emptyMessage: Locator;

  constructor(readonly page: Page) {
    this.previews = page.locator('app-article-preview');
    // The tag tab is rendered but hidden when no tag filter is active.
    this.tabs = page.locator('ul.nav-pills li:not([hidden]) a');
    this.activeTab = page.locator('ul.nav-pills li:not([hidden]) a.nav-link.active');
    this.pageItems = page.locator('ul.pagination li.page-item');
    this.activePage = page.locator('ul.pagination li.page-item.active');
    this.banner = page.locator('.home-page .banner');
    this.popularTags = page.locator('.sidebar .tag-list a');
    this.emptyMessage = page.locator('.empty-feed-message');
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  preview(title: string): ArticlePreview {
    return new ArticlePreview(
      this.previews.filter({ has: this.page.getByRole('heading', { name: title, exact: true }) }),
    );
  }

  pageButton(number: number): Locator {
    return this.pageItems.filter({ has: this.page.getByRole('button', { name: String(number), exact: true }) }).getByRole('button');
  }

  async titles(): Promise<string[]> {
    return (await this.previews.getByRole('heading', { level: 1 }).allInnerTexts()).map(text => text.trim());
  }

  async tabNames(): Promise<string[]> {
    return (await this.tabs.allInnerTexts()).map(text => text.trim());
  }

  async popularTagNames(): Promise<string[]> {
    return (await this.popularTags.allInnerTexts()).map(text => text.trim());
  }
}
