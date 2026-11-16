import { expect, type Page } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { EditorPage } from '../pages/EditorPage';
import { HeaderPage } from '../pages/HeaderPage';
import { SettingsPage } from '../pages/SettingsPage';

export const PASSWORD = 'Password123!';

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export interface NewUser {
  username: string;
  email: string;
  password: string;
}

export function throwawayUser(prefix = 'qa'): NewUser {
  const suffix = uniqueSuffix();
  return {
    username: `${prefix}${suffix}`,
    email: `${prefix}${suffix}@example.com`,
    password: PASSWORD,
  };
}

export async function registerUser(page: Page, user: NewUser): Promise<void> {
  const auth = new AuthPage(page);
  await auth.goto('/register');
  const response = page.waitForResponse(r => r.url().endsWith('/api/users') && r.request().method() === 'POST');
  await auth.register(user.username, user.email, user.password);
  expect((await response).status()).toBe(201);
  await expect(page).toHaveURL('/');
  await expect(new HeaderPage(page).link(user.username)).toBeVisible();
}

export async function signInAs(page: Page, email: string, password = PASSWORD): Promise<void> {
  const auth = new AuthPage(page);
  await auth.goto('/login');
  const response = page.waitForResponse(r => r.url().endsWith('/api/users/login') && r.request().method() === 'POST');
  await auth.login(email, password);
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL('/');
}

export async function signOut(page: Page): Promise<void> {
  const settings = new SettingsPage(page);
  await settings.goto();
  await settings.logoutButton.click();
  await expect(page).toHaveURL('/');
}

export interface ArticleInput {
  title: string;
  description: string;
  body: string;
  tags?: string[];
}

export async function publishArticle(page: Page, article: ArticleInput): Promise<string> {
  const editor = new EditorPage(page);
  await editor.goto();
  await editor.fill(article.title, article.description, article.body);
  for (const tag of article.tags ?? []) {
    await editor.addTag(tag);
  }
  const response = page.waitForResponse(r => r.url().endsWith('/api/articles') && r.request().method() === 'POST');
  await editor.publish();
  expect((await response).status()).toBe(201);
  await expect(page).toHaveURL(/\/article\//);
  return new URL(page.url()).pathname.replace('/article/', '');
}

export async function deleteArticle(page: Page, slug: string): Promise<void> {
  await page.goto(`/article/${slug}`);
  const response = page.waitForResponse(
    r => r.url().endsWith(`/api/articles/${slug}`) && r.request().method() === 'DELETE',
  );
  await page.getByRole('button', { name: 'Delete Article' }).first().click();
  expect((await response).status()).toBe(204);
}
