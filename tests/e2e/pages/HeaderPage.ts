import { type Locator, type Page } from '@playwright/test';

export class HeaderPage {
  // The page also renders <nav> elements for pagination, so target the app header by its nav class.
  readonly nav: Locator;
  readonly links: Locator;
  readonly logo: Locator;
  readonly avatar: Locator;

  constructor(readonly page: Page) {
    this.nav = page.locator('nav.navbar');
    this.links = this.nav.locator('ul li a');
    this.logo = this.nav.getByRole('link', { name: 'Conduit' });
    this.avatar = this.nav.locator('img.user-pic');
  }

  link(name: string): Locator {
    // Member links start with an icon and a &nbsp;, so match the visible name as a substring.
    return this.nav.getByRole('link', { name });
  }

  async linkTexts(): Promise<string[]> {
    return (await this.links.allInnerTexts()).map(text => text.trim());
  }
}
