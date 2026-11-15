import { type Locator, type Page } from '@playwright/test';

export interface AccountData {
  username: string;
  email: string;
  password: string;
}

export class RegisterPage {
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signUpButton: Locator;
  readonly haveAccountLink: Locator;
  readonly errors: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Sign up' });
    this.usernameInput = page.getByPlaceholder('Username');
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.signUpButton = page.getByRole('button', { name: 'Sign up', exact: true });
    this.haveAccountLink = page.getByRole('link', { name: 'Have an account?' });
    this.errors = page.locator('ul.error-messages li');
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  async signUp(account: AccountData): Promise<void> {
    await this.usernameInput.fill(account.username);
    await this.emailInput.fill(account.email);
    await this.passwordInput.fill(account.password);
    await this.signUpButton.click();
  }
}
