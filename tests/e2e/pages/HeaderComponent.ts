import { type Locator, type Page } from '@playwright/test';

/**
 * The site header. It is the only <nav> on the page: the footer is a <contentinfo>.
 */
export class HeaderComponent {
  readonly nav: Locator;
  readonly logo: Locator;
  readonly homeLink: Locator;
  readonly signInLink: Locator;
  readonly signUpLink: Locator;
  readonly newArticleLink: Locator;
  readonly settingsLink: Locator;

  constructor(readonly page: Page) {
    this.nav = page.getByRole('navigation');
    this.logo = this.nav.getByRole('link', { name: 'Conduit' });
    this.homeLink = this.nav.getByRole('link', { name: 'Home', exact: true });
    this.signInLink = this.nav.getByRole('link', { name: 'Sign in', exact: true });
    this.signUpLink = this.nav.getByRole('link', { name: 'Sign up', exact: true });
    this.newArticleLink = this.nav.getByRole('link', { name: 'New Article' });
    this.settingsLink = this.nav.getByRole('link', { name: 'Settings' });
  }

  userLink(username: string): Locator {
    return this.nav.getByRole('link', { name: username, exact: true });
  }

  userAvatar(username: string): Locator {
    return this.userLink(username).locator('img');
  }

  /** Accessible labels of the header links in document order. */
  async linkLabels(): Promise<string[]> {
    return this.nav.getByRole('link').evaluateAll(links =>
      links.map(link => link.getAttribute('aria-label') || link.textContent?.trim() || link.querySelector('img')?.alt || ''),
    );
  }
}
