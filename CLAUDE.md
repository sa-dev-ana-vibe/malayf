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
linter can't check). The split is deliberate:

- **Machine gates** → `npm run verify` (tsc + eslint + build). Must pass.
- **Judgment gates** → a **reviewer subagent**, run against `FRONTEND_QUALITY.md`.

**After each todo-list item (each meaningful chunk of work), BEFORE committing:**

1. **Run the machine gate**: `npm run verify` must be green (typecheck + lint;
   `build` once the app has an entry point).
2. **Spawn a reviewer subagent** (Agent tool) whose job is to audit *only the diff
   for this chunk* against `FRONTEND_QUALITY.md` §1–§11 — type design, parse-don't-
   validate at boundaries (localStorage + imported JSON are untrusted), effects
   that shouldn't exist, derive-don't-store, component responsibility, a11y beyond
   the linter, error/empty/loading states, naming/intent. The reviewer reports
   findings as **blocking** vs **non-blocking**, each tied to a file:line and a §.
3. **Address blocking findings** (and worthwhile non-blocking ones). Re-run the
   machine gate.
4. **Commit that chunk** with a focused message. **One todo item ≈ one commit.**

Reviewer prompt skeleton:
> Review ONLY these changed files against FRONTEND_QUALITY.md. For each gate §1–§11
> that applies, cite file:line and classify blocking/non-blocking. Be concrete; do
> not restate the rulebook. Flag any `as`-cast of untrusted data, any effect used
> to transform data or handle an event, any stored-but-derivable state, any missing
> empty/error state, any interactive element that isn't keyboard-operable.

Do not batch many todo items into one unreviewed commit. Do not commit red gates.

## Commit style
- Imperative, scoped subject (e.g. `feat(detail): apartment detail screen`).
- Body: what + why when non-obvious.
- Co-author trailer as configured for this environment.
