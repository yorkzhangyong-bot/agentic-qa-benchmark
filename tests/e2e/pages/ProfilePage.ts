import { type Locator, type Page } from '@playwright/test';

/** A user profile, with its My Posts / Favorited Posts tabs and the article list below them. */
export class ProfilePage {
  readonly page: Page;
  readonly username: Locator;
  readonly bio: Locator;
  readonly avatar: Locator;
  readonly tabs: Locator;
  readonly myPostsTab: Locator;
  readonly favoritedTab: Locator;
  readonly followButton: Locator;
  readonly editProfileLink: Locator;
  readonly previews: Locator;
  readonly emptyMessage: Locator;
  readonly paginationItems: Locator;
  readonly activePageItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByRole('heading', { level: 4 });
    this.bio = page.locator('.user-info p');
    this.avatar = page.locator('.user-info img');
    this.tabs = page.locator('.articles-toggle');
    this.myPostsTab = this.tabs.getByRole('link', { name: 'My Posts', exact: true });
    this.favoritedTab = this.tabs.getByRole('link', { name: 'Favorited Posts', exact: true });
    this.followButton = page.getByRole('button', { name: /follow [a-z0-9-]+$/i });
    this.editProfileLink = page.getByRole('link', { name: 'Edit Profile Settings' });
    this.previews = page.locator('app-article-preview');
    this.emptyMessage = page.locator('.empty-feed-message');
    this.paginationItems = page.locator('.pagination .page-item');
    this.activePageItem = page.locator('.pagination .page-item.active');
  }

  async goto(username: string, suffix = ''): Promise<void> {
    await this.page.goto(`/profile/${username}${suffix}`);
  }

  preview(title: string): Locator {
    return this.previews.filter({ hasText: title });
  }

  previewHeart(title: string): Locator {
    return this.preview(title).getByRole('button');
  }

  pageButton(number: number): Locator {
    return this.page.getByRole('button', { name: String(number), exact: true });
  }
}
