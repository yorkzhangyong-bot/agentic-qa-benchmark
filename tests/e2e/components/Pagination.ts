import { type Locator, type Page } from '@playwright/test';
import { waitForArticles } from '../fixtures/network';

export class Pagination {
  readonly root: Locator;
  readonly activeItem: Locator;

  constructor(private readonly page: Page) {
    // The page buttons are Bootstrap pagination buttons; there is no landmark or label that
    // separates them from the heart buttons, which expose only a count as their name.
    this.root = page.locator('ul.pagination');
    this.activeItem = this.root.locator('li.page-item.active');
  }

  get buttons(): Locator {
    return this.root.getByRole('button');
  }

  button(pageNumber: number): Locator {
    return this.root.getByRole('button', { name: String(pageNumber), exact: true });
  }

  /** Clicks a page button and waits for the article list that page loads. */
  async goTo(pageNumber: number): Promise<void> {
    const response = waitForArticles(this.page, { offset: String((pageNumber - 1) * 10) });
    await this.button(pageNumber).click();
    await response;
  }
}
