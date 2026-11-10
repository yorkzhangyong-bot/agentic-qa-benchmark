// Deletes the API's SQLite database file (and any journal files) so `npm run db:reset` starts clean.
import { existsSync, rmSync } from 'node:fs';
import { relative } from 'node:path';
import { databaseFile } from './db-file.mjs';

const dbPath = databaseFile();

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
console.log(`Removed ${relative(process.cwd(), dbPath)} (if it existed).`);
