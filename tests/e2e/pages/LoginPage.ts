import { type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly errors: Locator;
  readonly needAccountLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Sign in' });
    this.email = page.getByPlaceholder('Email');
    this.password = page.getByPlaceholder('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
    this.errors = page.locator('ul.error-messages li');
    this.needAccountLink = page.getByRole('link', { name: 'Need an account?' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
