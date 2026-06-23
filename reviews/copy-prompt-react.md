# Review — "Copy prompt for LLM" (MALAYF additive-import prompt)

**Date:** 2026-06-23
**Scope:** `src/lib/schema.ts` (`listingSchema`, `HOUSE_TYPES`), `src/lib/prompt.ts`
(`buildAppendPrompt`, `EXAMPLE`), `src/lib/storage.ts` (`injectIds`,
`parseAppendVisits`), `src/components/screens/ChecklistScreen.tsx` (copy button),
tests `src/lib/prompt.test.ts` + `e2e/flows.spec.ts`.

## Gate results — GREEN

- `npm run verify` → tsc + eslint clean, **118 vitest** pass, production build + PWA OK.
- `npm run e2e` → **9 Playwright** pass, including
  `copy-prompt button puts a schema prompt on the clipboard`
  (`e2e/flows.spec.ts:66`).

## Verdict

**Ship.** No BLOCKING findings. The feature is sound: the schema is genuinely
single-sourced from Zod, the prompt is clear and free of true contradictions,
`injectIds` is correctly scoped to the append path, and the clipboard handler
handles the failure path. A handful of NON-BLOCKING edges below.

---

## 1. Prompt effectiveness & prose↔schema consistency — PASS

The generated prompt (verified by dumping `buildAppendPrompt()`) is effective and
unambiguous:

- Root shape stated three ways: prose (`prompt.ts:46`), the generated JSON Schema
  (`required: ["visits"]`), and the `EXAMPLE`.
- "Return ONLY valid JSON, no markdown wrappers" — the single most important
  instruction — is up front (`prompt.ts:43-44`).
- House-type enum appears both as a JSON-Schema `enum` and spelled out in prose
  (`prompt.ts:56`), generated from `HOUSE_TYPES` so the two can't drift.
- Where-to-import is explicit and matches the actual button label «➕ Добавить
  квартиры из JSON» (`prompt.ts:65-66` ↔ `ChecklistScreen.tsx:212`).

**No true prose↔schema contradiction.** I specifically probed the one apparent
tension: the generated schema marks `links[].url` and `contacts[].value` as
`"required"` (and every object `additionalProperties: false`), while the prose
says "Обязательно только name" / "Пропускай поля, которых нет". These do **not**
contradict — the prose "only name required" is about the *visit* object, whereas
the schema's `required: ["url"]`/`["value"]` apply *inside* a link/contact (if you
include a link at all, give it a url). That is consistent and sensible.

NON-BLOCKING observations:

- **`prompt.ts:53`** Rule says "Не добавляй поля photos/results/tagIds/redFlags",
  but the JSON Schema sets `additionalProperties: false`, so those fields are
  already *forbidden* by the schema — the prose rule is belt-and-suspenders
  (harmless, arguably helpful for weaker models).
- Minor asymmetry: the generated JSON Schema says `additionalProperties: false`,
  but the runtime Zod `listingSchema` is non-strict — I confirmed
  `rootSchema.safeParse({visits:[{...EXAMPLE, id, photos:[]}]})` succeeds. So the
  prompt instructs the LLM *more* strictly than the importer enforces. That is the
  safe direction (extra fields are silently dropped, never crash) and reinforces
  "don't emit id". No action needed.

## 2. Single source of truth (§1) — PASS

- The JSON Schema is generated at call time via
  `zodToJsonSchema(rootSchema, …)` (`prompt.ts:36-39`), where
  `rootSchema = z.object({ visits: z.array(listingSchema) })` (`prompt.ts:12-14`).
  It cannot drift from `listingSchema`. `zod-to-json-schema@^3.25.2` is a real
  dependency (`package.json`).
- `.describe()` annotations on every `listingSchema` field flow straight into the
  schema `description`s — verified in the dumped output. Single-sourced.
- **Round-trip test is meaningful, not tautological** (`prompt.test.ts:27-43`):
  `EXAMPLE` is a hand-written const, and the test pushes it through
  `parseAppendVisits` — the *production* importer (which uses `visitSchema`, a
  *different, stricter-on-id* schema than `listingSchema`). It asserts concrete
  field values, id injection, and that `photos`/`floorPlan` come out empty. This
  genuinely proves the documented example is importable.
  - I independently confirmed `visitSchema` **requires** `id` (a no-id object
    fails), so the test passing is only possible *because* `injectIds` runs —
    i.e. the test exercises the real seam, it isn't tautological.

NON-BLOCKING enhancement: the test round-trips `EXAMPLE` through the *importer*
but never validates `EXAMPLE` against `listingSchema` itself (the contract the LLM
actually sees). I added that check ad hoc — `EXAMPLE` validates cleanly — but a
permanent `rootSchema.safeParse(EXAMPLE)` assertion would catch a future drift
where someone edits `EXAMPLE` into something the *prompt's own schema* rejects yet
the loose importer still accepts. Worth one line.

## 3. `injectIds` safety — PASS (with two bounded edge cases)

- **Scope is correct.** `injectIds` is referenced only at `storage.ts:248`
  (inside `parseAppendVisits`) and in `prompt.test.ts`. It does **not** touch
  `loadState`/`parsePersisted` (`storage.ts:24`) or replace-all `parseImport`/
  `parseImportFile` (`storage.ts:175`). Grep-confirmed across `src/` and `e2e/`.
  The append path's own final id reassignment at `storage.ts:261`
  (`{ ...v, id: uid() }`) means even a preset/colliding id in the file is
  overwritten — verified: input `id:"evil-collide"` comes out with a fresh uid,
  matching `store.test.ts:127-128`.
- **`as` narrowing is sound.** Every cast at `storage.ts:221/226/229` is guarded
  by a preceding `typeof === "object" && !Array.isArray(...)` (line 220) or the
  per-element `it && typeof it === "object" && !Array.isArray(it)` predicate
  (lines 227-228). `Record<string, unknown>` is the honest post-guard type; no
  unsound widening. The `["links","contacts"] as const` tuple keeps key access
  typed. Clean per §2.

NON-BLOCKING edge cases (bounded; a prompt-following LLM won't hit them):

- **Garbage becomes empty apartments** (`storage.ts:219-235` + `visitSchema`).
  Confirmed: `{ visits: ["garbage", 42, null, {}, { foo: "bar" }] }` yields **two
  empty apartments** (`name: ""`). `injectIds` gives `{}` and `{foo}` an id;
  `visitSchema`'s field-level `.catch("")` then accepts them as blank visits. The
  string/number/null are left as non-objects and dropped by `parseVisits`. So
  *primitives* are safely dropped, but *empty objects* survive as blank cards.
  Impact is low — the user sees the "Добавлено квартир: N" alert
  (`store.ts:523`) and an LLM obeying the prompt won't emit `{}`. Could tighten by
  having `injectIds`/`parseAppendVisits` skip objects with no usable `name`, but
  that's a judgment call, not a defect. Note the existing `appendApartments` guard
  (`store.ts:518`) only catches a *fully* empty result, not blank-but-present.

- **A single bad element drops the whole `links`/`contacts` array.** Confirmed:
  `contacts: ["junk", { name:"A", value:"v" }]` comes out as `contacts: []` — the
  valid contact is lost with the junk. Cause: `visitSchema` uses
  `z.array(contactSchema).catch([])` (`schema.ts:87`), and Zod `.catch` on an
  array is all-or-nothing — one non-coercible element throws and the whole array
  falls back to `[]`. `injectIds` doesn't help because it only injects ids into
  object-shaped elements; the string `"junk"` stays a string and poisons the
  array. This is *element-level fragility* that the schema's own header comment
  (`schema.ts:7-9`) claims to avoid ("one bad item is dropped, not the whole
  array") — true for the top-level `parseVisits` loop, but **not** for nested
  link/contact arrays. Again low impact (a prompt-following LLM emits clean object
  arrays), but the comment slightly oversells the guarantee for nested arrays.
  A per-element parse (like `parseVisits`) on links/contacts would fully deliver
  the documented behavior.

## 4. Clipboard handler — PASS

`ChecklistScreen.tsx:14-27`:

- **No floating promise.** The `navigator.clipboard.writeText(...)` promise is
  consumed by `.then().catch()`; no missing `void`/await. (Matches the project's
  no-floating-promises lint, which `verify` passed.)
- **Error/fallback path present (§10).** On rejection (insecure context /
  permission denied) it logs the prompt to the console and `alert()`s the user
  that the prompt is in the console — a real path forward, not a dead-end.
- **setTimeout-after-unmount (React 18):** `setTimeout(() => setPromptCopied(false),
  2000)` (line 19). If `ChecklistScreen` unmounts within 2s of a copy, the timer
  still fires `setPromptCopied`. In React 18 this is a **no-op on an unmounted
  component — no warning, no leak** (the old "can't perform a state update on an
  unmounted component" warning was removed in React 18). The timer holds a closure
  for ≤2s, which is negligible. **Acceptable as-is**; a cleanup
  `useEffect`/`AbortController` would be over-engineering for ephemeral "copied!"
  feedback. NON-BLOCKING.

NON-BLOCKING nit: `buildAppendPrompt()` is called twice on the failure path
(line 16 and again line 24). It's cheap (string concat + one
`zodToJsonSchema`), so not worth a variable, but hoisting it once would be
marginally cleaner.

## Tests & a11y spot-checks

- `prompt.test.ts` checks root shape, generated `"properties"`, every house type,
  the "don't emit internal fields" rules, and the round-trip. Good behavior-level
  coverage (§7).
- e2e copy test grants clipboard permissions, clicks by accessible name
  (`/Скопировать промпт/`), asserts the «✓ Скопировано» feedback by role, and
  reads back the clipboard to confirm `"visits"` + `"JSON Schema"` are present
  (`flows.spec.ts:66-76`) — queries the way a user/AT would (§7/§8).
- Button is a real `<button>` with text label; copied state is conveyed in the
  label text (`ChecklistScreen.tsx:209`). Semantic, keyboard-operable (§8).

## Summary of findings

| # | Severity | Location | Finding |
|---|----------|----------|---------|
| 1 | NON-BLOCKING | `storage.ts:219-235` + `visitSchema` | Empty objects `{}` in `visits` survive as blank apartments (primitives are safely dropped). |
| 2 | NON-BLOCKING | `schema.ts:86-87` (`z.array(...).catch([])`) | One non-object element drops the *entire* nested `links`/`contacts` array; the header comment's "one bad item dropped, not the whole array" doesn't hold for nested arrays. |
| 3 | NON-BLOCKING | `prompt.test.ts:27-43` | Round-trip is meaningful but never asserts `EXAMPLE` validates against `listingSchema` (the contract shown to the LLM); add `rootSchema.safeParse(EXAMPLE)` to catch example↔contract drift. |
| 4 | NON-BLOCKING | `ChecklistScreen.tsx:16,24` | `buildAppendPrompt()` built twice on the clipboard-failure path. |

No BLOCKING issues. Single-source-of-truth holds, the prompt is unambiguous with
no true contradiction, `injectIds` is correctly scoped and soundly narrowed, and
the clipboard handler is safe under React 18.
