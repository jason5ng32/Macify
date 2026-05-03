import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import manifest from './src/manifest.config.js';

export default defineConfig({
  root: 'src',
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
