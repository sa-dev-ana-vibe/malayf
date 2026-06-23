// ─────────────────────────────────────────────────────────────────────────
// Persistence. Structured data → localStorage (tiny, synchronous, instant
// load). Photo blobs → IndexedDB (see photoStore.ts). Export/import inlines
// photos as data-URLs so a single JSON file stays portable between devices.
//
// Both read boundaries (localStorage, imported file) are parsed through the
// schemas in schema.ts — never cast (FRONTEND_QUALITY §2).
// ─────────────────────────────────────────────────────────────────────────

import type { AppState, ExportFile, PersistedData, Visit } from "../types";
import { defaultCats, defaultRedFlags, defaultTags } from "./defaults";
import { uid } from "./format";
import { parseImportFile, parseJson, parsePersisted, parseVisits } from "./schema";
import {
  blobToDataUrl,
  dataUrlToBlob,
  getPhotoBlob,
  putPhoto,
} from "./photoStore";

export const KEY = "aptcheck_v1";

/** Load app state from localStorage; seed defaults when nothing usable is stored. */
export function loadState(): AppState {
  let parsed: PersistedData | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) parsed = parsePersisted(parseJson(raw));
  } catch {
    /* ignore corrupt storage */
  }
  parsed ??= { categories: defaultCats(), visits: [], tags: [], redFlags: [] };
  const tags = parsed.tags.length ? parsed.tags : defaultTags();
  const redFlagDefs = parsed.redFlags.length ? parsed.redFlags : defaultRedFlags();

  return {
    screen: "visits",
    activeVisitId: null,
    compareIds: [],
    tagFilter: [],
    sortBy: "default",
    tagsFrom: "visits",
    editLinkId: null,
    categories: parsed.categories,
    visits: parsed.visits,
    tags,
    redFlagDefs,
  };
}

let warnedQuota = false;

export function persist(data: PersistedData): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        categories: data.categories,
        visits: data.visits,
        tags: data.tags,
        redFlags: data.redFlags,
      }),
    );
  } catch (e) {
    console.warn("persist failed", e);
    // A full quota is a real local-first failure mode — don't let the edit
    // silently vanish; point the user at export (§10: always a path forward).
    const quotaHit =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");
    if (quotaHit && !warnedQuota) {
      warnedQuota = true;
      alert(
        "Хранилище переполнено — последние изменения могли не сохраниться. " +
          "Откройте Settings → «Экспорт JSON», чтобы сохранить данные в файл.",
      );
    }
  }
}

const isDataUrl = (s: string | null | undefined): s is string =>
  typeof s === "string" && s.startsWith("data:");

/**
 * Move any inline data-URL photos (from prototype data / partial imports) into
 * IndexedDB, rewriting visits to reference photo ids. Returns the rewritten
 * visits and whether anything changed.
 */
export async function migrateInlinePhotos(
  visits: Visit[],
): Promise<{ changed: boolean; visits: Visit[] }> {
  let changed = false;
  const out: Visit[] = [];
  for (const v of visits) {
    if (!v.photos.some(isDataUrl) && !isDataUrl(v.floorPlan)) {
      out.push(v);
      continue;
    }
    changed = true;
    const map = new Map<string, string>(); // data-URL → new id
    const photos: string[] = [];
    for (const p of v.photos) {
      if (isDataUrl(p)) {
        try {
          // Isolate per photo: one corrupt data-URL must not drop the rest.
          const id = await putPhoto(dataUrlToBlob(p));
          map.set(p, id);
          photos.push(id);
        } catch (e) {
          console.warn("skipped a corrupt photo during migration", e);
        }
      } else {
        photos.push(p);
      }
    }
    const floorPlan = isDataUrl(v.floorPlan)
      ? (map.get(v.floorPlan) ?? null)
      : v.floorPlan;
    out.push({ ...v, photos, floorPlan });
  }
  return { changed, visits: out };
}

// ── export ───────────────────────────────────────────────────────────────

/** Build a portable export file with photos inlined as data-URLs. */
export async function buildExport(data: PersistedData): Promise<ExportFile> {
  const visits: Visit[] = [];
  for (const v of data.visits) {
    const photoUrls: string[] = [];
    const idToUrl = new Map<string, string>();
    for (const id of v.photos) {
      const blob = await getPhotoBlob(id);
      if (blob) {
        const url = await blobToDataUrl(blob);
        idToUrl.set(id, url);
        photoUrls.push(url);
      }
    }
    const floorPlan = v.floorPlan ? (idToUrl.get(v.floorPlan) ?? null) : null;
    visits.push({ ...v, photos: photoUrls, floorPlan });
  }
  return {
    app: "aptcheck",
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: data.categories,
    visits,
    tags: data.tags,
    redFlags: data.redFlags,
  };
}

export function triggerDownload(file: ExportFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "aptcheck-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── import ─────────────────────────────────────────────────────────────────

/**
 * Parse + validate an import file (throws a user-facing message on invalid
 * input) and persist its inline photos to IndexedDB, returning data that
 * references the new photo ids. tags/redFlags fall back to defaults when empty.
 */
export async function parseImport(text: string): Promise<PersistedData> {
  const parsed = parseImportFile(parseJson(text));

  const visits: Visit[] = [];
  for (const v of parsed.visits) {
    const photos: string[] = [];
    let floorPlan: string | null = null;
    for (const url of v.photos) {
      if (!isDataUrl(url)) continue;
      try {
        // Isolate per photo: a single bad data-URL shouldn't abort the import.
        const id = await putPhoto(dataUrlToBlob(url));
        photos.push(id);
        if (v.floorPlan === url) floorPlan = id;
      } catch (e) {
        console.warn("skipped a corrupt photo during import", e);
      }
    }
    visits.push({ ...v, photos, floorPlan });
  }

  return {
    categories: parsed.categories,
    visits,
    tags: parsed.tags.length ? parsed.tags : defaultTags(),
    redFlags: parsed.redFlags.length ? parsed.redFlags : defaultRedFlags(),
  };
}

/**
 * Parse a file for ADDITIVE import — it only needs a `visits` array (an export
 * file works too; its categories/tags/redFlags are ignored). Each visit gets a
 * FRESH id so it can't collide with an existing or another appended visit, and
 * its inline data-URL photos are moved into IndexedDB. Throws a user-facing
 * message when there is no visits array.
 *
 * Note: a visit's checklist answers are keyed by checklist-item id, so appended
 * apartments only score when they came from the same master checklist.
 */
export async function parseAppendVisits(text: string): Promise<Visit[]> {
  const raw = parseJson(text);
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  if (!o || !Array.isArray(o.visits)) {
    throw new Error("Неверный файл: нет списка квартир (visits).");
  }

  const out: Visit[] = [];
  for (const v of parseVisits(o.visits)) {
    const photos: string[] = [];
    let floorPlan: string | null = null;
    for (const url of v.photos) {
      if (!isDataUrl(url)) continue;
      try {
        const id = await putPhoto(dataUrlToBlob(url));
        photos.push(id);
        if (v.floorPlan === url) floorPlan = id;
      } catch (e) {
        console.warn("skipped a corrupt photo during append", e);
      }
    }
    out.push({ ...v, id: uid(), photos, floorPlan });
  }
  return out;
}
