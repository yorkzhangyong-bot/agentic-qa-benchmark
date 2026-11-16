import { type Locator, type Page } from '@playwright/test';

/** An article page, with its meta areas, markdown body, tags and comment list. */
export class ArticlePage {
  readonly page: Page;
  readonly title: Locator;
  readonly bannerAvatarLinks: Locator;
  readonly bannerDate: Locator;
  readonly body: Locator;
  readonly tags: Locator;
  readonly comments: Locator;
  readonly commentBox: Locator;
  readonly commentFormAvatar: Locator;
  readonly postCommentButton: Locator;
  readonly commentErrors: Locator;
  readonly signInPrompt: Locator;
  readonly editLinks: Locator;
  readonly deleteButtons: Locator;
  readonly favoriteButtons: Locator;
  readonly followButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole('heading', { level: 1 });
    // The avatar and the username both link to the author's profile; the avatar link has no name.
    this.bannerAvatarLinks = page
      .locator('.article-page .banner .article-meta a')
      .filter({ has: page.locator('img') });
    this.bannerDate = page.locator('.article-page .banner .article-meta .date');
    this.body = page.locator('.article-content');
    this.tags = page.locator('.article-content .tag-list li');
    this.comments = page.locator('app-article-comment');
    this.commentBox = page.getByPlaceholder('Write a comment...');
    this.commentFormAvatar = page.locator('.comment-form img');
    this.postCommentButton = page.getByRole('button', { name: 'Post Comment' });
    this.commentErrors = page.locator('ul.error-messages li');
    this.signInPrompt = page.getByText('to add comments on this article.');
    this.editLinks = page.getByRole('link', { name: 'Edit Article' });
    this.deleteButtons = page.getByRole('button', { name: 'Delete Article' });
    this.favoriteButtons = page.getByRole('button', { name: /favorite Article \(\d+\)$/i });
    this.followButtons = page.getByRole('button', { name: /follow [a-z0-9-]+$/i });
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/article/${slug}`);
  }

  authorLinks(username: string): Locator {
    return this.page.getByRole('link', { name: username, exact: true });
  }

  commentCard(body: string): Locator {
    return this.comments.filter({ hasText: body });
  }

  commentAuthorLink(body: string, username: string): Locator {
    return this.commentCard(body).getByRole('link', { name: username, exact: true });
  }

  /** The trash control is an unlabelled <i> inside .mod-options, rendered only on own comments. */
  commentDeleteIcon(body: string): Locator {
    return this.commentCard(body).locator('.mod-options .ion-trash-a');
  }

  async addComment(text: string): Promise<void> {
    await this.commentBox.fill(text);
    await this.postCommentButton.click();
  }
}
