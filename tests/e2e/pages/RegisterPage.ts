import { type Locator, type Page } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly username: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly errors: Locator;
  readonly haveAccountLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Sign up' });
    this.username = page.getByPlaceholder('Username');
    this.email = page.getByPlaceholder('Email');
    this.password = page.getByPlaceholder('Password');
    this.submit = page.getByRole('button', { name: 'Sign up' });
    this.errors = page.locator('ul.error-messages li');
    this.haveAccountLink = page.getByRole('link', { name: 'Have an account?' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  async signUp(username: string, email: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
