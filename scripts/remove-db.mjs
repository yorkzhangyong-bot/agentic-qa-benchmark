// Deletes the API's SQLite database file (and any journal files) so `npm run db:reset` starts clean.
// Uses DATABASE_URL if set (file: URLs only, relative to api/), otherwise api/dev.db.
import { existsSync, rmSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = fileURLToPath(new URL('../api/', import.meta.url));
const url = process.env.DATABASE_URL ?? 'file:./dev.db';

if (!url.startsWith('file:')) {
  console.error(`DATABASE_URL must be a file: URL for SQLite, got "${url}".`);
  process.exit(1);
}

const dbPath = resolve(apiDir, url.slice('file:'.length));
const display = relative(process.cwd(), dbPath) || dbPath;

for (const file of [dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`]) {
  if (!existsSync(file)) continue;
  try {
    rmSync(file);
  } catch (error) {
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      console.error(`Cannot delete ${relative(process.cwd(), file)}: it is in use. Stop the API (npm run dev / npm start) and run this again.`);
      process.exit(1);
    }
    throw error;
  }
}
console.log(`Removed ${display} (if it existed).`);
