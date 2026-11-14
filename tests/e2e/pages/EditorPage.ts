import { type Locator, type Page } from '@playwright/test';

/** The article editor, used for both creating and editing articles. */
export class EditorPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly bodyInput: Locator;
  readonly tagInput: Locator;
  readonly publishButton: Locator;
  readonly tagChips: Locator;
  readonly errors: Locator;

  constructor(page: Page) {
    this.page = page;
    // The editor form has placeholders but no <label> elements, so getByPlaceholder is the
    // only stable accessible locator for these fields.
    this.titleInput = page.getByPlaceholder('Article Title');
    this.descriptionInput = page.getByPlaceholder("What's this article about?");
    this.bodyInput = page.getByPlaceholder('Write your article (in markdown)');
    this.tagInput = page.getByPlaceholder('Enter tags');
    this.publishButton = page.getByRole('button', { name: 'Publish Article', exact: true });
    this.tagChips = page.locator('.tag-list .tag-pill');
    this.errors = page.locator('.form-errors');
  }

  async goto(path = '/editor'): Promise<void> {
    await this.page.goto(path);
  }

  async fill(title: string, description: string, body: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.descriptionInput.fill(description);
    await this.bodyInput.fill(body);
  }

  async addTag(tag: string): Promise<void> {
    await this.tagInput.fill(tag);
    await this.tagInput.press('Enter');
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }

  tagChip(tag: string): Locator {
    return this.tagChips.filter({ hasText: tag });
  }
}
