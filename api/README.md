![RealWorld Example App](logo.png)

# Conduit API (Nitro + Prisma + SQLite)

The backend of the Conduit benchmark app: the RealWorld REST API under `/api`, on port 3000. Run it from the repository root, as described in the [root README](../README.md). The root scripts call these workspace scripts:

| Script (`npm run <name> -w api`) | What it does |
|---|---|
| `dev` | `nitro dev`, with reload |
| `build` | Production build into `.output/` |
| `start` | Runs the production build with `node`, reading `.env` |
| `db:generate` | Generates the Prisma client into `generated/prisma` |
| `db:push` | Creates or updates the SQLite schema |
| `db:seed` | Loads the seed data into an empty database (`prisma/seed.ts`) |

- Routes live in `server/routes/api/` (file-based routing). The schema is `prisma/schema.prisma` and the database is `dev.db` (git-ignored).
- `.env` (git-ignored) must define `JWT_SECRET`. Optional: `DATABASE_URL`, `BCRYPT_SALT_ROUNDS`, `PORT`.

Vendored from [realworld-apps/nitro-prisma-zod-realworld-example-app](https://github.com/realworld-apps/nitro-prisma-zod-realworld-example-app) at commit 428056b. See [NOTICE](../NOTICE) and [LICENSE](LICENSE).
