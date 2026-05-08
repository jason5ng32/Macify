# Macify Product Site

This directory contains the standalone Macify product page for `macify.candobear.com`.

## Local development

```bash
npm run dev:site
```

## Build

```bash
npm run build:site
```

The site build is written to `site-dist/`, separate from the Chrome extension build in `dist/`.

## Cloudflare Pages

Use the project name `macify-candobear-com` and bind the custom domain `macify.candobear.com`.

For direct uploads after Wrangler authentication:

```bash
npm run deploy:site
```
