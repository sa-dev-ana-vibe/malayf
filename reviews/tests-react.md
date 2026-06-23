# Reviewer A (judgment) — TEST SUITE chunk

VERDICT: PASS (with one strong non-blocking recommendation)

## Gates (both GREEN, re-run by me)
- `npm run verify` — tsc -b + eslint + **104 vitest tests** (4 files) + vite build: PASS.
- `npm run e2e` — **3 Playwright tests** (chromium, 430×880): PASS in ~2.4s.

## §7 judgment — behavior over implementation

The unit suite is genuinely behavior-focused: every assertion checks a
public function's *output* for a given input, never a private field or call
count. No spies, no mocks of the unit-under-test, so nothing tests-the-mock.
Factories (`src/test/factories.ts`) produce already-valid domain objects and
are used for scoring/format/storage; the parse-boundary tests
(`schema.test.ts`) deliberately bypass factories and feed raw objects/JSON —
exactly right, and the comment at `schema.test.ts:12-14` documents why. The
e2e specs query by role/label/text/placeholder only (`getByRole`,
`getByPlaceholder`, `getByText`); I found **zero** CSS selectors, `data-testid`,
or `.locator("…")` class hooks. That is the §7 ideal.

Coverage is spent where failure hurts — and I cross-checked each assertion
against the real source:
- **Scoring correctness** (`scoring.test.ts`): boundary at pct≥60 pass / ≥70
  green / ≥45 amber is pinned with off-by-one neighbors (69 vs 70, 44 vs 45 at
  `:132-134`); select-value clamping at 250→100 (`:51`); the `totalW===0`
  equal-weight fallback (`:109`, matches `scoring.ts:98` `w=1`); na excluded
  from the rated denominator (`:69`). These are the lines that would silently
  corrupt a buyer's ranking — good targeting, not trivia.
- **Boundary parsing** (`schema.test.ts`): field-level `.catch` recovery, bad
  array→default, required-id rejection, element-level resilience (drop one bad
  category/visit, keep the rest at `:201-218`), the exact RU error string. This
  is the §2 untrusted boundary and it is exercised thoroughly.
- **Storage round-trip** (`storage.test.ts`): real localStorage round-trip,
  "exactly the four keys" guard (`:82`), export inlines IDB blobs → data-URLs
  and decodes back to original bytes (`:142-146`), import re-persists to fresh
  IDB ids, missing-photo / null-floorPlan degradation (`:149`), and
  `migrateInlinePhotos` changed=false identity-preservation (`:266-270`). The
  round-trips go through fake-indexeddb (a real impl), not a stub.
- **Real user journeys** (`e2e/app.spec.ts`): create→score→reload-persist,
  weights-stay-100-after-distribute + export-downloads-a-file, compare-table.
  Plus a console/pageerror tracker that asserts an empty error array.

I did not find tautologies. The closest is `scoreVisit` "all-zero" at
`scoring.test.ts:79` (a full-object equality on an empty visit) — that's a real
spec, not a tautology. `catScore`'s `pass===strong` alias check (`:92`) is a
near-trivial identity but documents an intentional alias, so it's fine.

## Setup shim faithfulness (sanity check)

`src/test/setup.ts` swaps global `Blob`→`node:buffer` Blob and installs a
hand-rolled `FileReader` shim. The header comment correctly explains the root
cause (Node's `structuredClone` can't clone a jsdom Blob through
fake-indexeddb's structured-clone persistence). I traced the shim against the
real consumers:
- `blobToDataUrl` (`photoStore.ts:181`) uses `readAsDataURL` + `r.result` as a
  string and `r.onload`/`r.onerror` — the shim implements exactly these.
- `dataUrlToBlob` round-trip is asserted by *byte size + type* equality in the
  storage tests, so a faithful base64 path is actually verified, not assumed.
- The shim's base64 (`String.fromCharCode` loop + `btoa`) is the standard
  encoding and matches what a browser FileReader produces for the same bytes.

Caveat (non-blocking, see finding 1): the shim is **good enough that a passing
storage test means the data-URL/Blob *bytes* round-trip correctly**, which is
the property under test. It does NOT prove the production browser FileReader
path, but that path is what e2e's photo-reload would cover — and that e2e flow
is currently missing (finding 2).

## "node" in tsconfig.app types — leak risk

`tsconfig.app.json:22-28` adds `"node"` to `types`, and its `include` is `src`
only. e2e lives under `tsconfig.node.json` (`playwright.config.ts` + `e2e/**`).
The shim legitimately needs `node:buffer` types. I grepped all non-test app
code for `process.`, `Buffer`, `__dirname`, `require(`, `node:` and found
**zero** usages, so nothing leaks today. The residual risk is real but small:
`@types/node` now makes `Buffer`, `process`, `setImmediate`, `global`, etc.
type-check clean inside `src/**` app code, so a future `process.env.X` in a
component would compile and ship `undefined` to the browser instead of being
caught by tsc. eslint + `noUnusedLocals` don't catch this. See finding 1.

---

## Findings

1. [non-blocking] [§7/§1] `tsconfig.app.json:27` — adding `"node"` to the app
   project's `types` lets Node globals (`process`, `Buffer`, `setImmediate`)
   type-check clean inside browser app code, where they'd be `undefined` at
   runtime. Only the test setup actually needs `node:buffer`. Suggestion: scope
   Node types to the test files instead — e.g. a `types: ["node"]` triple-slash
   or a separate tsconfig that only includes `src/test/**` + `*.test.ts`, or
   add a lint guard (`no-restricted-globals` for `process`/`Buffer`) so a stray
   Node API in a component is caught. Today there are 0 leaks, so this is
   prevention, not a defect.

2. [non-blocking] [§7] `e2e/app.spec.ts` (whole file) — the e2e set verifies
   3 journeys, but several flows the QA agent verified by hand
   (`reviews/screens-qa.md`) have **no automated coverage at any level**:
   - **Photo upload → mark floor-plan → full-reload survival** (the flow
     screens-qa.md:58-61 calls "the big one"). Unit tests prove the IDB
     *round-trip* in Node, but the real browser file-upload + blob: URL +
     reload path — exactly what the setup shim cannot simulate — is untested.
   - **Import "replace ALL data" destructive flow** (screens-qa.md:82-85) with
     its confirm dialog and post-import navigation. `parseImport` is unit-tested
     but the UI wiring (file chooser → confirm → state replaced → routed to
     list) is not.
   - **Delete-with-confirm** for a visit (screens-qa.md:67-68) — the
     `window.confirm` Cancel-keeps / Accept-removes branch.
   - **Sort + tag-filter** including the "no matches" empty state
     (screens-qa.md:41-44).
   Suggestion: add at least the photo-upload+reload and the import-replace e2e
   specs — these are the highest-value because they exercise the exact
   integration boundary (IndexedDB Blob + FileReader in a real browser) that
   the unit shim deliberately fakes.

3. [non-blocking] [§7] `src/store.ts` (526 lines, the whole `actions` reducer
   surface) has **no unit test**, yet it owns logic QA flagged as load-bearing
   and easy to regress: the **cascade delete** of a tag from every visit's
   `tagIds` (`store.ts:312`) and of a red-flag label from every visit's
   `redFlags` (`store.ts:343`), plus visit CRUD and the weight-edit wiring.
   `scoring.ts`'s `setCatWeightInList`/`roundWeights` are well tested, but the
   *reducer* that calls them, and the cascade filters, are pure functions that
   would be cheap to test directly and would catch a "deleted tag still
   referenced by a visit" regression that neither the current e2e nor the unit
   suite would notice. Suggestion: a small `store.test.ts` driving
   `actions.deleteTag` / `actions.deleteRedFlag` / `actions.removeVisit`
   against a seeded state and asserting the cascade.

4. [non-blocking] [§7] `storage.test.ts` — no test for the **quota-exceeded**
   degradation path in `persist` (`storage.ts:63-77`), which §10 calls out as a
   real local-first failure mode (it `alert()`s a path-to-export). Easy to
   cover by stubbing `localStorage.setItem` to throw a
   `DOMException("…","QuotaExceededError")` and asserting the one-shot
   `warnedQuota` guard. Low priority (it's an error path), but it's the kind of
   thing that silently rots.

## OK (clean gates)
- OK: verify GREEN — tsc + eslint + 104 vitest + build.
- OK: e2e GREEN — 3 Playwright specs.
- OK: tests assert behavior/output, never internals; no over-mocking, no
  tests-the-mock, no tautologies of substance.
- OK: e2e selects by role/label/text/placeholder only — no CSS/testid hooks.
- OK: factories yield valid domain objects; parse-boundary tests correctly use
  raw objects, not factories.
- OK: scoring boundaries, select clamping, weight-sum-to-100, schema `.catch`
  recovery, element-level resilience, storage four-key guard, and photo
  data-URL byte round-trip are all pinned and match the source I read.
- OK: setup shim is faithful to the bytes-round-trip property it backs; the
  comment explains the structured-clone root cause accurately.
- OK: `node` types do not leak into app code today (0 usages of Node globals in
  non-test `src/**`); e2e is correctly isolated under `tsconfig.node.json`.
- OK: vitest/playwright configs are sound — separate config so PWA/Tailwind
  plugins don't run under tests; e2e on a dedicated strictPort (5188) so it
  can't latch onto a sibling dev server; CI runs verify then e2e with browser
  install.
