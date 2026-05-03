import { createWriteStream } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');
const releasesDir = resolve(root, 'releases');

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version.replace(/-dev$/, '');

await mkdir(releasesDir, { recursive: true });
const out = resolve(releasesDir, `macify-v${version}.zip`);

execSync(`cd "${dist}" && zip -r "${out}" .`, { stdio: 'inherit' });
console.log(`\nWrote ${out}`);
