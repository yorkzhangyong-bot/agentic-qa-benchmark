import { type Locator, type Page } from '@playwright/test';

export class ArticlePage {
  readonly heading: Locator;
  readonly author: Locator;
  readonly date: Locator;
  readonly body: Locator;
  readonly tags: Locator;
  readonly toolbars: Locator;
  readonly editLinks: Locator;
  readonly deleteButtons: Locator;
  readonly favoriteButtons: Locator;
  readonly unfavoriteButtons: Locator;
  readonly comments: Locator;
  readonly commentTexts: Locator;
  readonly commentForm: Locator;
  readonly commentBox: Locator;
  readonly postCommentButton: Locator;
  readonly commentPrompt: Locator;
  readonly errors: Locator;

  constructor(readonly page: Page) {
    // Scope to the article page: during the SPA transition the feed's preview headings still exist.
    this.heading = page.locator('app-article-page h1');
    this.author = page.locator('.banner .author');
    this.date = page.locator('.banner .date');
    this.body = page.locator('.article-content');
    this.tags = page.locator('.article-content ul.tag-list li');
    // Article pages render the author/meta toolbar twice: under the title and below the body.
    this.toolbars = page.locator('.article-meta');
    this.editLinks = page.getByRole('link', { name: 'Edit Article' });
    this.deleteButtons = page.getByRole('button', { name: 'Delete Article' });
    this.favoriteButtons = page.getByRole('button', { name: /Favorite Article/ });
    this.unfavoriteButtons = page.getByRole('button', { name: /Unfavorite Article/ });
    this.comments = page.locator('app-article-comment');
    this.commentTexts = page.locator('app-article-comment .card-text');
    this.commentForm = page.locator('form.comment-form');
    this.commentBox = page.getByPlaceholder('Write a comment...');
    this.postCommentButton = page.getByRole('button', { name: 'Post Comment' });
    this.commentPrompt = page.locator('app-article-page').getByText('to add comments on this article.');
    this.errors = page.locator('ul.error-messages li');
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  followButton(username: string): Locator {
    return this.page.getByRole('button', { name: `Follow ${username}` });
  }

  unfollowButton(username: string): Locator {
    return this.page.getByRole('button', { name: `Unfollow ${username}` });
  }

  commentCard(text: string): Locator {
    return this.comments.filter({ hasText: text });
  }

  async tagNames(): Promise<string[]> {
    return (await this.tags.allInnerTexts()).map(text => text.trim());
  }
}
