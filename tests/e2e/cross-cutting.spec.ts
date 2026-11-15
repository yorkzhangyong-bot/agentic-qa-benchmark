import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/auth';
import { SEED_ARTICLES, SEED_PASSWORD, SEED_USERS } from './fixtures/seed';

const LOCAL_HOSTS = ['localhost:4200', 'localhost:3000'];

test.describe('Cross-cutting', () => {
  test('61. loads no external resources [SC-010]', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:') || url.startsWith('blob:')) return;
      const host = new URL(url).host;
      if (!LOCAL_HOSTS.includes(host)) external.push(url);
    });

    await page.goto('/');
    await page.goto(`/article/${SEED_ARTICLES.flaky}`);
    await page.goto('/profile/alice');
    await signIn(page, SEED_USERS.alice.email, SEED_PASSWORD);
    await page.goto('/?feed=following');

    expect(external).toEqual([]);
  });
});
