# MALAYF — Apartment Checklist

A mobile-first, **local-first PWA** for hunting apartments: score each one against a
weighted, customizable checklist, compare candidates side by side, and track listing
links, contacts, photos, visit dates and red flags per apartment. Bilingual RU/EN UI.

Recreated from a Claude Design HTML/CSS/JS prototype as **React + TypeScript + Vite +
Tailwind v4**. No backend — everything lives on your device.

## Features

- **Checklist scoring** — weighted categories (sum to 100%), items of three kinds:
  Pass/Fail, ★ stars, or a valued select list. Per-category and weighted overall
  scores, color-coded; N/A answers excluded.
- **Apartments list** — sort by rating / price / ₽-per-m² / area / last visit; filter
  by tag; price, score, pass-fail bar and red-flag badge at a glance.
- **Detail** — price (auto-grouped) → ₽/m², address → 2ГИС, listing links, building
  params, "до жить / до хорошо" investment math, tags, red flags, contacts
  (tap-to-call/email), visit dates, **photos** (camera/upload, paste, mark a floor
  plan), notes.
- **Compare** — side-by-side table across categories + price/area/ppm + overall.
- **Export / Import** — back up or move everything as a single JSON file.

## Storage (local-first)

Structured data is kept in **localStorage**; **photos are stored as Blobs in
IndexedDB** (localStorage's ~5 MB cap can't hold photos — IndexedDB's quota is a share
of disk). On launch the app requests **persistent storage**
(`navigator.storage.persist()`) so the browser won't evict your data; installing the
PWA to your home screen makes this durable on mobile.

## Develop

```bash
npm install
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build (PWA/service worker active here)
npm run verify     # the machine gate: tsc + eslint + build
npm run lint
```

## Quality gates

See `CLAUDE.md`. Every chunk of work passes three gates before commit: the **machine
gate** (`npm run verify`), a **judgment review** against `FRONTEND_QUALITY.md`
(`reviews/_role-react.md`), and a **QA review that runs the app** like a user
(`reviews/_role-qa.md`). Verdicts are kept under `reviews/`.

## Deploy to GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) builds and publishes on every
push to `main`. One-time setup:

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: _GitHub Actions_.**
3. Push to `main` (or run the workflow manually). It builds with
   `VITE_BASE=/<repo-name>/` so assets resolve under
   `https://<owner>.github.io/<repo-name>/`, adds a SPA `404.html`, and deploys.

For a **custom domain** or a user/org site served at the root, no base is needed — the
build defaults to `/` (set `VITE_BASE` only for a project subpath).
