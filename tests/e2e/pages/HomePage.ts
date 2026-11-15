import { type Locator, type Page } from '@playwright/test';
import { ArticlePreview } from '../components/ArticlePreview';
import { Pagination } from '../components/Pagination';

export class HomePage {
  readonly banner: Locator;
  readonly tabs: Locator;
  readonly globalFeedTab: Locator;
  readonly yourFeedTab: Locator;
  readonly activeTab: Locator;
  readonly previews: Locator;
  readonly pagination: Pagination;
  readonly popularTags: Locator;
  readonly emptyMessage: Locator;
  readonly emptyFeedMessage: Locator;

  constructor(private readonly page: Page) {
    this.banner = page.locator('.banner');
    // The feed renders an empty hidden tag tab as well, so only visible tabs count.
    this.tabs = page.locator('ul.nav-pills a.nav-link').filter({ visible: true });
    this.globalFeedTab = page.getByRole('link', { name: 'Global Feed' });
    this.yourFeedTab = page.getByRole('link', { name: 'Your Feed' });
    this.activeTab = page.locator('ul.nav-pills a.nav-link.active').filter({ visible: true });
    // Every card is an `app-article-preview`; the empty state reuses the `.article-preview` class
    // without that wrapper, so the component element is the honest way to count articles.
    this.previews = page.locator('app-article-preview');
    this.pagination = new Pagination(page);
    this.popularTags = page.locator('.sidebar .tag-list a');
    this.emptyMessage = page.getByText('No articles are here... yet.');
    this.emptyFeedMessage = page.getByText(
      'Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!',
    );
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  preview(title: string): ArticlePreview {
    return new ArticlePreview(
      this.previews.filter({ has: this.page.getByRole('heading', { name: title, exact: true }) }),
    );
  }

  /** The "Global Feed" link inside the empty personal-feed message. */
  emptyFeedGlobalLink(): Locator {
    return this.emptyFeedMessage.getByRole('link', { name: 'Global Feed' });
  }
}
