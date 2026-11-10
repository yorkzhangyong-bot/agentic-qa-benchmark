// Makes sure api/.env exists and defines JWT_SECRET (a random one is generated if missing).
// Used by `npm run setup`. Never prints the secret.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../api/.env', import.meta.url));
const secretLine = `JWT_SECRET=${randomBytes(32).toString('hex')}\n`;

if (!existsSync(envPath)) {
  writeFileSync(envPath, secretLine);
  console.log('Created api/.env with a random JWT_SECRET.');
} else {
  const current = readFileSync(envPath, 'utf8');
  if (/^\s*JWT_SECRET\s*=\s*\S/m.test(current)) {
    console.log('api/.env already defines JWT_SECRET.');
  } else {
    const separator = current === '' || current.endsWith('\n') ? '' : '\n';
    writeFileSync(envPath, current + separator + secretLine);
    console.log('Added a random JWT_SECRET to api/.env.');
  }
}
