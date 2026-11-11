import { test, expect } from '@playwright/test';
import { withApi } from './fixtures/api';

test.describe('Offline assets', () => {
  test('77. reading flow loads no external hosts [SC-010]', async ({ page }) => {
    const slug = await withApi(async api => (await api.findArticle('Flaky tests: a field guide')).slug);

    const origins = new Set<string>();
    page.on('request', request => {
      origins.add(new URL(request.url()).origin);
    });

    await page.goto('/');
    await page.goto('/?page=2');
    await page.goto('/?page=3');
    await page.goto(`/article/${slug}`);
    await page.goto('/profile/alice');
    await expect(page.getByRole('heading', { level: 4 })).toHaveText('alice');

    const allowed = new Set(['http://localhost:4200', 'http://localhost:3000']);
    const external = [...origins].filter(origin => !allowed.has(origin));
    expect(external).toEqual([]);
  });
});
