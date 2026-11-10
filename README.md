# agentic-qa-benchmark

A fixed, self-contained web application used as the **system under test** for evaluating an agentic QA platform. The app is [Conduit](https://docs.realworld.show), the RealWorld "Medium clone": sign-up and sign-in, articles, comments, tags, favourites, follows and paginated feeds, with a real browser UI on top of a REST API.

> [!IMPORTANT]
> This app is a test target only. It is not meant for production and should not be exposed to the internet.
> `npm audit` reports known vulnerabilities in the pinned upstream dependencies (including Angular 21.2.12). They are known and deliberately left as they are, so that the app under test doesn't change.

| Folder | What it is |
|---|---|
| `api/` | Backend: Nitro + Prisma 7 + Zod with a SQLite database. REST API on http://localhost:3000/api |
| `web/` | Frontend: Angular 21 single-page app on http://localhost:4200 |
| `scripts/` | Small cross-platform helpers used by the npm scripts |

Both apps are vendored from the official RealWorld implementations. [NOTICE](NOTICE) lists the sources, commits, licences and every change made here.

## Requirements

- Node.js 22.12 or newer (tested with Node 24) and npm.
- No Docker, no Bun and no database server: the database is a SQLite file.
- Works on Windows and Linux. CI runs on Ubuntu.
- No internet access is needed once dependencies are installed: icons and fonts are part of the repository.

## Quick start

```bash
npm run setup   # install, create api/.env, generate the Prisma client, create and seed the SQLite database
npm run dev     # API on :3000 and web app on :4200, with reload
```

Then open http://localhost:4200 and sign in with one of the [test accounts](#test-accounts). Run `npm run db:reset` whenever you want the database back in its seeded state.

## Scripts

| Command | What it does |
|---|---|
| `npm run setup` | Installs both workspaces, creates `api/.env` with a random `JWT_SECRET` if it is missing, generates the Prisma client and creates or updates the schema in `api/dev.db`. If the database didn't exist yet, it also loads the seed data; an existing database keeps its data. |
| `npm run dev` | Starts the API (`nitro dev`) and the web app (`ng serve`) together. Ctrl+C stops both. |
| `npm run build` | Production builds into `api/.output/` and `web/dist/`. |
| `npm start` | Serves the production builds: the API on :3000 and the web app on :4200 (static files with single-page-app fallback). Run `npm run build` first. |
| `npm run db:reset` | Deletes `api/dev.db`, recreates the schema and loads the seed data. Stop the API first: on Windows the database file is locked while the API runs. |

## Test accounts

Every seeded user has the password **`Password123!`**.

| Username | Email | Profile | Articles | Follows | Good for |
|---|---|---|---|---|---|
| alice | alice@example.com | bio and avatar | 12 (2 pages on her profile) | bob, carol | Her feed has exactly 10 articles: one full page |
| bob | bob@example.com | bio and avatar | 6 | alice | Feed of 12 articles (2 pages) |
| carol | carol@example.com | bio, no avatar | 4 | alice, bob | Feed of 18 articles (2 pages) |
| dave | dave@example.com | no bio, no avatar | 2 | alice, bob, carol | Feed of 22 articles (3 pages) |
| erin | erin@example.com | bio, no avatar | 0 | nobody | Empty feed; 11 favourites (2 pages on her Favorited Articles tab) |

The seed data is identical every time it is loaded:

- 24 articles, published one a day from 5 to 28 January 2026, so the global feed has 3 pages (10, 10 and 4 articles).
- 11 tags. Popular Tags shows the top 10, so `security`, used once, never appears there.
- 14 comments on 7 articles. "Exploratory testing sessions that actually find bugs" has 5; most articles have none.
- 39 favourites. The most favourited article is "Flaky tests: a field guide", with 4.
- Also two articles without tags, a markdown showcase article and one very long title.

The seed script is `api/prisma/seed.ts`.

## Configuration

- `api/.env` (git-ignored, created by `npm run setup`) must define `JWT_SECRET`. Optional: `DATABASE_URL` (default `file:./dev.db`, which is `api/dev.db`), `BCRYPT_SALT_ROUNDS` (default 10) and `PORT` (default 3000).
- The web app calls the API at `http://localhost:3000/api`, set in `web/src/app/core/interceptors/api.interceptor.ts`.
- The API serves the seeded avatar images (`http://localhost:3000/images/...`). The Conduit theme, the Ionicons icon font and the Google fonts are served by the web app from `web/src/theme/`, so the UI looks the same offline.

## CI

`.github/workflows/ci.yml` runs on Ubuntu for pushes to `main` and for pull requests. It installs dependencies, runs `npm run setup` and `npm run build`, starts the app with `npm start`, and checks that `/api/tags` answers and the web app is served. There are no tests yet.

## The official RealWorld e2e suite is deliberately not in this repository

The RealWorld project publishes a Playwright end-to-end suite for Conduit. It is kept out of this repository on purpose: this app is the target that the QA platform's agents explore and write tests for, so a ready-made reference suite must not be available to copy. For the same reason, the app's `window.__conduit_debug__` test hook and the upstream unit tests were removed.

Please don't add the suite, its selector list or its helpers to this repository.

## Licence

See [LICENSE](LICENSE) and [NOTICE](NOTICE). Vendored code and assets keep their own licence files: `api/LICENSE`, `web/LICENSE`, `web/src/theme/conduit/LICENSE`, `web/src/theme/ionicons/LICENSE` and an `OFL.txt` in each font folder under `web/src/theme/fonts/`.
