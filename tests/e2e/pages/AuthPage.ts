import { type Locator, type Page } from '@playwright/test';

/** Shared sign-in / sign-up page. */
export class AuthPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errors: Locator;
  readonly haveAccountLink: Locator;
  readonly needAccountLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.usernameInput = page.getByPlaceholder('Username');
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.submitButton = page.locator('form button[type="submit"]');
    this.errors = page.locator('.error-messages');
    this.haveAccountLink = page.getByRole('link', { name: 'Have an account?' });
    this.needAccountLink = page.getByRole('link', { name: 'Need an account?' });
  }

  async goto(path: '/login' | '/register'): Promise<void> {
    await this.page.goto(path);
  }

  async fillRegistration(username: string, email: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async fillLogin(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
