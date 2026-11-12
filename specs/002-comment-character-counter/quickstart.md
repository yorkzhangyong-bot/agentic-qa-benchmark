# Quickstart: Comment Character Counter

**Feature**: [spec.md](spec.md) | **Date**: 2026-11-12

Manual validation of the feature in a browser, plus the build and formatting checks. Expected results come from the spec; the last column names the requirements each check proves and, in brackets, the spec scenario it covers. Run the checks in order for the final pass (T013): each one starts from the state the previous one leaves; a story subset starts signed in as alice on her article with an empty box. "Clear the box" means select all (Ctrl+A) and press Delete.

## Prerequisites

- Node.js 22.12 or newer and npm. No Bun, no Docker.
- From the repository root, once: `npm run setup` (installs, creates `api/.env`, creates and seeds `api/dev.db`). If earlier runs changed the data, stop the API and run `npm run db:reset`.

## Run

```bash
npm run dev      # API on http://localhost:3000, web app on http://localhost:4200
```

Sign in at `http://localhost:4200/login` as `alice@example.com` with the password `Password123!`, then open `http://localhost:4200/article/Markdown-cheat-sheet-for-Conduit-authors-dfc9b07f`. That article has no comments in the seed data.

## Test texts

`"a" x500` means the letter a repeated 500 times and nothing else, as in the spec. To put such a text on the clipboard, run the matching line in the browser's developer console (F12), then paste into the box with Ctrl+V:

```js
copy('a'.repeat(120))                     // check 16
copy('a'.repeat(490))                     // check 19
copy('a'.repeat(498))                     // check 12
copy('a'.repeat(499))                     // checks 17 and 18
copy('a'.repeat(500))                     // check 9
copy('a'.repeat(500) + 'b'.repeat(100))   // check 6
copy('\u{1F600}')                         // checks 5, 12 and 18 (one 😀)
copy('abcdefghijklmnopqrst')              // check 19
copy('Hello world!')                      // check 21
copy('\u{1F600}'.repeat(250))             // check 13 (250 😀)
```

Typing the text in any text editor and copying it works the same way.

## Checks

| # | Do | Expect | Proves |
|---|---|---|---|
| 1 | Look under the empty comment box ("Write a comment...") | `0/500` as plain text inside the comment form, above the row with the avatar and "Post Comment", in a smaller font than the box text; apart from that line, nothing on the page looks different | FR-001, FR-003, FR-011, FR-013 (US1-1) |
| 2 | Type `Hello world!` | `12/500`, changing with every keystroke | FR-003, FR-005 (US1-2) |
| 3 | Backspace over `world!` | `6/500` | FR-005 (US1-3) |
| 4 | Clear the box, then type `a`, Enter, `b` | `3/500` | FR-004 (a line break counts one) |
| 5 | Clear the box, then type or paste `😀` | `2/500` | FR-004 (an emoji counts two) |
| 6 | Clear the box, then paste `"a" x500` followed by `"b" x100` (600 characters) | The box holds exactly the 500 a and no b; `500/500` | FR-006, FR-007 (US2-1) |
| 7 | With the box full, type `b` | Nothing is added, the box still holds only the 500 a; still `500/500` | FR-006 (US2-2) |
| 8 | Select the last 10 characters in the full box and type `b` | `491/500` | FR-005 (edge case: replacing a selection) |
| 9 | Clear the box, paste `"a" x500` (`500/500`) and click "Post Comment" | A comment whose text is exactly the 500 a appears in the list under alice; the box is empty; `0/500` | FR-008, FR-009 (US2-5) |
| 10 | Type three spaces and click "Post Comment" | `body can't be blank` above the form; no comment is added; the spaces are still in the box; `3/500` | FR-010 (US3-2) |
| 11 | Clear the box, type `Hello world!` (`12/500`), then reload the page | Empty box; `0/500` | FR-011 (US3-4) |
| 12 | Paste `"a" x498`, then press Enter twice; clear the box, paste `"a" x498` again and paste `😀` | `500/500` both times, and nothing more can be typed | FR-004, FR-006 (the box is full exactly when the counter reaches 500) |
| 13 | Clear the box and paste `"😀" x250` (250 emoji, 500 characters) | `500/500` (all 250 emoji fit), and nothing more can be typed | FR-004, FR-006 (edge case: the box holds at most 250 such emoji) |
| 14 | Sign out (Settings, "Or click here to logout.") and open the article again | "Sign in or sign up to add comments on this article." and no counter; "Sign in" links to `/login` and "sign up" to `/register` | FR-002, FR-012 (US1-5) |
| 15 | Sign in again, open the article and delete the 500-character comment from check 9 with its trash icon | The comment disappears at once, without a confirmation, and is still gone after a reload | FR-012 |
| 16 | Clear the box and type `a`; then clear the box and paste `"a" x120` | `1/500`, then `120/500` | FR-003, FR-005 (US1-4, SC-001) |
| 17 | Clear the box and paste `"a" x499`; then type `b` | `499/500`, then `500/500` with the b added after the 499 a | FR-006, FR-007 (US2-3, SC-001) |
| 18 | Clear the box, paste `"a" x499` (`499/500`), then paste `😀` | The box is unchanged; still `499/500` | FR-006 (a character that only partly fits is not added) |
| 19 | Clear the box, paste `"a" x490` (`490/500`), then paste `abcdefghijklmnopqrst` at the end | Only `abcdefghij` is added, so the box ends with `abcdefghij`; `500/500` | FR-006 (US2-4) |
| 20 | Clear the box, type `Hello world!` (`12/500`), select all (Ctrl+A) and cut (Ctrl+X) | Empty box; `0/500` | FR-005 (US3-3) |
| 21 | With the box empty, paste `Hello world!` (`12/500`), then press Ctrl+Z | Empty box; `0/500` | FR-005 (edge case: undo) |
| 22 | Clear the box, type `Nice summary.` (`13/500`) and click "Post Comment". To see the in-flight state, first throttle the network in the browser's developer tools (Network, "Slow 3G"); switch it off again afterwards | While the post is in flight, the box and the button are disabled and the counter still reads `13/500`; then a comment with the text `Nice summary.` is listed under alice, the box is empty and the counter reads `0/500`; after a reload the comment is still listed; its trash icon deletes it at once, without a confirmation, and it stays deleted after a reload | FR-009, FR-012 (US3-1, edge case: posting in progress, SC-005) |
| 23 | Open `http://localhost:4200/article/Exploratory-testing-sessions-that-actually-find-bugs-262d883c`, still signed in as alice | 5 comments (two by bob, one each by carol, dave and erin), none with a trash icon; `0/500` under the empty box | FR-012 (SC-005) |

## Build check

```bash
npm run build    # from the repository root: production builds of api/ and web/, as CI runs them
```

The build must finish without errors or new warnings. Optionally run `npm start` afterwards and repeat checks 1 and 2 against the production build at `http://localhost:4200`.

## Formatting check

From `web/`:

```bash
npx prettier --check --end-of-line auto src/app/features/article/pages/article/article.component.ts src/app/features/article/pages/article/article.component.html src/theme/conduit/styles.css
```

`--end-of-line auto` is needed on a checkout with `core.autocrlf=true`, where the files have CRLF line endings: without it the check fails on line endings alone, before any change. The three files are the ones this feature changes under `web/`; the project's own `format:check` script covers all of them.
