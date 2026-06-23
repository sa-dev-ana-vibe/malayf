# Review: "Append apartments from JSON" (additive import)

Feature: a non-destructive import that appends apartments from a JSON file to the
existing list, distinct from the existing replace-all `importData`.

## Verdict

**APPROVE.** The feature is sound, behaves correctly, and respects the
FRONTEND_QUALITY judgment gates. Gates are green and the e2e is a faithful
additive check. No BLOCKING findings. A few NON-BLOCKING notes below.

## Gates (run, green)

- `npm run verify` — tsc + eslint + **114** vitest + vite build: all pass.
- `npm run e2e` — **8** Playwright tests pass, including
  `flows.spec.ts:47 "append adds apartments from a file, keeping the existing ones"`.

## §1 / §2 — Parse at the untrusted boundary (sound, no unsafe casts)

`parseAppendVisits` (src/lib/storage.ts:214-241) handles the new untrusted file
boundary correctly:

- JSON is read through `parseJson` → `unknown` (src/lib/schema.ts:112), never
  `any`.
- The top-level object is narrowed with a runtime guard
  (`raw && typeof raw === "object" && !Array.isArray(raw)`,
  storage.ts:216-219) before access. The lone `as Record<string, unknown>` here
  (storage.ts:218) is the same controlled idiom already used in `asRecord`
  (schema.ts:154) — it follows a verified runtime check and is not a cast of
  unverified data past the type system. Acceptable under §2.
- The actual visit elements are parsed element-by-element through the Zod
  `visitSchema` via `parseVisits` (schema.ts:130-138): a single malformed visit
  is dropped, not the whole array, and every field is either schema-checked or
  `.catch()`-defaulted. No untrusted shape reaches the store uncast.

This matches the replace-all `parseImport` (storage.ts:175-202) discipline, so
the new boundary is held to the same bar as the existing one.

## Correctness

**ID-regeneration prevents collisions — confirmed.**
storage.ts:238 spreads the parsed visit then overwrites `id: uid()`, so the
file's own id is discarded for a fresh one. This defends against (a) a file
visit colliding with an existing store visit, and (b) two appended visits
sharing an id. Verified by store.test.ts:127-128 (the `"from-file"` id does not
survive). One theoretical caveat: `uid()` is `Date.now()`+5 random base36 chars
(format.ts:3-5); two visits generated within the same millisecond rely on the
random suffix for uniqueness. Collision probability is negligible and identical
to the rest of the app (`newVisit`, `addContact`, etc. all use the same `uid()`),
so this is not a regression. NON-BLOCKING.

**Photos converted — confirmed.** For each appended visit, inline data-URL
photos are moved into IndexedDB via `putPhoto(dataUrlToBlob(...))` and the visit
is rewritten to reference the new ids (storage.ts:228-237). `floorPlan` is
remapped only when it equals one of the visit's data-URL photos
(storage.ts:233). Non-data-URL entries are skipped (storage.ts:229). Each photo
is wrapped in its own try/catch so one corrupt data-URL is logged and skipped
rather than aborting the whole append (storage.ts:230-236) — mirrors
`parseImport` and `migrateInlinePhotos`.

**Empty / invalid file handled gracefully (no crash) — confirmed.**
- No object / no `visits` array → `parseAppendVisits` throws a Russian
  user-facing message (storage.ts:220-222), caught in `appendApartments`
  (store.ts:514-517) and surfaced via `alert`; data untouched. Covered by
  store.test.ts:131-143.
- `visits` present but every element invalid (or `[]`) → `parseVisits` returns
  `[]`, `appended.length === 0`, and the action alerts "В файле нет квартир для
  добавления" and returns without mutating state (store.ts:518-521).
- Non-JSON text → `parseJson` throws `SyntaxError`, caught by the same
  try/catch and reported via the generic "Не удалось прочитать файл" branch
  (store.ts:514-516). No unhandled rejection: the `onChange` handler calls
  `void actions.appendApartments(f)` and the action swallows its own errors.

## Semantics

**Additive vs replace-all distinction is clear to the user — yes.**
- Separate, visually distinct control: the append label uses a dashed accent
  border and a `➕` glyph (ChecklistScreen.tsx:187-200), set apart from the solid
  Экспорт/Импорт row (ChecklistScreen.tsx:165-186).
- The note spells out all three actions and explicitly states that append "только
  дополнит список квартир ... чек-лист, метки и ред-флаги останутся как есть"
  vs import "заменит текущие данные" (ChecklistScreen.tsx:201-205).
- Behavior matches the copy: `appendApartments` appends and persists with **no
  confirm** (store.ts:506-524), whereas `importData` requires the destructive
  "заменит ВСЕ" confirm (store.ts:491). Skipping confirm on a non-destructive
  action is the right call.

**Known caveat — appended visits only score under the SAME checklist.**
Acceptable AND documented. Results are keyed by checklist-item id
(`results: z.record(...)`, schema.ts:81; interpreted by item id in scoring). An
appended visit answered against a different master checklist will have results
whose keys don't match the current items, so they won't score. This is inherent
to the data model (the same is true of replace-all import losing the file's
categories), and it is explicitly called out in the `parseAppendVisits` doc
comment (storage.ts:211-213) and implied by the UI note that the checklist is
left "как есть". Documenting a known limitation at the boundary that produces it
is the right level of handling. NON-BLOCKING.

## §10 — Resilience / degradation

- A corrupt or wrong-shape file degrades gracefully: a typed message via
  `alert`, store left intact, app does not crash (store.ts:514-517). The error
  is recoverable and gives the user a path forward (pick a different file) — §10
  satisfied.
- Per-photo isolation (storage.ts:230-236) means a single bad data-URL never
  aborts an otherwise-valid append.
- Note: the inner per-visit/per-photo failures are surfaced only via
  `console.warn`, not to the user — so a partially-photoless append is silent.
  Consistent with the existing `parseImport`/`migrateInlinePhotos` behavior;
  acceptable. NON-BLOCKING.

## Tests

**e2e is a faithful additive check — yes.** flows.spec.ts:47-64 creates "Kept
Flat", appends `import.json` (which contributes "Imported Flat"), then asserts
**both** "Imported Flat" AND "Kept Flat" are visible (lines 62-63) — i.e. the
original survived and the imported one was added. It also exercises the
no-confirm path by registering a generic dialog acceptor and never relying on a
confirm prompt, and verifies navigation back to the list. This is distinct from
the replace-all e2e (flows.spec.ts:30-45) which asserts the original is **gone**
(`toHaveCount(0)`), so the two behaviors are clearly differentiated in tests.

Unit tests (store.test.ts:109-144) cover the two load-bearing behaviors:
additive append + fresh id, and rejection of a file with no visits array leaving
data untouched. They query by user-observable data (visit names / counts), in
line with §7.

**NON-BLOCKING test gaps** (nice-to-have, not required):
- No unit/e2e assertion that an appended visit's inline data-URL photo lands in
  IndexedDB with a remapped id (the photo path is exercised only by
  `parseImport` tests, if any). The shared code is well-covered by reuse, but a
  direct test of `parseAppendVisits`' photo conversion would lock it in.
- No test for the `appended.length === 0` "В файле нет квартир" branch
  (store.ts:518-521); only the throw branch is tested.

## Findings summary

| Severity | Finding | Location |
| --- | --- | --- |
| BLOCKING | none | — |
| NON-BLOCKING | `uid()` ms-collision is theoretical only; same scheme used app-wide | src/lib/format.ts:3-5 |
| NON-BLOCKING | Same-checklist scoring caveat — acceptable, and documented | src/lib/storage.ts:211-213 |
| NON-BLOCKING | Skipped corrupt photos surfaced only via console.warn, not to user | src/lib/storage.ts:235 |
| NON-BLOCKING | No direct test of append photo→IndexedDB conversion | src/store.test.ts:109 |
| NON-BLOCKING | No test for the empty-visits ("nothing to add") alert branch | src/store.ts:518-521 |
