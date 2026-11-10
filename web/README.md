![Angular Example App](logo.png)

# Conduit web (Angular 21)

The frontend of the Conduit benchmark app: an Angular single-page app on port 4200 that calls the API at `http://localhost:3000/api` (set in `src/app/core/interceptors/api.interceptor.ts`). Run it from the repository root, as described in the [root README](../README.md).

| Script (`npm run <name> -w web`) | What it does |
|---|---|
| `start` | `ng serve` on :4200, with reload |
| `build` | Production build into `dist/angular-conduit/browser` |
| `format`, `format:check` | Prettier |

Everything the UI loads is local, in `src/theme/`, each folder with its own licence:

- `conduit/`: the Conduit stylesheet and images from the RealWorld project (MIT).
- `ionicons/`: the Ionicons 2.0.1 icon font (MIT).
- `fonts/`: Titillium Web, Lora and Source Sans Pro from Google Fonts (SIL Open Font License 1.1).

Vendored from [realworld-apps/angular-realworld-example-app](https://github.com/realworld-apps/angular-realworld-example-app) at commit d426ec8. See [NOTICE](../NOTICE) and [LICENSE](LICENSE).
