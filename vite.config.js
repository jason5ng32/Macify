import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import manifest from './src/manifest.config.js';

export default defineConfig({
  root: 'src',
  // .env files live at the project root (next to package.json), not under
  // src/. Without this, Vite would silently look in src/.env and ignore
  // the actual file — vars come back undefined and import.meta.env reads
  // fall to their fallbacks.
  envDir: '..',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    tailwindcss(),
    svelte(),
    crx({ manifest }),
    Icons({ compiler: 'svelte' }),
  ],
});
