# Safari self-use build

This fork defaults to direct Apple streaming for Safari:

- video source: Apple Server
- reverse proxy: off
- local video server: not required
- zen music: off unless `VITE_MACIFY_BASE` is configured

The video playlist still points at Apple's `https://sylvan.apple.com` aerial
assets. Nothing needs to be downloaded locally.

## Build

```bash
npm install
npm run build:safari
```

The extension bundle is written to `dist/`.

## Package for Safari

Install full Xcode first. Apple's Safari converter is not included with the
Command Line Tools-only install.

```bash
npm run package:safari
```

Open the generated Xcode project, sign it for local development, run the app,
then enable the extension in Safari settings.

## Optional proxy

If direct Apple playback fails in Safari, set up your own Cloudflare Worker
using `cloudflare-worker/worker.js`, set `VITE_MACIFY_BASE`, rebuild, and turn
on "Use reverse proxy" in the extension settings.
