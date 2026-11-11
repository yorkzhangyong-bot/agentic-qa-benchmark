import { type Locator, type Page } from '@playwright/test';

/** The signed-in/signed-out navigation bar. */
export class HeaderPage {
  readonly page: Page;
  /** All header links in DOM order, including the logo link (whose accessible name is "Conduit"). */
  readonly links: Locator;
  readonly logo: Locator;
  readonly homeLink: Locator;
  readonly signInLink: Locator;
  readonly signUpLink: Locator;
  readonly newArticleLink: Locator;
  readonly settingsLink: Locator;
  readonly avatar: Locator;

  constructor(page: Page) {
    this.page = page;
    const header = page.locator('app-layout-header');
    this.links = header.getByRole('navigation').getByRole('link');
    this.logo = header.getByRole('link', { name: 'Conduit' });
    this.homeLink = header.getByRole('link', { name: 'Home', exact: true });
    this.signInLink = header.getByRole('link', { name: 'Sign in', exact: true });
    this.signUpLink = header.getByRole('link', { name: 'Sign up', exact: true });
    this.newArticleLink = header.getByRole('link', { name: /New Article/ });
    this.settingsLink = header.getByRole('link', { name: /Settings/ });
    this.avatar = header.locator('img.user-pic');
  }

  /** The header link carrying the signed-in username (the link text is the username). */
  userLink(username: string): Locator {
    return this.page
      .locator('app-layout-header')
      .getByRole('link', { name: username, exact: true });
  }
}
