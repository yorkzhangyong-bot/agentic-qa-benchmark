import { test, expect, type Locator, type Page } from '@playwright/test';
import { cleanupComment, withApi } from './fixtures/api';
import { signIn } from './fixtures/ui';
import { ArticlePage } from './pages/ArticlePage';

const MARKDOWN = 'Markdown cheat sheet for Conduit authors';
const EXPLORATORY = 'Exploratory testing sessions that actually find bugs';

// Real clipboard pastes are used to prove the cap, because fill() can bypass maxlength.
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test.describe('Comment character counter', () => {
  let slug: string;
  let cleanupBody: string | undefined;

  test.beforeEach(async () => {
    slug = await withApi(async api => (await api.findArticle(MARKDOWN)).slug);
  });

  test.afterEach(async () => {
    if (cleanupBody) await cleanupComment(slug, cleanupBody);
    cleanupBody = undefined;
  });

  async function openArticle(page: Page): Promise<ArticlePage> {
    const article = new ArticlePage(page);
    await signIn(page);
    await article.goto(slug);
    await expect(article.commentBox).toBeVisible();
    return article;
  }

  /**
   * Writes the text to the clipboard and waits until it can be read back, so the following
   * Ctrl+V always pastes the intended text. No timers are involved.
   */
  async function setClipboard(page: Page, text: string): Promise<void> {
    await page.evaluate(value => navigator.clipboard.writeText(value), text);
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(text);
  }

  /** Focuses the box (caret placed by the click) and pastes through the real clipboard. */
  async function pasteInto(page: Page, box: Locator, text: string): Promise<void> {
    await box.click();
    await setClipboard(page, text);
    await page.keyboard.press('Control+V');
  }

  /** Pastes at the current caret, without moving it. */
  async function pasteAtCaret(page: Page, text: string): Promise<void> {
    await setClipboard(page, text);
    await page.keyboard.press('Control+V');
  }

  async function clearBox(page: Page, box: Locator): Promise<void> {
    await box.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
  }

  /** Covers FR-001, FR-003, FR-011, SC-001 */
  test('78. shows 0/500 under the empty comment box for a signed-in user [FR-001, FR-003, FR-011]', async ({
    page,
  }) => {
    const article = await openArticle(page);

    await expect(article.commentBox).toHaveValue('');
    await expect(article.commentCounter).toBeVisible();
    await expect(article.commentCounter).toHaveText('0/500');
    await expect(article.commentForm.locator('small.comment-counter')).toHaveCount(1);

    // The counter sits between the textarea and the avatar / "Post Comment" row.
    const textareaBox = await article.commentBox.boundingBox();
    const counterBox = await article.commentCounter.boundingBox();
    const footerBox = await article.commentForm.locator('.card-footer').boundingBox();
    expect(textareaBox).not.toBeNull();
    expect(counterBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    expect(textareaBox!.y + textareaBox!.height).toBeLessThanOrEqual(counterBox!.y);
    expect(counterBox!.y + counterBox!.height).toBeLessThanOrEqual(footerBox!.y);

    await expect(article.commentForm.locator('.card-footer img')).toBeVisible();
    await expect(article.postCommentButton).toBeVisible();
    // No other N/500 text anywhere on the article page.
    await expect(page.getByText(/^\d+\/500$/)).toHaveCount(1);
  });

  /** Covers FR-003, FR-005, SC-001 */
  test('79. counter follows typing and backspacing [FR-003, FR-005]', async ({ page }) => {
    const article = await openArticle(page);

    await article.commentBox.pressSequentially('a');
    await expect(article.commentCounter).toHaveText('1/500');

    await clearBox(page, article.commentBox);
    await article.commentBox.pressSequentially('Hello world!');
    await expect(article.commentCounter).toHaveText('12/500');

    for (let i = 0; i < 6; i++) await page.keyboard.press('Backspace');
    await expect(article.commentBox).toHaveValue('Hello ');
    await expect(article.commentCounter).toHaveText('6/500');
  });

  /** Covers FR-003, FR-005, SC-001 */
  test('80. counter follows pasted text [FR-003, FR-005]', async ({ page }) => {
    const article = await openArticle(page);

    await pasteInto(page, article.commentBox, 'a'.repeat(120));

    await expect(article.commentBox).toHaveValue('a'.repeat(120));
    await expect(article.commentCounter).toHaveText('120/500');
  });

  /** Covers FR-002, FR-012, SC-004 */
  test('81. signed-out visitor sees the comment prompt and no counter [FR-002, FR-012]', async ({ page }) => {
    const article = new ArticlePage(page);
    await article.goto(slug);

    await expect(page.getByText('Sign in or sign up to add comments on this article.')).toBeVisible();
    await expect(article.commentBox).toHaveCount(0);
    await expect(article.postCommentButton).toHaveCount(0);
    await expect(page.getByText(/^\d+\/500$/)).toHaveCount(0);

    const articlePage = page.locator('app-article-page');
    await expect(articlePage.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login');
    await expect(articlePage.getByRole('link', { name: 'sign up', exact: true })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  /** Covers FR-004, FR-006 */
  test('82. line breaks count as one character and fill the box [FR-004]', async ({ page }) => {
    const article = await openArticle(page);

    await article.commentBox.pressSequentially('a');
    await page.keyboard.press('Enter');
    await page.keyboard.type('b');
    await expect(article.commentBox).toHaveValue('a\nb');
    await expect(article.commentCounter).toHaveText('3/500');

    await clearBox(page, article.commentBox);
    await pasteInto(page, article.commentBox, 'a'.repeat(498));
    await expect(article.commentCounter).toHaveText('498/500');

    await page.keyboard.press('Enter');
    await expect(article.commentCounter).toHaveText('499/500');
    await page.keyboard.press('Enter');
    await expect(article.commentCounter).toHaveText('500/500');
    await expect(article.commentBox).toHaveValue('a'.repeat(498) + '\n\n');
  });

  /** Covers FR-004, FR-006, FR-007, SC-002 */
  test('83. an emoji counts as two characters and cannot be split [FR-004, FR-006]', async ({ page }) => {
    const article = await openArticle(page);

    await pasteInto(page, article.commentBox, '😀');
    await expect(article.commentBox).toHaveValue('😀');
    await expect(article.commentCounter).toHaveText('2/500');

    await clearBox(page, article.commentBox);
    await pasteInto(page, article.commentBox, '😀'.repeat(250));
    await expect(article.commentBox).toHaveValue('😀'.repeat(250));
    await expect(article.commentCounter).toHaveText('500/500');

    await clearBox(page, article.commentBox);
    await pasteInto(page, article.commentBox, 'a'.repeat(499));
    await expect(article.commentCounter).toHaveText('499/500');
    await pasteAtCaret(page, '😀');
    await expect(article.commentBox).toHaveValue('a'.repeat(499));
    await expect(article.commentCounter).toHaveText('499/500');
  });

  /** Covers FR-006, FR-007, SC-002 */
  test('84. pasting more than 500 characters keeps the first 500 [FR-006, FR-007]', async ({ page }) => {
    const article = await openArticle(page);

    await pasteInto(page, article.commentBox, 'a'.repeat(500) + 'b'.repeat(100));

    await expect(article.commentBox).toHaveValue('a'.repeat(500));
    await expect(article.commentCounter).toHaveText('500/500');
    await expect(page.getByText(/^\d+\/500$/)).toHaveCount(1);
  });

  /** Covers FR-006, SC-002 */
  test('85. typing at the limit adds nothing [FR-006]', async ({ page }) => {
    const article = await openArticle(page);

    await pasteInto(page, article.commentBox, 'a'.repeat(500));
    await expect(article.commentCounter).toHaveText('500/500');

    await page.keyboard.type('b');
    await expect(article.commentBox).toHaveValue('a'.repeat(500));
    await expect(article.commentCounter).toHaveText('500/500');

    await page.keyboard.type('xyz');
    await expect(article.commentBox).toHaveValue('a'.repeat(500));
    await expect(article.commentCounter).toHaveText('500/500');
  });

  /** Covers FR-006, FR-007, SC-001 */
  test('86. typing the 500th character fills the box [FR-006, FR-007]', async ({ page }) => {
    const article = await openArticle(page);

    await pasteInto(page, article.commentBox, 'a'.repeat(499));
    await expect(article.commentCounter).toHaveText('499/500');

    await page.keyboard.type('b');
    await expect(article.commentBox).toHaveValue('a'.repeat(499) + 'b');
    await expect(article.commentCounter).toHaveText('500/500');
  });

  /** Covers FR-006, SC-002 */
  test('87. pasting past the limit adds only the characters that fit [FR-006]', async ({ page }) => {
    const article = await openArticle(page);

    await pasteInto(page, article.commentBox, 'a'.repeat(490));
    await expect(article.commentCounter).toHaveText('490/500');

    // Control+End: a plain End only moves to the end of the wrapped visual line.
    await page.keyboard.press('Control+End');
    await pasteAtCaret(page, 'abcdefghijklmnopqrst');

    await expect(article.commentBox).toHaveValue('a'.repeat(490) + 'abcdefghij');
    await expect(article.commentCounter).toHaveText('500/500');
  });

  /** Covers FR-005, FR-006 */
  test('88. replacing a selection in a full box keeps the limit [FR-005, FR-006]', async ({ page }) => {
    const article = await openArticle(page);

    await pasteInto(page, article.commentBox, 'a'.repeat(500));
    await expect(article.commentCounter).toHaveText('500/500');

    await page.keyboard.press('Control+End');
    for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.type('b');

    const value = await article.commentBox.inputValue();
    expect(value).toHaveLength(491);
    expect(value.endsWith('b')).toBe(true);
    await expect(article.commentCounter).toHaveText('491/500');
  });

  /** Covers FR-008, FR-009, FR-012, SC-003 */
  test('89. a comment of exactly 500 characters posts and empties the box [FR-008, FR-009]', async ({ page }) => {
    const article = new ArticlePage(page);
    const body = 'a'.repeat(500);
    cleanupBody = body;
    // Remove a leftover from an earlier interrupted run before asserting "listed once".
    await cleanupComment(slug, body);

    await signIn(page);
    await article.goto(slug);
    await expect(article.commentBox).toBeVisible();

    await pasteInto(page, article.commentBox, body);
    await expect(article.commentCounter).toHaveText('500/500');

    await article.postCommentButton.click();

    const comment = article.comments.filter({ hasText: body });
    await expect(comment).toHaveCount(1);
    await expect(comment.locator('.card-text')).toHaveText(body);
    await expect(comment.getByRole('link', { name: 'alice', exact: true })).toBeVisible();
    await expect(article.commentBox).toHaveValue('');
    await expect(article.commentCounter).toHaveText('0/500');

    await page.reload();
    await expect(article.comments.filter({ hasText: body })).toHaveCount(1);
    await expect(article.commentBox).toHaveValue('');
    await expect(article.commentCounter).toHaveText('0/500');
  });

  /** Covers FR-010, FR-012, SC-005 */
  test('90. a failed post keeps the text and the counter [FR-010]', async ({ page }) => {
    const article = await openArticle(page);

    await article.commentBox.pressSequentially('   ');
    await expect(article.commentCounter).toHaveText('3/500');

    await article.postCommentButton.click();

    await expect(page.getByText("body can't be blank")).toBeVisible();
    await expect(article.comments).toHaveCount(0);
    await expect(article.commentBox).toHaveValue('   ');
    await expect(article.commentCounter).toHaveText('3/500');
  });

  /** Covers FR-005, SC-001 */
  test('91. cutting all the text resets the counter [FR-005]', async ({ page }) => {
    const article = await openArticle(page);

    await article.commentBox.pressSequentially('Hello world!');
    await expect(article.commentCounter).toHaveText('12/500');

    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+X');

    await expect(article.commentBox).toHaveValue('');
    await expect(article.commentCounter).toHaveText('0/500');
  });

  /** Covers FR-011 */
  test('92. reloading clears the box and the counter [FR-011]', async ({ page }) => {
    const article = await openArticle(page);

    await article.commentBox.pressSequentially('Hello world!');
    await expect(article.commentCounter).toHaveText('12/500');

    await page.reload();

    await expect(article.commentBox).toHaveValue('');
    await expect(article.commentCounter).toHaveText('0/500');
  });

  /** Covers FR-005 */
  test('93. undo follows the box [FR-005]', async ({ page }) => {
    const article = await openArticle(page);

    await pasteInto(page, article.commentBox, 'Hello world!');
    await expect(article.commentCounter).toHaveText('12/500');

    await page.keyboard.press('Control+Z');

    await expect(article.commentBox).toHaveValue('');
    await expect(article.commentCounter).toHaveText('0/500');
  });

  /** Covers FR-005, FR-009 */
  test('94. the counter keeps its number while a comment is posting [FR-005, FR-009]', async ({ page }) => {
    const article = new ArticlePage(page);
    const body = 'Nice summary.';
    cleanupBody = body;
    await cleanupComment(slug, body);

    await signIn(page);
    await article.goto(slug);
    await expect(article.commentBox).toBeVisible();

    // Hold the POST on a manually resolved promise; no timers involved.
    let release!: () => void;
    const held = new Promise<void>(resolve => {
      release = resolve;
    });
    await page.route('**/api/articles/*/comments', async route => {
      if (route.request().method() === 'POST') {
        await held;
      }
      await route.continue();
    });

    await article.commentBox.pressSequentially(body);
    await expect(article.commentCounter).toHaveText('13/500');

    await article.postCommentButton.click();

    await expect(article.commentBox).toBeDisabled();
    await expect(article.postCommentButton).toBeDisabled();
    await expect(article.commentCounter).toHaveText('13/500');
    await expect(article.comments).toHaveCount(0);

    release();

    const comment = article.comments.filter({ hasText: body });
    await expect(comment).toHaveCount(1);
    await expect(comment.getByRole('link', { name: 'alice', exact: true })).toBeVisible();
    await expect(article.commentCounter).toHaveText('0/500');
  });

  /** Covers FR-013 */
  test('95. the counter is plain text in a smaller font [FR-013]', async ({ page }) => {
    const article = await openArticle(page);

    await expect(article.commentCounter).toHaveText('0/500');

    const facts = await page.evaluate(() => {
      const counter = document.querySelector('form.comment-form small.comment-counter');
      const textarea = document.querySelector('form.comment-form textarea');
      return {
        tagName: counter?.tagName ?? '',
        role: counter?.getAttribute('role') ?? null,
        counterFontSize: counter ? parseFloat(getComputedStyle(counter).fontSize) : 0,
        textareaFontSize: textarea ? parseFloat(getComputedStyle(textarea).fontSize) : 0,
      };
    });

    expect(['INPUT', 'TEXTAREA', 'A', 'BUTTON']).not.toContain(facts.tagName);
    expect(facts.role).toBeNull();
    expect(facts.counterFontSize).toBeLessThan(facts.textareaFontSize);
    expect(facts.counterFontSize).toBeGreaterThan(0);

    await expect(page.getByRole('link', { name: /^\d+\/500$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^\d+\/500$/ })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: /^\d+\/500$/ })).toHaveCount(0);
  });

  /** Covers FR-012, SC-005 */
  test('96. the seeded article keeps its comments and shows 0/500 [FR-012, SC-005]', async ({ page }) => {
    const article = new ArticlePage(page);
    const exploratorySlug = await withApi(async api => (await api.findArticle(EXPLORATORY)).slug);

    await signIn(page);
    await article.goto(exploratorySlug);

    await expect(article.comments).toHaveCount(5);
    await expect(article.commentsBy('bob')).toHaveCount(2);
    await expect(article.commentsBy('carol')).toHaveCount(1);
    await expect(article.commentsBy('dave')).toHaveCount(1);
    await expect(article.commentsBy('erin')).toHaveCount(1);
    await expect(article.comments.locator('.mod-options')).toHaveCount(0);
    await expect(article.commentBox).toHaveValue('');
    await expect(article.commentCounter).toHaveText('0/500');
  });

  /** Covers FR-012 */
  test('97. an API-posted comment longer than 500 characters is listed unchanged [FR-012]', async ({ page }) => {
    const article = new ArticlePage(page);
    const body = 'c'.repeat(600);
    cleanupBody = body;

    await withApi(async api => {
      const token = await api.userToken('alice');
      await api.addComment(token, slug, body);
    });

    await signIn(page);
    await article.goto(slug);

    const comment = article.comments.filter({ hasText: body });
    await expect(comment).toHaveCount(1);
    await expect(comment.locator('.card-text')).toHaveText(body);
    await expect(article.commentBox).toHaveValue('');
    await expect(article.commentCounter).toHaveText('0/500');
  });
});
