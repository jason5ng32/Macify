import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import manifest from './src-v2/manifest.config.js';

export default defineConfig({
  root: 'src-v2',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [tailwindcss(), svelte(), crx({ manifest })],
});
