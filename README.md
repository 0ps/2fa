# Local TOTP

A local-first static website that computes RFC 6238 time-based one-time passwords in the browser. HMAC runs through Web Crypto. There is no account API and no advertising.

## Privacy model

- Setup keys, otpauth URIs, generated codes, and card names stay in memory for the life of the tab.
- The only `localStorage` key this app writes is `totpPreferredLanguage`.
- Prefer sharing keys in a URL fragment: `#secret=YOURBASE32`. Fragments are not sent to HTTP servers. Query names `secret`, `code`, `key`, `otp`, `totp` and a non-reserved path `/{BASE32}` are also accepted, then rewritten to a fragment.
- QR images are decoded locally with `BarcodeDetector` when the browser provides it.

## Develop

```bash
npm i && npm run dev
```

Then open the printed local URL.

## Test and build

```bash
npm test
npm run build
npm run preview
```

`npm test` runs Vitest. RFC 6238 Appendix B 8-digit vectors are asserted with injected unix times (not `Date.now`). Vector file: `public/rfc6238-test-vectors.json`.

## GitHub Pages

On push to `main`, `.github/workflows/pages.yml` installs, tests, builds, and deploys the `dist` folder. Set `BASE_PATH` if the site lives under a project subpath. Copying `index.html` to `404.html` during the Vite build gives the SPA fallback.

## Features

- Vanilla TypeScript + Vite 7, history router, SPA fallback
- Generator widget on home and every tool page (multiple independent cards)
- SHA-1 / SHA-256 / SHA-512, 6 or 8 digits, period 10-120s
- otpauth://totp/ parse, Base32 decode, QR image scan, paste/clear/copy
- i18n with Auto + 21 languages (Arabic RTL)
- Unique titles and FAQs per route; JSON-LD FAQPage on tool pages
- Support-matrix table, HTML site map, robots.txt, llms.txt, sitemaps, web manifest
