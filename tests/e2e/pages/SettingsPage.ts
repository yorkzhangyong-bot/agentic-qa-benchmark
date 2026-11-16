import { type Locator, type Page } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly image: Locator;
  readonly username: Locator;
  readonly bio: Locator;
  readonly email: Locator;
  readonly newPassword: Locator;
  readonly updateButton: Locator;
  readonly logoutButton: Locator;
  readonly errors: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Your Settings' });
    this.image = page.getByPlaceholder('URL of profile picture');
    this.username = page.getByPlaceholder('Username');
    this.bio = page.getByPlaceholder('Short bio about you');
    this.email = page.getByPlaceholder('Email');
    this.newPassword = page.getByPlaceholder('New Password');
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
}
