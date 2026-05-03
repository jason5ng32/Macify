# Macify — macOS Aerial Screensavers in Chrome's New Tab

![GitHub Repo stars](https://img.shields.io/github/stars/jason5ng32/macOS-Screen-Saver-as-Chrome-New-Tab)
![GitHub](https://img.shields.io/github/license/jason5ng32/macOS-Screen-Saver-as-Chrome-New-Tab)
![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/lgdipcalomggcjkohjhkhkbcpgladnoe)
![GitHub contributors](https://img.shields.io/github/contributors/jason5ng32/macOS-Screen-Saver-as-Chrome-New-Tab)

Replace Chrome's new tab page with macOS's aerial screensaver videos and a small set of calm, optional widgets. macOS is **not** required — videos are streamed from Apple's CDN and play in any platform that runs Chrome.

![screenshot](docs/screenshot.png)

## Features

- 🎥 **156 aerial videos** in 4K SDR, sourced from Apple's current macOS catalog (Landscapes, Cities, Underwater, Space, and more).
- 🌤️ **Live weather** — current temperature, "feels like", 3-day forecast, sunrise/sunset, UV, wind, air quality. Powered by [Open-Meteo](https://open-meteo.com/), no API key required.
- 📌 **Top sites** widget pulled from Chrome's built-in list (no history permission needed).
- 💬 **Random quotes** from a curated 500-entry public-domain set.
- 🧘 **Zen mode** — fullscreen the video with optional ambient music.
- 🔤 **5 languages** — English, 简体中文, 繁體中文, 日本語, Español.

## Install

[Install from Chrome Web Store](https://chromewebstore.google.com/detail/macify-macos-screensaver/lgdipcalomggcjkohjhkhkbcpgladnoe).

Or load unpacked: see [Building from source](#building-from-source).

## Choosing a video source

Three options. Each section in the extension's settings page also includes a built-in step-by-step setup guide — this README only summarises.

### 1. Apple Server (default)

Streams directly from `sylvan.apple.com`. Chrome may not trust Apple's certificate by default; two ways to fix it:

**Option A — Reverse proxy (default on, easiest).** Video requests are routed through a hosted Cloudflare Worker that handles the certificate dance. Zero local setup. Convenient but should not be relied on long-term — set up local hosting or trust the cert when possible.

**Option B — Trust Apple's cert manually (cleanest).** Visit [https://sylvan.apple.com](https://sylvan.apple.com) once in Chrome. You'll see a security warning — click "Advanced", then "Proceed to sylvan.apple.com (unsafe)". Chrome remembers the trust and direct connection works thereafter.

![Chrome warning when trusting sylvan.apple.com](docs/chromewarnning.jpg)

### 2. Local Apache server (recommended for macOS users)

For best performance and zero third-party dependency, host the videos yourself on macOS's own Apache.

#### Step 1 — Download the videos

Open System Settings → Screen Saver → Aerial. Click each video you want to download (each is 500MB–1GB). Downloads can be slow and may need retries.

![macOS screen saver settings](docs/systempreferrence.jpg)

#### Step 2 — Configure Apache

Save the following as `videoserver.conf`, replacing `YOUR_MAC_USER_NAME` with your actual macOS username:

```apache
LoadModule headers_module libexec/apache2/mod_headers.so

User YOUR_MAC_USER_NAME
Group staff

Listen 18000

<VirtualHost *:18000>
    Header always set Access-Control-Allow-Origin "*"
    Alias /videos "/Users/YOUR_MAC_USER_NAME/Library/Application Support/com.apple.wallpaper/aerials/videos"

    <Directory "/Users/YOUR_MAC_USER_NAME/Library/Application Support/com.apple.wallpaper/aerials/videos">
        Options +Indexes
        Require all granted
    </Directory>
</VirtualHost>
```

Symlink it into Apache's drop-in folder and restart:

```bash
sudo ln -s /path/to/videoserver.conf /private/etc/apache2/other
sudo apachectl restart
```

#### Step 3 — Point Macify at it

In Macify settings, switch the source to **Local server** and confirm the URL is `http://localhost:18000/videos/`.

## Permissions

Macify requests three permissions, all non-sensitive:

| Permission | Used for |
|---|---|
| `storage` | Persist user preferences and cache weather data. |
| `topSites` | Read Chrome's most-visited list for the Top Sites widget. |
| `favicon` | Show favicons next to Top Sites entries (uses Chrome's built-in cache; no external network). |

No `history` permission. No host permissions for arbitrary sites.

## Building from source

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/jason5ng32/macOS-Screen-Saver-as-Chrome-New-Tab.git
cd macOS-Screen-Saver-as-Chrome-New-Tab
npm install
npm run build
```

The built extension is in `dist/`. Load it via Chrome → `chrome://extensions` → Developer mode → "Load unpacked".

Available scripts:

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — production build.
- `npm run zip` — package `dist/` into a Chrome Web Store-ready zip.
- `npm run build:videos` — regenerate `src/data/videos.json` from the current macOS aerial manifest.
- `npm run build:quotes` — regenerate `src/data/quotes.json` from the upstream quotes dataset.

The stack is Vite + Svelte 5 + Tailwind 4 + `@crxjs/vite-plugin` for MV3 + `unplugin-icons` + `@iconify/json`. JS only (no TypeScript).

## Translations

Japanese and Spanish translations were AI-assisted as a first pass. Native-speaker review is welcome — open a PR against `src/_locales/<lang>/messages.json`.

To add a new language: create `src/_locales/<langCode>/messages.json` mirroring the keys in `src/_locales/en/messages.json`. The language dropdown in settings auto-populates from the `_locales` directory.

## Contributing

PRs welcome — bug fixes, translations, new aerial-source adapters, performance improvements, accessibility fixes.

## License

MIT. See [LICENSE](LICENSE).

## Credits

Created by Jason Ng, Dofy, Setilis. Aerial videos are © Apple Inc.
