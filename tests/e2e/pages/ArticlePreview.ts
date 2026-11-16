import { type Locator, type Page } from '@playwright/test';

export class ArticlePreview {
  constructor(readonly root: Locator) {}

  get title(): Locator {
    return this.root.getByRole('heading', { level: 1 });
  }

  get description(): Locator {
    return this.root.locator('p');
  }

  get author(): Locator {
    return this.root.locator('a.author');
  }

  get authorAvatarLink(): Locator {
    return this.root.locator('a:has(img)');
  }

  get authorAvatar(): Locator {
    return this.authorAvatarLink.locator('img');
  }

  get date(): Locator {
    return this.root.locator('.date');
  }

  get favoriteButton(): Locator {
    return this.root.getByRole('button');
  }

  get tags(): Locator {
    return this.root.locator('ul.tag-list li');
  }

  async open(): Promise<void> {
    // The whole preview is one link; its accessible name is the concatenated summary,
    // so click the title heading inside it.
    await this.title.click();
  }
}
