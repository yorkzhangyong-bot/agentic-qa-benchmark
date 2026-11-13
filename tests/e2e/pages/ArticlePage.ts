import { type Locator, type Page } from '@playwright/test';

/** An article page: title, metadata, tags, body, comment list and comment form. */
export class ArticlePage {
  readonly page: Page;
  readonly title: Locator;
  readonly topActions: Locator;
  readonly bottomActions: Locator;
  /** Date in the article header ("January 9, 2026"). */
  readonly date: Locator;
  readonly tagItems: Locator;
  readonly content: Locator;
  readonly comments: Locator;
  readonly commentForm: Locator;
  readonly commentBox: Locator;
  readonly commentCounter: Locator;
  readonly postCommentButton: Locator;
  readonly errors: Locator;
  readonly articleBody: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole('heading', { level: 1 });
    this.topActions = page.locator('.banner .article-meta');
    this.bottomActions = page.locator('.article-actions');
    this.date = page.locator('.banner .date');
    this.tagItems = page.locator('.article-content .tag-list li');
    this.content = page.locator('.article-content');
    this.articleBody = page.locator('.article-content > div > div').first();
    this.comments = page.locator('app-article-comment');
    // The counter is a plain <small> with no role, label or test id; its exact text is the only
    // accessible hook, anchored to the comment form so it cannot match anything else on the page.
    this.commentForm = page.locator('form.comment-form');
    this.commentBox = page.getByPlaceholder('Write a comment...');
    this.commentCounter = this.commentForm.getByText(/^\d+\/500$/);
    this.postCommentButton = page.getByRole('button', { name: 'Post Comment', exact: true });
    this.errors = page.locator('.error-messages');
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/article/${slug}`);
  }

  /** Author link (username) inside the visible metadata, used for both action areas. */
  authorLinks(username: string): Locator {
    return this.page.locator('.article-meta').getByRole('link', { name: username, exact: true });
  }

  favoriteButton(area: 'top' | 'bottom' = 'top'): Locator {
    return (area === 'top' ? this.topActions : this.bottomActions).getByRole('button', {
      name: /(Favorite|Unfavorite) Article/,
    });
  }

  followButton(area: 'top' | 'bottom' = 'top'): Locator {
    return (area === 'top' ? this.topActions : this.bottomActions).getByRole('button', {
      name: /(Follow|Unfollow) /,
    });
  }

  async addComment(text: string): Promise<void> {
    await this.commentBox.fill(text);
    await this.postCommentButton.click();
  }

  /** Comment card whose author is the given username. */
  commentsBy(username: string): Locator {
    return this.comments.filter({ has: this.page.getByRole('link', { name: username, exact: true }) });
  }
}
