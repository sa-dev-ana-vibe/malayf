# Frontend Quality Gates — React + TypeScript

**What this document is.** This is the *judgment layer* of our quality bar — the
gates that a linter and a compiler **cannot** check, because they require taste,
context, and architectural intent.

**What this document is NOT.** It contains no lint rules and no compiler flags.
Anything a machine can enforce lives in `tsconfig.json` and `eslint.config.mjs`,
and it lives there *only*. The rule of thumb:

> If a rule can be expressed as a lint rule or a compiler flag, it belongs in the
> config — never in this file. This file is for the rules a machine can't verify.

**How to use it.** When generating, reviewing, or refactoring code, treat each
gate below as a review criterion, not an optional suggestion. Each is tagged with
the practitioner whose thinking it reflects, so the intent stays traceable.

---

## 0. Platform context (this project)
*How the generic gates below land on a widget-based to-do platform.*

- **The SDK is the trust seam.** Widgets receive a `TodoSdk` and touch nothing
  else — not the store, not `localStorage`, not the repository. The SDK boundary
  is the architectural decision §4 and §6 are really about here: keep data behind
  one door so the future backend swap is invisible to widgets.
- **Pasted widget code is untrusted input (§2 applies hard).** Anything entering
  through the "Add widget" box, and any persisted widget source/config rehydrated
  on boot, crosses a trust boundary — guard/parse it with a schema, surface
  failures as an inline error, and never let it `as`-cast its way past the type
  system or crash the host.
- **Every widget is an error seam (§10 applies hard).** Each `WidgetHost` wraps
  its widget in an error boundary: one widget throwing degrades that card, never
  the dashboard.
- **No backend yet, but design for it.** To-do data is local behind the SDK
  today. When the backend lands, the server-vs-client-state discipline in §4 is
  what keeps it clean — fetched data belongs in a cache read through the SDK, not
  copied into the store.

---

## 1. Type design — *make the compiler work for you*
*(Matt Pocock, Total TypeScript)*

The compiler enforces that types are **consistent**. It cannot tell whether they
are **well-designed**. That judgment is ours.

- **Make illegal states unrepresentable.** Model with discriminated unions so
  impossible combinations can't be constructed. A request is
  `{ status: 'loading' } | { status: 'error'; error: E } | { status: 'success'; data: D }`
  — never three independent booleans (`isLoading`, `isError`, `data`) that can
  contradict each other.
- **Infer, don't annotate — except at boundaries.** Annotate function signatures,
  public APIs, and exported contracts; let inference handle everything internal.
  Redundant annotations rot when the source changes.
- **Single source of truth for types.** Derive (`ReturnType`, `infer`, `z.infer`,
  indexed access) instead of hand-maintaining a parallel type that can drift.
- **Name types for domain meaning, not shape.** `UserId`, not `StringId`;
  `DraftInvoice`, not `PartialInvoice`.

## 2. Validate at the boundary — *parse, don't validate*
*(Colin McDonnell, Zod / tRPC)*

Types are erased at runtime. The compiler trusts your assertions; it cannot check
data it never sees. **Everything crossing the trust boundary must be parsed.**

- Validate API responses, form input, URL/search params, `localStorage`, env
  vars, **and pasted widget code/config** with a schema **at the edge**, then
  trust the resulting types inward.
- Never cast untrusted data with `as`. A cast is a promise to the compiler that
  *you* must make true — a schema parse is how you keep it.
- Keep schemas as the single source of truth and derive the static type from them,
  so the runtime shape and the compile-time type can never disagree.

## 3. Effects — *you might not need one*
*(Dan Abramov)*

`exhaustive-deps` checks the dependency array. It **cannot** tell you the effect
shouldn't exist. That is the more important question.

- **Don't use an effect to transform data for rendering.** Compute it during
  render instead.
- **Don't use an effect to handle a user event.** That logic belongs in the event
  handler.
- Effects are for **synchronizing with external systems** (the DOM, a
  subscription, a non-React widget) — nothing else.
- If you're chaining effects that set state to trigger other effects, stop and
  rethink the data flow.

## 4. Server state ≠ client state
*(Tanner Linsley, TanStack Query)*

This separation is invisible to the type system, but it's the highest-leverage
architectural decision in a data-driven UI.

- **Server state** (anything owned by the backend) lives in the query cache —
  *not* in `useState` or a global store. Don't copy fetched data into local state;
  read it from the cache where it's already cached, deduped, and invalidatable.
- **Client state** (UI concerns: open/closed, selected tab, form drafts) stays
  local, lifted only as far as it's actually shared.
- Be deliberate about **query keys and invalidation**. Know what each mutation
  invalidates and why.
- Every async boundary handles **loading, error, *and* empty** states explicitly.
  "Empty" is a real state, not an afterthought — a linter will never catch a
  missing empty state, but users will.

## 5. Component design & composition
*(Dan Abramov, Josh Comeau)*

- **One responsibility per component**, judged by concerns, not line count. A
  component that fetches, transforms, and renders three unrelated things should be
  split — even if it's short.
- **Compose, don't configure.** Prefer `children` / slots over an ever-growing set
  of boolean props. When you reach a third `variantX` boolean, reach for
  composition instead.
- **Colocate by feature, not by file type.** Keep a feature's components, hooks,
  and tests together. Folder structure is a judgment call no rule can make.
- **Lift state only as far as it's needed.** Prop-drilling two or three levels is
  fine and explicit. Reach for Context only when state is genuinely cross-cutting,
  not to avoid passing a prop.
- **Extract a custom hook** when stateful logic is reused *or* when it's the only
  way to give a gnarly piece of logic a meaningful name.

## 6. State management restraint
*(Mark Erikson, Dan Abramov)*

- **Local first.** Introduce a global store only when state is shared across
  distant parts of the tree and lifting would be absurd.
- **Derive, don't store.** Compute values from existing state during render rather
  than storing a copy you then have to keep in sync. Synced duplicates are a bug
  waiting to happen.

## 7. Testing — *behavior over implementation*
*(Kent C. Dodds)*

Coverage thresholds can be set in config; **what is worth testing cannot.**

- **Test what the user experiences, not internals.** No assertions on internal
  state, instance methods, or class names. If a behavior-preserving refactor
  breaks a test, the test was too coupled.
- **"Write tests. Not too many. Mostly integration."** Favor integration tests
  that exercise a feature over a swarm of shallow unit tests.
- **Query the way a user (or assistive tech) would** — by role, label, and text,
  not by `data-testid` or CSS selectors. This doubles as an accessibility check.
- **Coverage is a signal, not a target.** 100% coverage of trivial code is wasted
  effort; an untested critical path is a real gap. Spend the tests where failure
  hurts.

## 8. Accessibility beyond the linter
*(Josh Comeau)*

`jsx-a11y` catches the mechanical issues (missing `alt`, unlabeled inputs). The
rest is judgment a rule can't encode:

- **Semantic HTML first.** Reach for ARIA only when no native element expresses
  the semantics. A `<button>` beats a `<div role="button">` every time.
- **Keyboard operability** for every interactive element, including custom
  widgets: focus order is logical, nothing is mouse-only.
- **Manage focus on context changes** — move focus into an opened modal, return it
  on close, and handle focus on route transitions.
- **Respect `prefers-reduced-motion`** and verify color contrast *in context*, not
  just in isolation.

## 9. Performance — *measure first*
*(React core team)*

- **No premature memoization.** Don't sprinkle `memo` / `useMemo` / `useCallback`
  by reflex. Add them for *proven* expensive work or for references whose
  stability is actually load-bearing. A linter can't distinguish a justified memo
  from cargo-cult noise — we can.
- **Profile before optimizing.** Optimize the thing the profiler flags, not the
  thing you assume is slow.
- **Split the bundle intentionally.** Lazy-load routes and genuinely heavy
  components. *What* to split is an engineering decision; a budget in CI is the
  backstop, not the strategy.

## 10. Errors & resilience

- **Error boundaries at meaningful seams** — route level and major feature widgets
  — so one component's failure degrades a region instead of blanking the app.
- **Distinguish recoverable from unrecoverable** errors and always give the user a
  path forward (retry, go back, contact). A caught error that dead-ends is only
  half-handled.

## 11. Naming & intent *(cross-cutting)*

- **Names reveal intent and domain meaning.** Lint enforces casing; it can't tell
  that `data2`, `handleClick2`, or `tmp` explain nothing. Rename until the name
  carries the meaning.
- **Comments explain _why_, not _what_.** The code already says what it does. A
  comment earns its place by capturing the reason, the tradeoff, or the gotcha.

---

### The dividing line, restated

| Enforced by machine (configs) | Enforced by judgment (this doc) |
| --- | --- |
| `strict`, `noUncheckedIndexedAccess`, no `any`, no floating promises, exhaustive `switch`, `exhaustive-deps`, import hygiene | Whether the *type design* is sound, whether an effect should exist, server-vs-client state, what's worth testing, composition, focus management, justified memoization, naming |

If you find yourself about to add a bullet here that *could* be a lint rule or a
compiler flag, add it to the config instead. Keep this file scoped to the things
only a thinking reviewer can catch.

> **Operational note.** The machine-enforced gates are checked by `pnpm verify`.
> The *behavioral* checks that are neither lint rules nor judgment essays — "is
> every button actually wired," "zero console errors at runtime," "a thrown
> widget shows an inline error, not a white screen" — live in the reviewer
> protocol in `BUILD_GOAL.md`, because they can only be confirmed by running the
> app.
