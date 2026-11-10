// Location of the API's SQLite database: DATABASE_URL (file: URLs only, relative to api/) or api/dev.db.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = fileURLToPath(new URL('../api/', import.meta.url));

export function databaseFile() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  if (!url.startsWith('file:')) {
    console.error(`DATABASE_URL must be a file: URL for SQLite, got "${url}".`);
    process.exit(1);
  }
  return resolve(apiDir, url.slice('file:'.length));
}
