import { expect, type Page } from '@playwright/test';
import { Header } from '../pages/Header';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage, type AccountData } from '../pages/RegisterPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SEED_PASSWORD, uniqueRunId } from './seed';
import { waitForApi } from './network';

export type { AccountData };

/** A throwaway account for tests that would otherwise mutate seed users. */
export function disposableAccount(prefix: string): AccountData {
  const id = uniqueRunId();
  return {
    username: `qa-${prefix}-${id}`,
    email: `qa.${prefix}.${id}@example.com`,
    password: SEED_PASSWORD,
  };
}

/** Signs in through the UI and waits for the login response before returning. */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  const login = new LoginPage(page);
  await login.goto();
  const response = waitForApi(page, 'POST', '/api/users/login');
  await login.signIn(email, password);
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL('/');
}

/** Registers a disposable account through the UI and waits for the create response. */
export async function signUp(page: Page, account: AccountData): Promise<void> {
  const register = new RegisterPage(page);
  await register.goto();
  const response = waitForApi(page, 'POST', '/api/users');
  await register.signUp(account);
  expect((await response).status()).toBe(201);
  await expect(page).toHaveURL('/');
  await expect(new Header(page).usernameLink(account.username)).toBeVisible();
}

/** Signs out from the settings page (client-side, so there is no request to wait for). */
export async function signOut(page: Page): Promise<void> {
  const settings = new SettingsPage(page);
  await settings.goto();
  await settings.logout();
  await expect(page).toHaveURL('/');
  await expect(new Header(page).signInLink).toBeVisible();
}
