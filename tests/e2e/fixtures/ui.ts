import { expect, type Page } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { SEED_PASSWORD } from './api';

/** Signs in through the UI and waits for the home page. */
export async function signIn(
  page: Page,
  email = 'alice@example.com',
  password: string = SEED_PASSWORD,
): Promise<void> {
  const auth = new AuthPage(page);
  await auth.goto('/login');
  await auth.fillLogin(email, password);
  await auth.submit();
  await expect(page).toHaveURL('/');
}

/** Signs out through the settings page. */
export async function signOut(page: Page): Promise<void> {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Or click here to logout.', exact: true }).click();
  await expect(page).toHaveURL('/');
}
