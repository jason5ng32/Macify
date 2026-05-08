import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import manifest from './src/manifest.config.js';

const REQUIRED_ENV = ['VITE_MACIFY_BASE'];

export default defineConfig(({ mode }) => {
  const target = mode === 'safari' ? 'safari' : 'chrome';
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  if (target === 'chrome') {
    const missing = REQUIRED_ENV.filter((k) => !env[k] || !env[k].trim());
    if (missing.length > 0) {
      throw new Error(
        `\n\nMissing required env var(s): ${missing.join(', ')}\n` +
          `Set them in .env (or .env.local). See .env.example for what each one is for.\n`,
      );
    }
  }

  return {
    root: 'src',
    envDir: '..',
    publicDir: false,
    define: {
      'import.meta.env.VITE_BUILD_TARGET': JSON.stringify(target),
    },
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
  };
});
