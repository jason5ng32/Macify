import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json' with { type: 'json' };

const version = pkg.version.replace(/-dev$/, '');

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_ext_name__',
  version,
  description: '__MSG_ext_description__',
  default_locale: 'en',
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
  permissions: ['storage', 'topSites', 'favicon', 'idle'],
});
