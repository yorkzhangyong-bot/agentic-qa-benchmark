import { type Page, type Response } from '@playwright/test';

/** Waits for a request to the API with the given method and exact pathname (or pathname pattern). */
export function waitForApi(page: Page, method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string | RegExp): Promise<Response> {
  return page.waitForResponse((response) => {
    if (response.request().method() !== method) return false;
    const pathname = new URL(response.url()).pathname;
    return typeof path === 'string' ? pathname === path : path.test(pathname);
  });
}

/**
 * Waits for the article-list request, optionally narrowed by query parameters.
 * The feed, tag pages, profile pages and pagination all load through this endpoint.
 */
export function waitForArticles(page: Page, query: Record<string, string> = {}): Promise<Response> {
  return page.waitForResponse((response) => {
    if (response.request().method() !== 'GET') return false;
    const url = new URL(response.url());
    // The personal feed uses /api/articles/feed; every other listing uses /api/articles.
    if (url.pathname !== '/api/articles' && url.pathname !== '/api/articles/feed') return false;
    return Object.entries(query).every(([key, value]) => url.searchParams.get(key) === value);
  });
}

/** Waits for the personal-feed request ("Your Feed"), which is served from /api/articles/feed. */
export function waitForFollowingFeed(page: Page): Promise<Response> {
  return page.waitForResponse((response) => {
    return (
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/articles/feed'
    );
  });
}

