import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json' with { type: 'json' };

const version = pkg.version.replace(/-dev$/, '');

export default defineManifest({
  manifest_version: 3,
  name: 'Macify',
  version,
  description: "Transform Chrome's new tab into a macOS aerial screensaver.",
  icons: {
    128: 'res/icon.png',
  },
  action: {
    default_popup: 'options/index.html',
  },
  options_page: 'options/index.html',
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  chrome_url_overrides: {
    newtab: 'popup/index.html',
  },
  permissions: ['storage'],
});
