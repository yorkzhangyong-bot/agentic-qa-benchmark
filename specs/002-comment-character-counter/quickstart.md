# Quickstart: Comment Character Counter

**Feature**: [spec.md](spec.md) | **Date**: 2026-11-12

Manual validation of the feature in a browser, plus the build check. Expected results come from the spec; the last column names the requirements each check proves.

## Prerequisites

- Node.js 22.12 or newer and npm. No Bun, no Docker.
- From the repository root, once: `npm run setup` (installs, creates `api/.env`, creates and seeds `api/dev.db`). If earlier runs changed the data, stop the API and run `npm run db:reset`.

## Run

```bash
npm run dev      # API on http://localhost:3000, web app on http://localhost:4200
```

Sign in at `http://localhost:4200/login` as `alice@example.com` with the password `Password123!`, then open `http://localhost:4200/article/Markdown-cheat-sheet-for-Conduit-authors-dfc9b07f`. That article has no comments in the seed data.

## Checks

| # | Do | Expect | Proves |
|---|---|---|---|
| 1 | Look under the empty comment box ("Write a comment...") | `0/500` as small text inside the comment form, above the row with the avatar and "Post Comment" | FR-001, FR-003, FR-011, FR-013 |
| 2 | Type `Hello world!` | `12/500`, changing with every keystroke | FR-003, FR-005 |
| 3 | Backspace over `world!` | `6/500` | FR-005 |
| 4 | Clear the box, then type `a`, Enter, `b` | `3/500` | FR-004 (a line break counts one) |
| 5 | Clear the box, then type or paste `😀` | `2/500` | FR-004 (an emoji counts two) |
| 6 | Clear the box, then paste 600 characters (see below) | The box holds the first 500 of them; `500/500` | FR-006, FR-007 |
| 7 | With the box full, type more | Nothing is added; still `500/500` | FR-006 |
| 8 | Select 10 characters in the full box and type one character | `491/500` | FR-005 |
| 9 | Fill the box to exactly 500 characters and click "Post Comment" | The comment appears in the list with all 500 characters; the box is empty; `0/500` | FR-008, FR-009 |
| 10 | Type three spaces and click "Post Comment" | `body can't be blank` above the form; the spaces are still in the box; `3/500` | FR-010 |
| 11 | Type anything, then reload the page | Empty box; `0/500` | FR-011 |
| 12 | Fill the box to 498 characters, then press Enter twice; clear it, fill it to 498 again and paste `😀` | `500/500` both times, and nothing more can be typed | FR-004, FR-006 (the counter and the limit use the same count) |
| 13 | Sign out (Settings, "Or click here to logout.") and open the article again | "Sign in or sign up to add comments on this article." and no counter | FR-002 |
| 14 | Sign in again and delete the test comment with its trash icon | The comment disappears | FR-012 |

To put 600 characters on the clipboard, run `copy('a'.repeat(600))` in the browser's developer console, or type them in any text editor and copy them. For checks 9 and 12, `copy('a'.repeat(500))` and `copy('a'.repeat(498))` work the same way.

## Build check

```bash
npm run build    # from the repository root: production builds of api/ and web/, as CI runs them
```

The build must finish without errors or new warnings. Optionally run `npm start` afterwards and repeat checks 1 and 2 against the production build at `http://localhost:4200`.

## Formatting check

From `web/`:

```bash
npx prettier --check src/app/features/article/pages/article/article.component.ts src/app/features/article/pages/article/article.component.html
```
