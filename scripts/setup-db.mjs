// Used by `npm run setup`: creates or updates the SQLite schema, then loads the seed data if the
// database did not exist yet. An existing database keeps its data.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { relative } from 'node:path';
import { databaseFile } from './db-file.mjs';

const dbPath = databaseFile();
const isNew = !existsSync(dbPath);

function runApiScript(name) {
  // Under npm, npm_execpath is npm's own CLI script; otherwise fall back to `npm` on the PATH.
  const result = process.env.npm_execpath
    ? spawnSync(process.execPath, [process.env.npm_execpath, 'run', name, '-w', 'api'], { stdio: 'inherit' })
    : spawnSync(`npm run ${name} -w api`, { stdio: 'inherit', shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runApiScript('db:push');
if (isNew) {
  runApiScript('db:seed');
} else {
  console.log(`${relative(process.cwd(), dbPath)} already existed, so its data was kept. Run \`npm run db:reset\` for a clean, seeded database.`);
}
