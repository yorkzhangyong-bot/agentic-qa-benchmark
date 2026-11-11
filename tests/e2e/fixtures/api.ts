import { expect, request, type APIRequestContext } from '@playwright/test';

/**
 * Small REST client for the Conduit API (http://localhost:3000/api).
 *
 * It is used for test setup/cleanup only: finding seeded slugs, creating disposable articles,
 * restoring seed state (bio, image, username, password, follows, favourites) and checking that
 * the seeded database is still intact. Every behaviour under test is driven through the UI.
 */
export const API_ORIGIN = 'http://localhost:3000';
export const API_BASE = `${API_ORIGIN}/api`;
export const SEED_PASSWORD = 'Password123!';

export interface SeedArticle {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  author: { username: string };
  favorited: boolean;
  favoritesCount: number;
}

export interface Comment {
  id: number;
  body: string;
  author: { username: string };
}

let sequence = 0;

/** Unique, slug-safe id for test data. */
export function uniqueId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

export class ApiClient {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(): Promise<ApiClient> {
    return new ApiClient(await request.newContext({ baseURL: `${API_ORIGIN}/` }));
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  private headers(token?: string): Record<string, string> {
    return token ? { Authorization: `Token ${token}` } : {};
  }

  /** Returns the JWT for an email/password pair, or throws when the login fails. */
  async login(email: string, password: string = SEED_PASSWORD): Promise<string> {
    const res = await this.ctx.post('api/users/login', { data: { user: { email, password } } });
    if (!res.ok()) {
      throw new Error(`Login failed for ${email}: ${res.status()}`);
    }
    const body = (await res.json()) as { user: { token: string } };
    return body.user.token;
  }

  /** Returns the HTTP status of a login attempt without throwing. */
  async loginStatus(email: string, password: string = SEED_PASSWORD): Promise<number> {
    const res = await this.ctx.post('api/users/login', { data: { user: { email, password } } });
    return res.status();
  }

  async userToken(username: string, password: string = SEED_PASSWORD): Promise<string> {
    return this.login(`${username}@example.com`, password);
  }

  async articleCount(token?: string): Promise<number> {
    const res = await this.ctx.get('api/articles?limit=1', { headers: this.headers(token) });
    const body = (await res.json()) as { articlesCount: number };
    return body.articlesCount;
  }

  async titles(token?: string): Promise<string[]> {
    const res = await this.ctx.get('api/articles?limit=100', { headers: this.headers(token) });
    const body = (await res.json()) as { articles: Array<{ title: string }> };
    return body.articles.map(article => article.title);
  }

  async findArticle(title: string, token?: string): Promise<SeedArticle> {
    for (let offset = 0; offset < 500; offset += 100) {
      const res = await this.ctx.get(`api/articles?limit=100&offset=${offset}`, { headers: this.headers(token) });
      const body = (await res.json()) as { articles: SeedArticle[]; articlesCount: number };
      const found = body.articles.find(article => article.title === title);
      if (found) return found;
      if (offset + 100 >= body.articlesCount) break;
    }
    throw new Error(`Article not found: ${title}`);
  }

  async articleBySlug(slug: string, token?: string): Promise<SeedArticle> {
    const res = await this.ctx.get(`api/articles/${slug}`, { headers: this.headers(token) });
    const body = (await res.json()) as { article: SeedArticle };
    return body.article;
  }

  async createArticle(
    token: string,
    data: { title: string; description: string; body: string; tagList?: string[] },
  ): Promise<SeedArticle> {
    const res = await this.ctx.post('api/articles', { headers: this.headers(token), data: { article: data } });
    const body = (await res.json()) as { article: SeedArticle };
    return body.article;
  }

  async deleteArticle(token: string, slug: string): Promise<void> {
    await this.ctx.delete(`api/articles/${slug}`, { headers: this.headers(token) });
  }

  async favorite(token: string, slug: string, on = true): Promise<void> {
    if (on) {
      await this.ctx.post(`api/articles/${slug}/favorite`, { headers: this.headers(token) });
    } else {
      await this.ctx.delete(`api/articles/${slug}/favorite`, { headers: this.headers(token) });
    }
  }

  async follow(token: string, username: string, on = true): Promise<void> {
    if (on) {
      await this.ctx.post(`api/profiles/${username}/follow`, { headers: this.headers(token) });
    } else {
      await this.ctx.delete(`api/profiles/${username}/follow`, { headers: this.headers(token) });
    }
  }

  async profileStatus(username: string): Promise<number> {
    const res = await this.ctx.get(`api/profiles/${username}`);
    return res.status();
  }

  async profile(username: string): Promise<{ username: string; following: boolean }> {
    const res = await this.ctx.get(`api/profiles/${username}`);
    const body = (await res.json()) as { profile: { username: string; following: boolean } };
    return body.profile;
  }

  async updateUser(token: string, user: Record<string, unknown>): Promise<void> {
    await this.ctx.put('api/user', { headers: this.headers(token), data: { user } });
  }

  async comments(slug: string): Promise<Comment[]> {
    const res = await this.ctx.get(`api/articles/${slug}/comments`);
    const body = (await res.json()) as { comments: Comment[] };
    return body.comments;
  }

  async addComment(token: string, slug: string, body: string): Promise<Comment> {
    const res = await this.ctx.post(`api/articles/${slug}/comments`, {
      headers: this.headers(token),
      data: { comment: { body } },
    });
    const payload = (await res.json()) as { comment: Comment };
    return payload.comment;
  }

  async deleteComment(token: string, slug: string, id: number): Promise<void> {
    await this.ctx.delete(`api/articles/${slug}/comments/${id}`, { headers: this.headers(token) });
  }
}

/** Runs a callback with a fresh API client and always disposes of it. */
export async function withApi<T>(fn: (api: ApiClient) => Promise<T>): Promise<T> {
  const api = await ApiClient.create();
  try {
    return await fn(api);
  } finally {
    await api.dispose();
  }
}

/**
 * Deletes a disposable article created by a test, ignoring failures so a test's own failure is
 * not hidden by cleanup noise.
 */
export async function cleanupArticle(title: string, username = 'alice'): Promise<void> {
  await withApi(async api => {
    try {
      const token = await api.userToken(username);
      const article = await api.findArticle(title, token);
      await api.deleteArticle(token, article.slug);
    } catch {
      // Nothing to clean up.
    }
  });
}

/** Restores the seeded bio and image of a user. */
export async function restoreProfile(username: string, password: string = SEED_PASSWORD): Promise<void> {
  await withApi(async api => {
    try {
      const token = await api.login(`${username}@example.com`, password);
      await api.updateUser(token, {
        bio: 'QA lead. Writes about test strategy and automation.',
        image: `${API_ORIGIN}/images/demo-avatar.png`,
      });
    } catch {
      // Nothing to clean up.
    }
  });
}

/** Restores alice's username and email after a settings test that may have changed them. */
export async function restoreAliceAccount(): Promise<void> {
  await withApi(async api => {
    for (const email of ['alice@example.com', 'bob@example.com']) {
      try {
        const token = await api.login(email, SEED_PASSWORD);
        await api.updateUser(token, { username: 'alice', email: 'alice@example.com' });
        return;
      } catch {
        // Try the next known email.
      }
    }
  });
}

/** Restores alice's password to the seeded value after a settings test changed it. */
export async function restoreAlicePassword(): Promise<void> {
  await withApi(async api => {
    for (const password of ['NewPassword456!', SEED_PASSWORD]) {
      try {
        const token = await api.login('alice@example.com', password);
        await api.updateUser(token, { password: SEED_PASSWORD });
        return;
      } catch {
        // Try the next known password.
      }
    }
  });
}

/** Turns a follow or favourite back off, ignoring failures. */
export async function clearFollow(followerUsername: string, followedUsername: string): Promise<void> {
  await withApi(async api => {
    try {
      const token = await api.userToken(followerUsername);
      await api.follow(token, followedUsername, false);
    } catch {
      // Nothing to clean up.
    }
  });
}

export async function clearFavorite(username: string, title: string): Promise<void> {
  await withApi(async api => {
    try {
      const token = await api.userToken(username);
      const article = await api.findArticle(title, token);
      await api.favorite(token, article.slug, false);
    } catch {
      // Nothing to clean up.
    }
  });
}

/** Deletes a comment by its body, ignoring failures. */
export async function cleanupComment(slug: string, body: string, username = 'alice'): Promise<void> {
  await withApi(async api => {
    try {
      const token = await api.userToken(username);
      const comments = await api.comments(slug);
      const comment = comments.find(item => item.body === body);
      if (comment) await api.deleteComment(token, slug, comment.id);
    } catch {
      // Nothing to clean up.
    }
  });
}

/**
 * Checks the shared seed database is still intact: 24 articles and alice can still sign in
 * with the documented password.
 */
export async function expectSeedDataIntact(): Promise<void> {
  await withApi(async api => {
    expect(await api.articleCount()).toBe(24);
    expect(await api.loginStatus('alice@example.com', SEED_PASSWORD)).toBe(200);
  });
}
