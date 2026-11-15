import { type Locator, type Page } from '@playwright/test';

export class ArticlePage {
  readonly title: Locator;
  readonly body: Locator;
  readonly tags: Locator;
  readonly firstDate: Locator;
  readonly followButtons: Locator;
  readonly unfollowButtons: Locator;
  readonly favoriteButtons: Locator;
  readonly unfavoriteButtons: Locator;
  readonly editLinks: Locator;
  readonly deleteButtons: Locator;
  readonly comments: Locator;
  readonly commentBox: Locator;
  readonly postCommentButton: Locator;
  readonly commentFormAvatar: Locator;
  readonly signInPrompt: Locator;
  readonly errors: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByRole('heading', { level: 1 });
    this.body = page.locator('.article-content');
    this.tags = page.locator('.article-content ul.tag-list li');
    this.firstDate = page.locator('.article-meta .date').first();
    // The icon elements contribute a private-use glyph to the accessible name, so match on the
    // phrase instead. Matching is case-sensitive: "Unfollow" does not contain "Follow".
    this.followButtons = page.getByRole('button', { name: /Follow / });
    this.unfollowButtons = page.getByRole('button', { name: /Unfollow / });
    this.favoriteButtons = page.getByRole('button', { name: /Favorite Article \(\d+\)/ });
    this.unfavoriteButtons = page.getByRole('button', { name: /Unfavorite Article \(\d+\)/ });
    this.editLinks = page.getByRole('link', { name: /Edit Article/ });
    this.deleteButtons = page.getByRole('button', { name: /Delete Article/ });
    this.comments = page.locator('app-article-comment');
    this.commentBox = page.getByPlaceholder('Write a comment...');
    this.postCommentButton = page.getByRole('button', { name: 'Post Comment' });
    this.commentFormAvatar = page.locator('.comment-form img');
    this.signInPrompt = page.getByText('Sign in or sign up to add comments on this article.');
    this.errors = page.locator('ul.error-messages li');
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/article/${slug}`);
  }

  comment(text: string): Locator {
    return this.comments.filter({ hasText: text });
  }

  followButton(username: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`Follow ${username}`) });
  }

  unfollowButton(username: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`Unfollow ${username}`) });
  }

  /** The trash control inside one of the signed-in user's own comments. */
  commentTrash(comment: Locator): Locator {
    return comment.locator('span.mod-options i.ion-trash-a');
  }

  async postComment(text: string): Promise<void> {
    await this.commentBox.fill(text);
    await this.postCommentButton.click();
  }
}
