import { test, expect } from '@playwright/test';
import { cleanupArticle, uniqueId, withApi } from './fixtures/api';
import { AuthPage } from './pages/AuthPage';
import { ArticlePage } from './pages/ArticlePage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

test.describe('Journeys', () => {
  let createdTitle: string | undefined;
  let account: { username: string; email: string } | undefined;

  test.afterEach(async () => {
    if (account) {
      await withApi(async api => {
        try {
          const token = await api.login(account!.email, 'Password123!');
          if (createdTitle) {
            const article = await api.findArticle(createdTitle!, token);
            await api.deleteArticle(token, article.slug);
          }
          const favourited = await api.findArticle('Release notes for testers', token);
          await api.favorite(token, favourited.slug, false);
        } catch {
          // Nothing to clean up.
        }
      });
    }
    createdTitle = undefined;
    account = undefined;
  });

  test('76. new user end-to-end journey [SC-003, SC-008]', async ({ page }) => {
    const auth = new AuthPage(page);
    const editor = new EditorPage(page);
    const article = new ArticlePage(page);
    const home = new HomePage(page);
    const profile = new ProfilePage(page);
    const settings = new SettingsPage(page);

    const username = uniqueId('qa-journey');
    const email = `${username}@example.com`;
    const title = `Journey article ${uniqueId('run')}`;
    const commentText = `qa-journey-comment-${uniqueId('note')}`;
    // Authors see Edit/Delete instead of Follow/Favorite on their own article (FR-045, FR-068),
    // so the favourite part of the journey uses a seeded article by another author.
    const favouritedTitle = 'Release notes for testers';
    account = { username, email };
    createdTitle = title;

    // Sign up.
    await auth.goto('/register');
    await auth.fillRegistration(username, email, 'Password123!');
    await auth.submit();
    await expect(page).toHaveURL('/');

    // Publish an article with two tags.
    await editor.goto('/editor');
    await editor.fill(title, 'A journey article', 'The body of the journey article.');
    await editor.addTag('alpha');
    await editor.addTag('beta');
    await editor.publish();
    await expect(article.title).toHaveText(title);
    // Both tags must be shown; their order is not specified (FR-042).
    await expect(article.tagItems).toHaveCount(2);
    await expect(article.tagItems.filter({ hasText: 'alpha' })).toHaveCount(1);
    await expect(article.tagItems.filter({ hasText: 'beta' })).toHaveCount(1);
    const slug = new URL(page.url()).pathname.split('/').pop()!;

    // First in the Global Feed.
    await home.goto('/');
    await expect(home.previews.getByRole('heading').first()).toHaveText(title);

    // Comment on the new article.
    await article.goto(slug);
    await article.addComment(commentText);
    await expect(article.comments.filter({ hasText: commentText })).toHaveCount(1);

    // Favourite another author's article.
    const favouritedSlug = await withApi(async api => (await api.findArticle(favouritedTitle)).slug);
    await article.goto(favouritedSlug);
    await article.favoriteButton('top').click();
    await expect(article.favoriteButton('top')).toHaveText(/Unfavorite Article \(1\)/);
    await expect(article.favoriteButton('bottom')).toHaveText(/Unfavorite Article \(1\)/);

    // My Posts and Favorited Posts.
    await profile.goto(username);
    await expect(profile.previews.filter({ hasText: title })).toHaveCount(1);
    await profile.favoritesTab.click();
    await expect(page).toHaveURL(`/profile/${username}/favorites`);
    await expect(profile.previews.filter({ hasText: favouritedTitle })).toHaveCount(1);

    // Sign out and back in.
    await settings.goto();
    await settings.logoutButton.click();
    await expect(page).toHaveURL('/');

    await auth.goto('/login');
    await auth.fillLogin(email, 'Password123!');
    await auth.submit();
    await expect(page).toHaveURL('/');

    // The article, comment and favourite survived the new session.
    await article.goto(slug);
    await expect(article.title).toHaveText(title);
    await expect(article.comments.filter({ hasText: commentText })).toHaveCount(1);
    await article.goto(favouritedSlug);
    await expect(article.favoriteButton('top')).toHaveText(/Unfavorite Article \(1\)/);

    await profile.goto(username, 'favorites');
    await expect(profile.previews.filter({ hasText: favouritedTitle })).toHaveCount(1);
  });
});
