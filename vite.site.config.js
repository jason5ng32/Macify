import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'site',
  publicDir: false,
  build: {
    outDir: '../site-dist',
    emptyOutDir: true,
  },
  plugins: [tailwindcss(), svelte()],
});
