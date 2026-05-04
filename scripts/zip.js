import { readFile, mkdir, rm } from 'node:fs/promises';
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

// `zip -r` APPENDS to an existing archive — files removed from dist
// (e.g. a dropped locale) would otherwise survive in the zip from a
// previous run. Delete first so we always produce a clean archive.
await rm(out, { force: true });

execSync(`cd "${dist}" && zip -r "${out}" .`, { stdio: 'inherit' });
console.log(`\nWrote ${out}`);
