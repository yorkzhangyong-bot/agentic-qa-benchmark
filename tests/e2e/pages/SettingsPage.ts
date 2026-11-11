import { type Locator, type Page } from '@playwright/test';

/** The settings page. */
export class SettingsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly imageInput: Locator;
  readonly usernameInput: Locator;
  readonly bioInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly updateButton: Locator;
  readonly logoutButton: Locator;
  readonly errors: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    // Placeholders are the only accessible names for these fields.
    this.imageInput = page.getByPlaceholder('URL of profile picture');
    this.usernameInput = page.getByPlaceholder('Username');
    this.bioInput = page.getByPlaceholder('Short bio about you');
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('New Password');
    this.updateButton = page.getByRole('button', { name: 'Update Settings', exact: true });
    this.logoutButton = page.getByRole('button', { name: 'Or click here to logout.', exact: true });
    this.errors = page.locator('.error-messages');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
  }

  async update(): Promise<void> {
    await this.updateButton.click();
  }
}
