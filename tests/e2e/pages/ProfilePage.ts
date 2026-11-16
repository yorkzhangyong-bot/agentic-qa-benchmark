import { type Locator, type Page } from '@playwright/test';
import { ArticlePreview } from './ArticlePreview';

export class ProfilePage {
  readonly name: Locator;
  readonly bio: Locator;
  readonly avatar: Locator;
  readonly myPostsLink: Locator;
  readonly favoritesLink: Locator;
  readonly activeTab: Locator;
  readonly previews: Locator;
  readonly pageItems: Locator;
  readonly activePage: Locator;
  readonly emptyMessage: Locator;

  constructor(readonly page: Page) {
    this.name = page.locator('.user-info h4');
    this.bio = page.locator('.user-info p');
    this.avatar = page.locator('.user-info img');
    this.myPostsLink = page.getByRole('link', { name: 'My Posts' });
    this.favoritesLink = page.getByRole('link', { name: 'Favorited Posts' });
    this.activeTab = page.locator('.articles-toggle a.nav-link.active');
    this.previews = page.locator('app-article-preview');
    this.pageItems = page.locator('ul.pagination li.page-item');
    this.activePage = page.locator('ul.pagination li.page-item.active');
    this.emptyMessage = page.locator('.empty-feed-message');
  }

  async goto(username: string, tab: 'posts' | 'favorites' = 'posts'): Promise<void> {
    await this.page.goto(tab === 'favorites' ? `/profile/${username}/favorites` : `/profile/${username}`);
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
}
