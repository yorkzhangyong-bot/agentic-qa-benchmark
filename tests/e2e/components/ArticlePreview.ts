import { type Locator } from '@playwright/test';

/** A single `.article-preview` card in a feed, tag page or profile listing. */
export class ArticlePreview {
  readonly heading: Locator;
  readonly heart: Locator;
  readonly tags: Locator;
  readonly avatar: Locator;
  readonly avatarLink: Locator;
  readonly date: Locator;
  readonly description: Locator;
  readonly readMore: Locator;

  constructor(readonly root: Locator) {
    this.heading = root.getByRole('heading', { level: 1 });
    // A preview contains exactly one button: the favourite heart. Its accessible name is only
    // the count, so the toggle state is asserted through its modifier class in the specs.
    this.heart = root.getByRole('button');
    this.tags = root.locator('ul.tag-list li');
    this.avatar = root.locator('img').first();
    // The avatar link has no accessible name (the image is decorative), so anchor on the image.
    this.avatarLink = root.locator('a:has(img)');
    this.date = root.locator('.date');
    this.description = root.locator('p');
    this.readMore = root.getByText('Read more...');
  }

  authorLink(author: string): Locator {
    return this.root.getByRole('link', { name: author, exact: true });
  }
}
