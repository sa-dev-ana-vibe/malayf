# Reviewer B (QA) — SCREENS + INTEGRATION chunk

VERDICT: PASS

Total console output observed across the WHOLE sweep (MALAYF tab, http://localhost:5177):
**0 errors, 0 React warnings.** The only console noise from the app origin was 3× the
browser-emitted deprecation notice `<meta name="apple-mobile-web-app-capable"> is deprecated`
(once per page load, from index.html line 12 — cosmetic, not app code) and the dev-mode
React DevTools INFO notice. (The many `[ERROR]` lines in the raw playwright console logs are
all from the user's pre-existing Grafana tabs, `hollandandbarrett.grafana.net` 400/403 API
calls — unrelated to this app; localhost:5177 produced zero error lines.)

Machine gate: `npm run verify` (tsc -b && eslint . && vite build) = GREEN.

Findings:
  1. [non-blocking]  Category weights auto-rebalance: editing one category's weight proportionally
     rescales the others so the total stays exactly 100% (e.g. setting cat0 to 40 turned the
     others 20/15/25/10 → 17/13/21/9). This is a stronger guarantee than "must equal 100" and
     is fine; just note the "red when ≠100" state is only reachable via category *deletion*
     (which does NOT rebalance) or via imported/legacy data. I confirmed both green (100%) and
     red (70% after a delete) states render with the correct colors, so the logic is wired —
     just documenting the behavior, not a defect.
  2. [non-blocking]  The "apple-mobile-web-app-capable" meta is deprecated; swapping in (or adding)
     `<meta name="mobile-web-app-capable">` in index.html would silence the one recurring browser
     warning. Purely cosmetic.

Verified by RUNNING (430×880 mobile viewport; drove with Playwright MCP; watched console throughout):

  APP SHELL / ROUTING / BOTTOM NAV
  - Empty state on load: "No apartments yet" + icon + copy + "+ Add first appartment" CTA. Clean.
  - 3-tab bottom nav (Appartments / Compare / Settings) with live counts. Counts tracked correctly
    through the whole session: 0→1→2 apartments, Compare 0→2 (selected), Settings 21→22 (item count
    after adding an item / importing). Each tab switches screens; Detail screen correctly hides the nav.
  - No horizontal overflow at 430px on any screen (documentElement.scrollWidth == innerWidth == 430;
    Compare table fits in 400px inside the frame).
  - Keyboard focus visible: Tab moves focus to controls with a real focus outline (1px auto) — not suppressed.

  APARTMENTS SCREEN
  - "+ Add first appartment" and "+ New appartment" both create a visit and open Detail.
  - Card shows name, address (or "No address yet"), "Jun 23 · N/22 rated", tag chip, "⚑ N red flags"
    badge, price "8,5kk"/"5kk", and "NN% SCORE". Pass/fail bar renders (green/red segments, screenshot-verified).
  - Sort dropdown reorders: "Площадь (больше → меньше)" reordered Cheaper(40m²)→Test(50m²) to Test-first.
  - Tag filter: clicking "позвонить" narrowed to the 1 matching card; clicking "маленькая" (no matches)
    showed the empty state "Нет квартир с выбранными метками." Deselect restored the list.

  DETAIL SCREEN (every control exercised)
  - Name typed; price "8500000" → renders "8 500 000"; "за м²" appeared after area set: "170 000 за м²" (correct).
  - Address → "Открыть в 2ГИС ↗" link with correctly URL-encoded 2gis.ru/search query.
  - Listing link: "+ Add listing link" → URL input + ✓(Готово)/×; after ✓ it collapses to a clickable
    "↗ avito.ru" link with the right href + ✎ edit toggle + × delete. Domain extraction works.
  - Params (area/living/floor/floors/year) all retained; house-type select set to "Панельный" and stuck.
  - Investment: invLive/invGood typed → "Цена за м² до «хорошо» 200 000" box appeared ((8.5M+1.5M)/50, correct).
  - Tags: toggled "позвонить" (stored in tagIds).
  - Red flags: toggled 2 flags → header count badge updated to "2"; later cascaded to "1" after a deletion.
  - Contacts: added one with a phone → ☎ "Позвонить" tel:+79161234567; added one with email → ✉
    "Написать письмо" mailto:maria@example.com. Icon adapts to phone vs email.
  - Visit date: "+ Дата" added a date input pre-filled with today (2026-06-23); × delete present.
  - PHOTO (the big one): uploaded a 4×4 PNG via file_upload → rendered as <img>; marked floor-plan via ▦
    (floorPlan field set to the photo id, button shows "▦ ПЛАН"). After a FULL PAGE RELOAD the <img> still
    renders from a blob: URL with naturalWidth/Height = 4×4 (exact match) — IndexedDB Blob survived, AND it
    even survived an export→import roundtrip.
  - Checklist scoring updates LIVE: Pass/Fail/N/A on three items → header went "2/21 rated · 50% · 1 pass /
    1 fail / 1 n/a" (N/A correctly excluded from rated denominator). Stars item: clicking the 3rd star set
    result=3 and the score badge dropped 100%→90% instantly. Select("Список") item renders its options as buttons.
  - Notes typed and persisted.
  - DELETE: confirm dialog "Delete this apartment visit?" — Cancel kept the apartment (no trap); Accept
    removed it and returned to the list (2→1).

  COMPARE SCREEN
  - Empty hint "Select one or more to build the comparison table." with picker chips.
  - Selecting both built the table: header names + ↗, rows Цена (5 000 000 / 8 500 000), Цена за м²
    (125 000 / 170 000), Площадь (40 / 50), per-category % (Space&Layout 100%/50%, others —), OVERALL 100%/50%.
    Category cells color-coded (green/amber), OVERALL row highlighted (screenshot-verified).
  - Clicking "Test Flat on Lenina ↗" opened that apartment's Detail card.

  SETTINGS / CHECKLIST EDITOR
  - "Weights total" badge GREEN at 100% (rgb 31,157,99); RED at 70% (rgb 214,69,63) after deleting a category.
  - "Distribute evenly" set all categories to equal weight (5 cats → 20 each = 100%).
  - Add/rename/delete category (delete shows "Delete this category and its items?" confirm); add item;
    item type → "Список" spawned an options editor (2 options, label + value 0–100). All persisted to store.
  - "⬇ Экспорт JSON" downloaded a real file `aptcheck-2026-06-23.json` (valid JSON: app/version/exportedAt/
    categories/visits/tags/redFlags — all data present).
  - "⬆ Импорт" → file chooser → confirm "Импорт заменит ВСЕ текущие данные. Продолжить?" → after accept,
    data was REPLACED (category renamed to "IMPORTED CATEGORY", visit "IMPORTED VISIT MARKER" appeared,
    Settings count became 22) and the app navigated to the list. No crash.

  TAGS EDITOR
  - "+ Добавить метку" added "Новая метка"; renamed it to "QA Test Tag" and recolored to #00ff00 (persisted).
  - Deleting "позвонить" (confirm "Удалить метку?") removed it from the global tag list AND from the
    visit's tagIds (Test Flat's tagIds went from [позвонить] to []). Cascade-to-visits works.

  RED FLAGS EDITOR
  - All 10 flags as editable name fields + × delete + "+ Добавить ред-флаг".
  - Deleting "Плесень / сырость" (confirm "Удалить ред-флаг?") removed it from the global list AND from
    Test Flat's redFlags (2 → 1). Cascade-to-visits works.

  PERSISTENCE / RESILIENCE
  - Full page reload preserved everything: visits, categories (incl. imported), tags, red flags, contacts,
    listing link, visit date, notes, AND the photo Blob (re-rendered from IndexedDB at correct dimensions).
  - "⎘ Вставить" (paste-photo) clicked with no clipboard image → degraded gracefully (no crash, no error,
    no white-screen; app stayed alive). No modal/confirm trapped the user anywhere.

No dead controls found — every button/toggle/select/link performed its labelled action.
No console error, no React warning, no white-screen, no missing empty state, no broken 430px layout,
no lost-on-reload data. All blocking gate items pass.
