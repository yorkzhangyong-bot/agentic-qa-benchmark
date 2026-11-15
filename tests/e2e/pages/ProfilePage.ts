import { type Locator, type Page } from '@playwright/test';
import { ArticlePreview } from '../components/ArticlePreview';
import { Pagination } from '../components/Pagination';

export class ProfilePage {
  readonly userInfo: Locator;
  readonly username: Locator;
  readonly bio: Locator;
  readonly avatar: Locator;
  readonly editProfileLink: Locator;
  readonly myPostsTab: Locator;
  readonly favoritesTab: Locator;
  readonly activeTab: Locator;
  readonly previews: Locator;
  readonly pagination: Pagination;
  readonly emptyMessage: Locator;

  constructor(private readonly page: Page) {
    this.userInfo = page.locator('.user-info');
    this.username = this.userInfo.getByRole('heading', { level: 4 });
    this.bio = this.userInfo.locator('p');
    this.avatar = this.userInfo.locator('img.user-img');
    this.editProfileLink = page.getByRole('link', { name: 'Edit Profile Settings' });
    this.myPostsTab = page.getByRole('link', { name: 'My Posts' });
    this.favoritesTab = page.getByRole('link', { name: 'Favorited Posts' });
    this.activeTab = page.locator('ul.nav-pills a.nav-link.active').filter({ visible: true });
    // The empty state reuses the `.article-preview` class, so count the preview components instead.
    this.previews = page.locator('app-article-preview');
    this.pagination = new Pagination(page);
    this.emptyMessage = page.getByText('No articles are here... yet.');
  }

  async goto(username: string, tab?: 'favorites'): Promise<void> {
    await this.page.goto(`/profile/${username}${tab === 'favorites' ? '/favorites' : ''}`);
  }

  preview(title: string): ArticlePreview {
    return new ArticlePreview(
      this.previews.filter({ has: this.page.getByRole('heading', { name: title, exact: true }) }),
    );
  }

  // Icon glyphs are part of the accessible name, so match on the case-sensitive phrase
  // ("Unfollow" does not contain the capitalised "Follow").
  followButton(username: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`Follow ${username}`) });
  }

  unfollowButton(username: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`Unfollow ${username}`) });
  }
}
