import { type Locator, type Page } from '@playwright/test';

export class EditorPage {
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly bodyInput: Locator;
  readonly tagInput: Locator;
  readonly publishButton: Locator;
  readonly tagPills: Locator;
  readonly errors: Locator;

  constructor(readonly page: Page) {
    this.titleInput = page.getByPlaceholder('Article Title');
    this.descriptionInput = page.getByPlaceholder("What's this article about?");
    this.bodyInput = page.getByPlaceholder('Write your article (in markdown)');
    this.tagInput = page.getByPlaceholder('Enter tags');
    this.publishButton = page.getByRole('button', { name: 'Publish Article' });
    this.tagPills = page.locator('.tag-list .tag-pill');
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

  async removeTag(tag: string): Promise<void> {
    await this.tagPills.filter({ hasText: tag }).locator('i.ion-close-round').click();
  }

  async tagNames(): Promise<string[]> {
    return (await this.tagPills.allInnerTexts()).map(text => text.trim());
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }

  async errorMessages(): Promise<string[]> {
    return (await this.errors.allInnerTexts()).map(text => text.trim());
  }
}
