import { type Locator, type Page } from '@playwright/test';

export class Header {
  readonly root: Locator;
  readonly logo: Locator;
  readonly homeLink: Locator;
  readonly signInLink: Locator;
  readonly signUpLink: Locator;
  readonly newArticleLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    // `app-layout-header` is the header component: the footer also ships a Conduit logo link,
    // and the pagination is rendered as a second navigation landmark.
    this.root = page.locator('app-layout-header');
    this.logo = this.root.getByRole('link', { name: 'Conduit' });
    this.homeLink = this.root.getByRole('link', { name: 'Home', exact: true });
    this.signInLink = this.root.getByRole('link', { name: 'Sign in', exact: true });
    this.signUpLink = this.root.getByRole('link', { name: 'Sign up', exact: true });
    this.newArticleLink = this.root.getByRole('link', { name: 'New Article' });
    this.settingsLink = this.root.getByRole('link', { name: 'Settings' });
  }

  usernameLink(username: string): Locator {
    return this.root.getByRole('link', { name: username, exact: true });
  }

  /** The small avatar shown next to the username when signed in. */
  avatar(): Locator {
    return this.root.locator('img.user-pic');
  }
}
