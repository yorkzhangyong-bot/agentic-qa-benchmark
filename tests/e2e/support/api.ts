import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** The API runs beside the web app on its own port; the web app rewrites /api calls to this host. */
export const API_BASE = 'http://localhost:3000/api';
export const PASSWORD = 'Password123!';

const authHeaders = (token: string) => ({ Authorization: `Token ${token}` });

let sequence = 0;

/** A unique, URL-safe suffix so tests never collide on usernames, emails or titles. */
export function unique(label: string): string {
  sequence += 1;
  return `${label}-${Date.now().toString(36)}-${sequence}`;
}

export function accountName(label: string): string {
  return unique(`qa-${label}`).replace(/[^a-z0-9-]/gi, '');
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password = PASSWORD,
): Promise<string> {
  const response = await request.post(`${API_BASE}/users/login`, { data: { user: { email, password } } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.user.token as string;
}

export async function createAccount(
  request: APIRequestContext,
  username: string,
  email = `${username}@example.com`,
  password = PASSWORD,
): Promise<string> {
  const response = await request.post(`${API_BASE}/users`, { data: { user: { username, email, password } } });
  expect(response.status()).toBe(201);
  const body = await response.json();
  return body.user.token as string;
}

/**
 * Signs in through the API and stores the token before visiting the requested page, so the test
 * starts already authenticated without walking the sign-in form (which scenario 21 covers on its own).
 * The token is written to localStorage rather than an init script, so a later logout stays logged out.
 */
export async function signInWithToken(
  page: Page,
  request: APIRequestContext,
  email: string,
  path = '/',
  password = PASSWORD,
): Promise<string> {
  const token = await apiLogin(request, email, password);
  await page.goto('/');
  await page.evaluate(value => window.localStorage.setItem('jwtToken', value), token);
  await page.goto(path);
  return token;
}

/** Switches the signed-in user within one test by replacing the stored token. */
export async function switchUser(
  page: Page,
  request: APIRequestContext,
  email: string,
  path = '/',
  password = PASSWORD,
): Promise<string> {
  const token = await apiLogin(request, email, password);
  await page.goto('/');
  await page.evaluate(value => window.localStorage.setItem('jwtToken', value), token);
  await page.goto(path);
  return token;
}

export interface ArticleInput {
  title: string;
  description: string;
  body: string;
  tagList?: string[];
}

export async function updateUser(
  request: APIRequestContext,
  token: string,
  user: Record<string, unknown>,
): Promise<void> {
  const response = await request.put(`${API_BASE}/user`, { headers: authHeaders(token), data: { user } });
  expect(response.status()).toBe(200);
}

export async function createArticle(
  request: APIRequestContext,
  token: string,
  article: ArticleInput,
): Promise<{ slug: string; title: string }> {
  const response = await request.post(`${API_BASE}/articles`, {
    headers: authHeaders(token),
    data: { article: { ...article, tagList: article.tagList ?? [] } },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  return { slug: body.article.slug as string, title: body.article.title as string };
}

export async function deleteArticle(request: APIRequestContext, token: string, slug: string): Promise<void> {
  const response = await request.delete(`${API_BASE}/articles/${encodeURIComponent(slug)}`, {
    headers: authHeaders(token),
  });
  expect([204, 404]).toContain(response.status());
}

export async function createComment(
  request: APIRequestContext,
  token: string,
  slug: string,
  body: string,
): Promise<number> {
  const response = await request.post(`${API_BASE}/articles/${encodeURIComponent(slug)}/comments`, {
    headers: authHeaders(token),
    data: { comment: { body } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.comment.id as number;
}

export async function deleteComment(
  request: APIRequestContext,
  token: string,
  slug: string,
  id: number,
): Promise<void> {
  const response = await request.delete(
    `${API_BASE}/articles/${encodeURIComponent(slug)}/comments/${id}`,
    { headers: authHeaders(token) },
  );
  expect([204, 404]).toContain(response.status());
}

export async function favoriteArticle(request: APIRequestContext, token: string, slug: string): Promise<void> {
  const response = await request.post(`${API_BASE}/articles/${encodeURIComponent(slug)}/favorite`, {
    headers: authHeaders(token),
  });
  expect(response.status()).toBe(200);
}

export async function unfavoriteArticle(request: APIRequestContext, token: string, slug: string): Promise<void> {
  const response = await request.delete(`${API_BASE}/articles/${encodeURIComponent(slug)}/favorite`, {
    headers: authHeaders(token),
  });
  expect(response.status()).toBe(200);
}

export async function followUser(request: APIRequestContext, token: string, username: string): Promise<void> {
  const response = await request.post(`${API_BASE}/profiles/${username}/follow`, { headers: authHeaders(token) });
  expect(response.status()).toBe(200);
}

export async function unfollowUser(request: APIRequestContext, token: string, username: string): Promise<void> {
  const response = await request.delete(`${API_BASE}/profiles/${username}/follow`, {
    headers: authHeaders(token),
  });
  expect(response.status()).toBe(200);
}

export async function articlesCount(request: APIRequestContext): Promise<number> {
  const response = await request.get(`${API_BASE}/articles?limit=1`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.articlesCount as number;
}

export async function commentCount(request: APIRequestContext, slug: string): Promise<number> {
  const response = await request.get(`${API_BASE}/articles/${encodeURIComponent(slug)}/comments`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.comments.length as number;
}
