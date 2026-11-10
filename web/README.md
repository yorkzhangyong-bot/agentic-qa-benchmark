![Angular Example App](logo.png)

# Conduit web (Angular 21)

The frontend of the Conduit benchmark app: an Angular single-page app on port 4200 that calls the API at `http://localhost:3000/api` (set in `src/app/core/interceptors/api.interceptor.ts`). Run it from the repository root, as described in the [root README](../README.md).

| Script (`npm run <name> -w web`) | What it does |
|---|---|
| `start` | `ng serve` on :4200, with reload |
| `build` | Production build into `dist/angular-conduit/browser` |
| `format`, `format:check` | Prettier |
| `test` | Vitest unit tests. They currently fail to start: `src/test-setup.ts` imports `zone.js`, which upstream no longer installs. |

Global styles and images are in `src/theme/`, vendored from the RealWorld project (MIT, see `src/theme/LICENSE`). Icons and fonts load from CDNs in `src/index.html`.

Vendored from [realworld-apps/angular-realworld-example-app](https://github.com/realworld-apps/angular-realworld-example-app) at commit d426ec8. See [NOTICE](../NOTICE) and [LICENSE](LICENSE).
