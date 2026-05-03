# src-v2 — Macify v2.0 source

Refactor target. Old code at `../src/` is kept for reference until Phase 03.

## Stack

- Vite + Svelte 5 (Runes mode) + JS
- `@crxjs/vite-plugin` for MV3 manifest + HMR

## Layout

```
src-v2/
├── manifest.config.js   # generates manifest.json at build
├── background.js        # service worker
├── popup/               # newtab page (chrome_url_overrides.newtab)
│   ├── index.html
│   ├── main.js
│   └── App.svelte
├── options/             # popup + options_page
│   ├── index.html
│   ├── main.js
│   └── App.svelte
├── lib/                 # plain-JS modules (storage, weather, video-source, ...)
├── components/          # Svelte components
└── res/                 # static assets bundled into the extension
```

## Scripts

- `npm run dev` — Vite dev server with HMR. Load the running `dist/` as an unpacked extension; the page in the popup will hot-update.
- `npm run build` — production build to `dist/`.
- `npm run zip` — runs after build, packages `dist/` into `releases/macify-vX.Y.Z.zip` for Chrome Web Store upload.

## Loading in Chrome

1. `npm run build`
2. Open `chrome://extensions`, enable Developer mode, click "Load unpacked"
3. Select the `dist/` directory
