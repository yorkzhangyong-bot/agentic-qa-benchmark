export const SEED_PASSWORD = 'Password123!';

export const SEED_USERS = {
  alice: { username: 'alice', email: 'alice@example.com' },
  bob: { username: 'bob', email: 'bob@example.com' },
  carol: { username: 'carol', email: 'carol@example.com' },
  dave: { username: 'dave', email: 'dave@example.com' },
  erin: { username: 'erin', email: 'erin@example.com' },
} as const;

export const SEED_ARTICLES = {
  flaky: 'Flaky-tests:-a-field-guide-45af9838',
  exploratory: 'Exploratory-testing-sessions-that-actually-find-bugs-262d883c',
  markdown: 'Markdown-cheat-sheet-for-Conduit-authors-dfc9b07f',
  keyboard: 'Keyboard-navigation-checklist-7459b474',
  rateLimiting: 'Rate-limiting-in-Node-without-Redis-c538a5ec',
} as const;

export const SEED_ARTICLE_TITLES = {
  flaky: 'Flaky tests: a field guide',
  exploratory: 'Exploratory testing sessions that actually find bugs',
  markdown: 'Markdown cheat sheet for Conduit authors',
  keyboard: 'Keyboard navigation checklist',
  rateLimiting: 'Rate limiting in Node without Redis',
} as const;

export const DEFAULT_AVATAR = '/assets/default-avatar.svg';
export const ALICE_AVATAR = 'http://localhost:3000/images/demo-avatar.png';

/** Today's date, formatted the way the app renders article and comment dates. */
export function today(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Unique per test run: keeps disposable accounts, titles and comments collision-free. */
export function uniqueRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Titles created by tests use alphanumeric words and spaces only, so the slug is predictable. */
export function slugPattern(title: string): RegExp {
  return new RegExp(`/article/${title.replace(/[^a-zA-Z0-9]+/g, '-')}-[a-z0-9]{8}$`);
}
