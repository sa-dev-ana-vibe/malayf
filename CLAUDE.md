# CLAUDE.md — MALAYF

Guidance for any agent working in this repo. Read this first.

## What this is

**MALAYF** is a mobile-first, local-first **apartment-hunting checklist PWA**. You
score apartments against a weighted, customizable checklist, compare them side by
side, and track listing links / contacts / photos / red-flags per visit. It was
designed as an HTML/CSS/JS prototype (Claude Design handoff) and reimplemented here.

The design source of truth (recreate its visual output pixel-for-pixel) is:
`extracted/apartment-checklist-app-final-solo-ver/project/AptCheck.dc.html`
(gitignored; available locally from the handoff zip).

## Stack

- **React 18 + TypeScript** (strict), **Vite 6**
- **Tailwind CSS v4** (config-in-CSS via `@theme` in `src/index.css`)
- **Local-first persistence**: structured data in `localStorage`; **photos as
  Blobs in IndexedDB** (`src/lib/photoStore.ts`) — localStorage's ~5 MB cap can't
  hold photos. Durability requested via `navigator.storage.persist()`.
- **Installable PWA** (`vite-plugin-pwa`, autoUpdate)
- **Deploy**: GitHub Pages (base path is env-driven; see `vite.config.ts`)

## Commands

| command | what |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | typecheck + production build |
| `npm run lint` | ESLint (type-checked rules) |
| `npm run verify` | **the machine gate**: `tsc` + `eslint` + `vite build` |

## Architecture

- `src/types.ts` — domain model.
- `src/lib/` — pure logic: `scoring.ts` (item/category/weighted scores, weight
  balancing), `format.ts` (parsing/formatting), `defaults.ts`, `photoStore.ts`
  (IndexedDB), `storage.ts` (localStorage + export/import + photo migration).
- `src/store.ts` — single external store (`useSyncExternalStore`) with all
  `actions`. Mirrors the prototype's single-component state. Data mutations
  persist; UI/navigation state does not.
- `src/ui/` — `styles.ts` (runtime-computed inline-style helpers), `usePhotoUrl.ts`.
- `src/components/` — `App.tsx` (phone frame, header, routing), `BottomNav.tsx`,
  and `screens/` (one component per screen).

### Conventions
- `jsx: react-jsx` → never `import React`.
- **Tailwind for static styling** (arbitrary values like `text-[13.5px]` are fine
  and expected for pixel fidelity); **inline `style={}` only for runtime-computed
  values**, via the helpers in `src/ui/styles.ts`.
- Bilingual RU/EN labels are intentional — keep them exactly as the prototype.

## Quality protocol — REVIEW THEN COMMIT (required)

`FRONTEND_QUALITY.md` is the **judgment-layer rulebook** (the gates a compiler and
linter can't check). Quality has **three gates**, mirroring the protocol in the
sibling `todo-platform` project:

- **Gate 1 — Machine** → `npm run verify` (tsc + eslint + build). Must pass.
- **Gate 2 — Judgment review** → a **reviewer subagent (Reviewer A)** against
  `FRONTEND_QUALITY.md`. Role prompt: `reviews/_role-react.md`.
- **Gate 3 — QA / manual test** → a **QA subagent (Reviewer B)** that **runs the app
  like a user** (Playwright MCP against `npm run dev`) and confirms every control is
  wired, zero console errors, empty/error states, mobile 430px, keyboard focus. Role
  prompt: `reviews/_role-qa.md`. This is the gate that catches "looks done but the
  button does nothing."

**After each todo-list item (each meaningful chunk of work), BEFORE committing:**

1. **Gate 1**: `npm run verify` is green.
2. **Gate 2**: spawn a reviewer subagent with `reviews/_role-qa.md`'s sibling
   `reviews/_role-react.md`, scoped to *this chunk's* diff. It writes its verdict to
   `reviews/<chunk>-react.md`.
3. **Gate 3**: spawn a **QA subagent** with `reviews/_role-qa.md`, scoped to this
   chunk's user-visible flows. It RUNS the app (Playwright MCP) and writes its verdict
   to `reviews/<chunk>-qa.md`. **Skip only when the chunk produces nothing runnable
   yet** (e.g. pure foundation before an entry point exists) — note that in the commit.
4. **Address all blocking findings** (and worthwhile non-blocking ones) from both
   reviewers. Re-run Gate 1.
5. **Commit that chunk** with a focused message. **One todo item ≈ one commit.**

Do not batch many todo items into one unreviewed commit. Do not commit red gates. A
dead control or a console error found by Gate 3 is a blocking auto-reject.

## Commit style
- Imperative, scoped subject (e.g. `feat(detail): apartment detail screen`).
- Body: what + why when non-obvious.
- Co-author trailer as configured for this environment.
