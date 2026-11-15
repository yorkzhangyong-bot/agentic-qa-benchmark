import { type Locator, type Page } from '@playwright/test';

export interface ArticleDraft {
  title: string;
  description: string;
  body: string;
}

export class EditorPage {
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly bodyInput: Locator;
  readonly tagsInput: Locator;
  readonly publishButton: Locator;
  readonly errors: Locator;
  /** The tag chips inside the "Enter tags" field, not the article page tag list. */
  readonly tags: Locator;

  constructor(private readonly page: Page) {
    this.titleInput = page.getByPlaceholder('Article Title');
    this.descriptionInput = page.getByPlaceholder("What's this article about?");
    this.bodyInput = page.getByPlaceholder('Write your article (in markdown)');
    this.tagsInput = page.getByPlaceholder('Enter tags');
    this.publishButton = page.getByRole('button', { name: 'Publish Article' });
    this.errors = page.locator('ul.error-messages li');
    // The chips live next to the tag input inside the same field wrapper.
    this.tags = this.tagsInput.locator('..').locator('.tag-default');
  }

  async goto(slug?: string): Promise<void> {
    await this.page.goto(slug ? `/editor/${slug}` : '/editor');
  }

  async fillArticle(draft: ArticleDraft): Promise<void> {
    await this.titleInput.fill(draft.title);
    await this.descriptionInput.fill(draft.description);
    await this.bodyInput.fill(draft.body);
  }

  async addTag(tag: string): Promise<void> {
    await this.tagsInput.fill(tag);
    await this.tagsInput.press('Enter');
  }

  tagChip(tag: string): Locator {
    return this.tags.filter({ hasText: tag });
  }

  /** Removes a chip with the small × control the chip renders (no accessible name). */
  async removeTag(tag: string): Promise<void> {
    await this.tagChip(tag).locator('i.ion-close-round').click();
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }
}
