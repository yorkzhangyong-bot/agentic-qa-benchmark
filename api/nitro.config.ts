//https://nitro.unjs.io/config

// Windows: load libsql's native addon in the main process as well. `nitro dev` runs the app in a worker
// thread that is recreated on every server-file change; if only workers load the addon, requests hang
// after a few reloads (tursodatabase/libsql-js#249). Importing the Prisma adapter loads it here.
import '@prisma/adapter-libsql';

export default defineNitroConfig({
  preset: "node-server",
  srcDir: "server",
  errorHandler: "~/error-handler",
  routeRules: {
    // Wide-open CORS is fine for now: auth uses JWT in Authorization header, no cookies, CSRF risk low-enough for now
    '/api/**': { cors: true, headers: { 'access-control-allow-methods': '*' } },
  }
});
