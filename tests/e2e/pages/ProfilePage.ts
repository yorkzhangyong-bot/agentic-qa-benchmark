import { type Locator, type Page } from '@playwright/test';

/** A user profile page with its "My Posts" and "Favorited Posts" tabs. */
export class ProfilePage {
  readonly page: Page;
  readonly avatar: Locator;
  readonly username: Locator;
  readonly bio: Locator;
  readonly myPostsTab: Locator;
  readonly favoritesTab: Locator;
  readonly activeTab: Locator;
  readonly editProfileLink: Locator;
  readonly followButton: Locator;
  readonly previews: Locator;
  readonly pageButtons: Locator;
  readonly activePage: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.avatar = page.locator('.user-info img');
    this.username = page.locator('.user-info h4');
    this.bio = page.locator('.user-info p');
    this.myPostsTab = page.getByRole('link', { name: 'My Posts', exact: true });
    this.favoritesTab = page.getByRole('link', { name: 'Favorited Posts', exact: true });
    this.activeTab = page.locator('.articles-toggle a.nav-link.active');
    this.editProfileLink = page.getByRole('link', { name: 'Edit Profile Settings' });
    this.followButton = page
      .locator('.user-info')
      .getByRole('button', { name: /(Follow|Unfollow) / });
    this.previews = page.locator('app-article-preview');
    this.pageButtons = page.locator('.pagination .page-link');
    this.activePage = page.locator('.pagination .page-item.active .page-link');
    this.emptyMessage = page.locator('.empty-feed-message');
  }

  async goto(username: string, tab: 'posts' | 'favorites' = 'posts'): Promise<void> {
    await this.page.goto(tab === 'posts' ? `/profile/${username}` : `/profile/${username}/favorites`);
  }
}
