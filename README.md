# Macify — macOS Aerial Screensavers in Safari or Chrome's New Tab

![GitHub Repo stars](https://img.shields.io/github/stars/jason5ng32/macOS-Screen-Saver-as-Chrome-New-Tab)
![GitHub](https://img.shields.io/github/license/jason5ng32/macOS-Screen-Saver-as-Chrome-New-Tab)
![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/lgdipcalomggcjkohjhkhkbcpgladnoe)
![GitHub contributors](https://img.shields.io/github/contributors/jason5ng32/macOS-Screen-Saver-as-Chrome-New-Tab)

Replace Safari or Chrome's new tab page with macOS's aerial screensaver videos and a small set of calm, optional widgets. macOS is **not** required — videos are streamed from Apple's CDN.

![screenshot](docs/screenshot.png)

## Features

- 🎥 **156 aerial videos** in 4K SDR, sourced from Apple's current macOS catalog (Landscapes, Cities, Underwater, Space, and more).
- 🌤️ **Live weather** — current temperature, "feels like", 3-day forecast, sunrise/sunset, UV, wind, air quality. Powered by [Open-Meteo](https://open-meteo.com/), no API key required.
- 📌 **Top sites** widget pulled from the browser's built-in list when available (no history permission needed).
- 💬 **Random quotes** from a curated 500-entry public-domain set.
- 🧘 **Zen mode** — fullscreen the video with optional ambient music.
- 🔤 **4 languages** — English, 简体中文, 繁體中文, 日本語.

## Install

[Install from Chrome Web Store](https://chromewebstore.google.com/detail/macify-macos-screensaver/lgdipcalomggcjkohjhkhkbcpgladnoe).

Building from source or contributing? See [DEVELOPMENT.md](DEVELOPMENT.md).
For an experimental local Safari build, see [SAFARI.md](SAFARI.md).

## Choosing a video source

Two options. Each has a built-in step-by-step guide inside Macify's settings page; this section just summarises.

### 1. Apple Server (default — zero setup)

Streams directly from `sylvan.apple.com`. If direct video playback fails, two fallback paths are available:

**Option A — Reverse proxy.** Video requests are routed through your own Cloudflare Worker. Convenient, but it requires a CDN host you control.

**Option B — Trust Apple's cert manually.** Visit [https://sylvan.apple.com](https://sylvan.apple.com) once in the target browser. If you see a security warning, use the browser's advanced option to proceed. The browser should remember that trust.

![Chrome warning when trusting sylvan.apple.com](docs/chromewarnning.jpg)

### 2. Local server (recommended for macOS users)

Best performance, zero third-party dependency. **One command** configures macOS's built-in Apache to serve your local Aerial videos at `http://localhost:18000/videos/`:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/jason5ng32/Macify/main/scripts/local-server/setup.sh)
```

Asks for your password once (sudo). Then in Macify's settings, switch the source to **Local server**.

To uninstall:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/jason5ng32/Macify/main/scripts/local-server/uninstall.sh)
```

The local server needs the videos on disk first. Two ways:

**Through System Settings.** Open System Settings → Screen Saver → Aerial. Click each video you want (each is 500MB–1GB). Tedious for the full 156-video catalog but no extras needed.

![macOS screen saver settings](docs/systempreferrence.jpg)

**One-line batch downloader.** Macify includes a Python downloader that pulls the full Aerial catalog (or a subset) directly from Apple's CDN, with progress bars, resume support, and category/random/limit filters:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/jason5ng32/Macify/main/scripts/aerial_downloader/install.sh)
```

Copy the command, paste it in Terminal, and follow the on-screen prompts. The full catalog is ~80–150 GB; the script reports the estimated size and your free disk space before asking for confirmation, so you can safely back out.

## Permissions

Macify requests these permissions, all non-sensitive:

| Permission | Used for |
|---|---|
| `storage` | Persist user preferences and cache weather data. |
| `topSites` | Read Chrome's most-visited list for the Top Sites widget. |
| `favicon` | Show favicons next to Top Sites entries (uses Chrome's built-in cache; no external network). |
| `idle` | Track when the user is away from the computer to determine showing Zen mode notification or not. |

No `history` permission. No host permissions for arbitrary sites.

## License

MIT. See [LICENSE](LICENSE).

## Credits

Created by Jason Ng, Dofy, Setilis. Aerial videos are © Apple Inc.
