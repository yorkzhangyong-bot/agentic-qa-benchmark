import { type Locator, type Page } from '@playwright/test';

export class SettingsPage {
  readonly heading: Locator;
  readonly imageInput: Locator;
  readonly usernameInput: Locator;
  readonly bioInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly updateButton: Locator;
  readonly logoutButton: Locator;
  readonly errors: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.imageInput = page.getByPlaceholder('URL of profile picture');
    this.usernameInput = page.getByPlaceholder('Username');
    this.bioInput = page.getByPlaceholder('Short bio about you');
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('New Password');
    this.updateButton = page.getByRole('button', { name: 'Update Settings' });
    this.logoutButton = page.getByRole('button', { name: 'Or click here to logout.' });
    this.errors = page.locator('ul.error-messages li');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
  }

  async update(): Promise<void> {
    await this.updateButton.click();
  }

  async errorMessages(): Promise<string[]> {
    return (await this.errors.allInnerTexts()).map(text => text.trim());
  }
}
