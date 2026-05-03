# src — Macify v2 source

## Stack

- Vite + Svelte 5 (Runes mode) + JS (no TypeScript)
- Tailwind 4 (`@tailwindcss/vite`)
- `@crxjs/vite-plugin` for MV3 manifest + HMR
- `unplugin-icons` + `@iconify/json` for any icon set on demand

## Layout

```
src/
├── manifest.config.js   # generates manifest.json at build
├── background.js        # MV3 service worker
├── popup/               # new tab page (chrome_url_overrides.newtab)
│   ├── index.html
│   ├── main.js
│   └── App.svelte
├── options/             # popup + options_page (same surface)
│   ├── index.html
│   ├── main.js
│   └── App.svelte
├── lib/                 # plain-JS modules (storage, weather, video-source, ...)
├── components/          # Svelte components
├── styles/              # Tailwind entry
├── data/                # bundled JSON (videos, quotes)
├── _locales/            # en + zh_CN
└── res/                 # icon (bundled into extension)
```

## Scripts (run from repo root)

- `npm run dev` — Vite dev server with HMR. Load `dist/` as unpacked extension.
- `npm run build` — production build to `dist/`.
- `npm run zip` — packages `dist/` into `releases/macify-vX.Y.Z.zip` for Chrome Web Store upload.
- `npm run build:quotes` — re-fetch + regenerate `data/quotes.json` from upstream.

## Loading in Chrome

1. `npm run build`
2. `chrome://extensions` → Developer mode on → Load unpacked
3. Select the `dist/` directory
