import { type Locator, type Page } from '@playwright/test';

export class EditorPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly bodyInput: Locator;
  readonly tagInput: Locator;
  readonly tagChips: Locator;
  readonly publishButton: Locator;
  readonly errors: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByPlaceholder('Article Title');
    this.descriptionInput = page.getByPlaceholder("What's this article about?");
    this.bodyInput = page.getByPlaceholder('Write your article (in markdown)');
    this.tagInput = page.getByPlaceholder('Enter tags');
    this.tagChips = page.locator('.editor-page .tag-list .tag-pill');
    this.publishButton = page.getByRole('button', { name: 'Publish Article' });
    this.errors = page.locator('ul.error-messages li');
  }

  async goto(slug?: string): Promise<void> {
    await this.page.goto(slug ? `/editor/${slug}` : '/editor');
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

  removeTag(tag: string): Locator {
    return this.tagChips.filter({ hasText: tag }).locator('.ion-close-round');
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }
}
