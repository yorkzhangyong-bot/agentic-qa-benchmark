import { type Locator, type Page } from '@playwright/test';

export class SettingsPage {
  readonly heading: Locator;
  readonly pictureInput: Locator;
  readonly usernameInput: Locator;
  readonly bioInput: Locator;
  readonly emailInput: Locator;
  readonly newPasswordInput: Locator;
  readonly updateButton: Locator;
  readonly logoutButton: Locator;
  readonly errors: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Your Settings' });
    this.pictureInput = page.getByPlaceholder('URL of profile picture');
    this.usernameInput = page.getByPlaceholder('Username');
    this.bioInput = page.getByPlaceholder('Short bio about you');
    this.emailInput = page.getByPlaceholder('Email');
    this.newPasswordInput = page.getByPlaceholder('New Password');
    this.updateButton = page.getByRole('button', { name: 'Update Settings' });
    this.logoutButton = page.getByRole('button', { name: 'Or click here to logout.' });
    this.errors = page.locator('ul.error-messages li');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
  }

  /** Logging out is client-side: it clears the stored session and navigates without a request. */
  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
