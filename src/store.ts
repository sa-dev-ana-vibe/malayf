// ─────────────────────────────────────────────────────────────────────────
// Central store. The prototype was a single React component owning all state;
// this is the faithful equivalent — one external store with action methods,
// read through useSyncExternalStore. Data mutations persist to localStorage;
// navigation / selection (UI state) does not.
// ─────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react";
import type {
  AppState,
  Category,
  ItemType,
  ResultValue,
  Screen,
  SortBy,
  Visit,
} from "./types";
import { uid, visitDates } from "./lib/format";
import {
  distributeWeightsInList,
  setCatWeightInList,
} from "./lib/scoring";
import {
  buildExport,
  loadState,
  migrateInlinePhotos,
  parseAppendVisits,
  parseImport,
  persist,
  triggerDownload,
} from "./lib/storage";
import {
  deletePhotos,
  putPhoto,
  requestPersistentStorage,
  resizeToBlob,
} from "./lib/photoStore";

let state: AppState = loadState();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function getState() {
  return state;
}

function persistNow() {
  persist({
    categories: state.categories,
    visits: state.visits,
    tags: state.tags,
    redFlags: state.redFlagDefs,
  });
}

function set(
  patch: Partial<AppState> | ((s: AppState) => Partial<AppState>),
  doPersist = false,
) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
  if (doPersist) persistNow();
}

const mutVisits = (fn: (vs: Visit[]) => Visit[]) =>
  set((s) => ({ visits: fn(s.visits.slice()) }), true);
const mutCats = (fn: (cs: Category[]) => Category[]) =>
  set((s) => ({ categories: fn(s.categories.slice()) }), true);
const mutTags = (fn: (ts: AppState["tags"]) => AppState["tags"]) =>
  set((s) => ({ tags: fn(s.tags.slice()) }), true);
const mutRedFlags = (fn: (d: string[]) => string[]) =>
  set((s) => ({ redFlagDefs: fn(s.redFlagDefs.slice()) }), true);

export function activeVisit(): Visit | null {
  return state.visits.find((v) => v.id === state.activeVisitId) ?? null;
}

function updateActiveVisit(updater: (v: Visit) => Visit) {
  mutVisits((vs) => vs.map((v) => (v.id === state.activeVisitId ? updater(v) : v)));
}

// ── actions ──────────────────────────────────────────────────────────────

export const actions = {
  // navigation / UI
  go: (screen: Screen) => set({ screen }),
  openVisit: (id: string) => set({ activeVisitId: id, screen: "detail" }),
  back: () => set({ screen: "visits", activeVisitId: null }),
  goTags: () => set((s) => ({ tagsFrom: s.screen, screen: "tags" })),
  goRedFlags: () => set((s) => ({ tagsFrom: s.screen, screen: "redflags" })),
  backFromTags: () => set((s) => ({ screen: s.tagsFrom || "visits" })),
  setSortBy: (sortBy: SortBy) => set({ sortBy }),
  toggleCompare: (id: string) =>
    set((s) => ({
      compareIds: s.compareIds.includes(id)
        ? s.compareIds.filter((x) => x !== id)
        : [...s.compareIds, id],
    })),
  toggleFilter: (tagId: string) =>
    set((s) => ({
      tagFilter: s.tagFilter.includes(tagId)
        ? s.tagFilter.filter((x) => x !== tagId)
        : [...s.tagFilter, tagId],
    })),
  setEditLinkId: (id: string | null) => set({ editLinkId: id }),

  // visit lifecycle
  newVisit: () => {
    const id = uid();
    const v: Visit = {
      id,
      name: "",
      address: "",
      dates: [],
      results: {},
      notes: "",
      photos: [],
      floorPlan: null,
      links: [],
      contacts: [],
      tagIds: [],
      redFlags: [],
      price: "",
      areaTotal: "",
      areaLiving: "",
      floor: "",
      floorsTotal: "",
      houseType: "",
      yearBuilt: "",
      invLive: "",
      invGood: "",
    };
    set((s) => ({ visits: [v, ...s.visits], activeVisitId: id, screen: "detail" }), true);
  },
  deleteVisit: (id: string) => {
    if (!confirm("Delete this apartment visit?")) return;
    const victim = state.visits.find((v) => v.id === id);
    if (victim?.photos.length) void deletePhotos(victim.photos);
    set(
      (s) => ({
        visits: s.visits.filter((v) => v.id !== id),
        compareIds: s.compareIds.filter((x) => x !== id),
        screen: s.activeVisitId === id ? "visits" : s.screen,
        activeVisitId: s.activeVisitId === id ? null : s.activeVisitId,
      }),
      true,
    );
  },
  deleteAllVisits: () => {
    if (!state.visits.length) {
      alert("Нет квартир для удаления.");
      return;
    }
    if (!confirm("Удалить ВСЕ квартиры? Чек-лист, метки и ред-флаги останутся.")) return;
    const photoIds = state.visits.flatMap((v) => v.photos);
    if (photoIds.length) void deletePhotos(photoIds);
    set(
      {
        visits: [],
        compareIds: [],
        activeVisitId: null,
        screen: "visits",
      },
      true,
    );
  },
  updateActive: (field: keyof Visit, value: string) =>
    updateActiveVisit((v) => ({ ...v, [field]: value })),

  // checklist answers
  setResult: (itemId: string, value: ResultValue) =>
    updateActiveVisit((v) => {
      const r = { ...v.results };
      if (r[itemId] === value) delete r[itemId];
      else r[itemId] = value;
      return { ...v, results: r };
    }),
  setResultForce: (itemId: string, value: ResultValue) =>
    updateActiveVisit((v) => ({ ...v, results: { ...v.results, [itemId]: value } })),
  clearResult: (itemId: string) =>
    updateActiveVisit((v) => {
      const r = { ...v.results };
      delete r[itemId];
      return { ...v, results: r };
    }),

  // photos
  addPhotoFile: async (file: Blob) => {
    const targetId = state.activeVisitId;
    if (!targetId) return;
    const blob = await resizeToBlob(file);
    const photoId = await putPhoto(blob);
    if (state.activeVisitId !== targetId && !state.visits.some((v) => v.id === targetId)) {
      void deletePhotos([photoId]);
      return;
    }
    mutVisits((vs) =>
      vs.map((v) => (v.id === targetId ? { ...v, photos: [...v.photos, photoId] } : v)),
    );
  },
  removePhoto: (idx: number) => {
    const av = activeVisit();
    if (!av) return;
    const removed = av.photos[idx];
    if (removed) void deletePhotos([removed]);
    mutVisits((vs) =>
      vs.map((v) => {
        if (v.id !== state.activeVisitId) return v;
        const p = v.photos.slice();
        p.splice(idx, 1);
        const floorPlan = v.floorPlan === removed ? null : v.floorPlan;
        return { ...v, photos: p, floorPlan };
      }),
    );
  },
  toggleFloorPlan: (id: string) =>
    mutVisits((vs) =>
      vs.map((v) =>
        v.id === state.activeVisitId
          ? { ...v, floorPlan: v.floorPlan === id ? null : id }
          : v,
      ),
    ),
  pasteFromClipboard: async () => {
    const nav = navigator as Navigator & {
      clipboard?: { read?: () => Promise<ClipboardItem[]> };
    };
    if (!nav.clipboard?.read) {
      alert("Браузер не поддерживает чтение буфера. Используйте Ctrl+V / Cmd+V.");
      return;
    }
    try {
      const items = await nav.clipboard.read();
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await it.getType(type);
          await actions.addPhotoFile(blob);
          return;
        }
      }
      alert("В буфере обмена нет изображения.");
    } catch {
      alert("Не удалось прочитать буфер. Скопируйте картинку и нажмите Ctrl+V / Cmd+V.");
    }
  },

  // visit dates
  addDate: () =>
    updateActiveVisit((v) => ({ ...v, dates: [...visitDates(v), today()] })),
  updateDate: (idx: number, value: string) =>
    updateActiveVisit((v) => {
      const d = visitDates(v).slice();
      d[idx] = value;
      return { ...v, dates: d };
    }),
  removeDate: (idx: number) =>
    updateActiveVisit((v) => {
      const d = visitDates(v).slice();
      d.splice(idx, 1);
      return { ...v, dates: d };
    }),

  // listing links
  addLink: () => {
    const id = uid();
    set({ editLinkId: id });
    updateActiveVisit((v) => ({ ...v, links: [...v.links, { id, label: "", url: "" }] }));
  },
  updateLink: (linkId: string, field: "label" | "url", value: string) =>
    updateActiveVisit((v) => ({
      ...v,
      links: v.links.map((l) => (l.id === linkId ? { ...l, [field]: value } : l)),
    })),
  removeLink: (linkId: string) =>
    updateActiveVisit((v) => ({ ...v, links: v.links.filter((l) => l.id !== linkId) })),

  // contacts
  addContact: () =>
    updateActiveVisit((v) => ({
      ...v,
      contacts: [...v.contacts, { id: uid(), name: "", value: "" }],
    })),
  updateContact: (cId: string, field: "name" | "value", value: string) =>
    updateActiveVisit((v) => ({
      ...v,
      contacts: v.contacts.map((c) => (c.id === cId ? { ...c, [field]: value } : c)),
    })),
  removeContact: (cId: string) =>
    updateActiveVisit((v) => ({ ...v, contacts: v.contacts.filter((c) => c.id !== cId) })),

  // visit tags & red flags
  toggleVisitTag: (tagId: string) =>
    updateActiveVisit((v) => {
      const ids = v.tagIds;
      return {
        ...v,
        tagIds: ids.includes(tagId) ? ids.filter((x) => x !== tagId) : [...ids, tagId],
      };
    }),
  toggleRedFlag: (label: string) =>
    updateActiveVisit((v) => {
      const f = v.redFlags;
      return {
        ...v,
        redFlags: f.includes(label) ? f.filter((x) => x !== label) : [...f, label],
      };
    }),

  // tags editor
  addTag: () => mutTags((ts) => [...ts, { id: uid(), name: "Новая метка", color: "#6a35d9" }]),
  renameTag: (id: string, name: string) =>
    mutTags((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t))),
  recolorTag: (id: string, color: string) =>
    mutTags((ts) => ts.map((t) => (t.id === id ? { ...t, color } : t))),
  deleteTag: (id: string) => {
    if (!confirm("Удалить метку?")) return;
    set(
      (s) => ({
        tags: s.tags.filter((t) => t.id !== id),
        tagFilter: s.tagFilter.filter((x) => x !== id),
        visits: s.visits.map((v) => ({
          ...v,
          tagIds: v.tagIds.filter((x) => x !== id),
        })),
      }),
      true,
    );
  },

  // red flags editor
  addRedFlag: () => mutRedFlags((d) => [...d, "Новый ред-флаг"]),
  renameRedFlag: (idx: number, val: string) =>
    set(
      (s) => {
        const old = s.redFlagDefs[idx];
        const defs = s.redFlagDefs.slice();
        defs[idx] = val;
        const visits = s.visits.map((v) => ({
          ...v,
          redFlags: v.redFlags.map((x) => (x === old ? val : x)),
        }));
        return { redFlagDefs: defs, visits };
      },
      true,
    ),
  deleteRedFlag: (idx: number) => {
    if (!confirm("Удалить ред-флаг?")) return;
    set(
      (s) => {
        const old = s.redFlagDefs[idx];
        const defs = s.redFlagDefs.filter((_, i) => i !== idx);
        const visits = s.visits.map((v) => ({
          ...v,
          redFlags: v.redFlags.filter((x) => x !== old),
        }));
        return { redFlagDefs: defs, visits };
      },
      true,
    );
  },

  // checklist categories & items
  addCategory: () =>
    mutCats((cs) => [...cs, { id: uid(), name: "New category", weight: 0, items: [] }]),
  setCatWeight: (id: string, val: string) =>
    mutCats((cs) => setCatWeightInList(cs, id, val)),
  distributeWeights: () => mutCats((cs) => distributeWeightsInList(cs)),
  renameCategory: (id: string, name: string) =>
    mutCats((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c))),
  deleteCategory: (id: string) => {
    if (!confirm("Delete this category and its items?")) return;
    mutCats((cs) => cs.filter((c) => c.id !== id));
  },
  addItem: (catId: string) =>
    mutCats((cs) =>
      cs.map((c) =>
        c.id === catId
          ? { ...c, items: [...c.items, { id: uid(), text: "", type: "ternary" }] }
          : c,
      ),
    ),
  renameItem: (catId: string, itemId: string, text: string) =>
    mutCats((cs) =>
      cs.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.map((it) => (it.id === itemId ? { ...it, text } : it)) }
          : c,
      ),
    ),
  deleteItem: (catId: string, itemId: string) =>
    mutCats((cs) =>
      cs.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c,
      ),
    ),
  setItemType: (catId: string, itemId: string, type: ItemType) =>
    mutCats((cs) =>
      cs.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              items: c.items.map((it) => {
                if (it.id !== itemId) return it;
                const next = { ...it, type };
                if (type === "select" && !next.options?.length)
                  next.options = [
                    { id: uid(), label: "", value: "100" },
                    { id: uid(), label: "", value: "0" },
                  ];
                return next;
              }),
            },
      ),
    ),
  addOption: (catId: string, itemId: string) =>
    mutCats((cs) =>
      cs.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              items: c.items.map((it) =>
                it.id !== itemId
                  ? it
                  : { ...it, options: [...(it.options ?? []), { id: uid(), label: "", value: "0" }] },
              ),
            },
      ),
    ),
  updateOption: (
    catId: string,
    itemId: string,
    optId: string,
    field: "label" | "value",
    value: string,
  ) => {
    const v = field === "value" ? String(value).replace(/[^\d-]/g, "") : value;
    mutCats((cs) =>
      cs.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              items: c.items.map((it) =>
                it.id !== itemId
                  ? it
                  : {
                      ...it,
                      options: (it.options ?? []).map((o) =>
                        o.id !== optId ? o : { ...o, [field]: v },
                      ),
                    },
              ),
            },
      ),
    );
  },
  deleteOption: (catId: string, itemId: string, optId: string) =>
    mutCats((cs) =>
      cs.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              items: c.items.map((it) =>
                it.id !== itemId
                  ? it
                  : { ...it, options: (it.options ?? []).filter((o) => o.id !== optId) },
              ),
            },
      ),
    ),

  // price (thousands-formatted)
  setPrice: (val: string) => {
    const digits = String(val ?? "").replace(/\D/g, "");
    const formatted = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
    updateActiveVisit((v) => ({ ...v, price: formatted }));
  },

  // data export / import
  exportData: async () => {
    const file = await buildExport({
      categories: state.categories,
      visits: state.visits,
      tags: state.tags,
      redFlags: state.redFlagDefs,
    });
    triggerDownload(file);
  },
  importData: async (file: File) => {
    const text = await file.text();
    let imported;
    try {
      imported = await parseImport(text);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не удалось импортировать файл.");
      return;
    }
    if (!confirm("Импорт заменит ВСЕ текущие данные. Продолжить?")) return;
    set(
      {
        categories: imported.categories,
        visits: imported.visits,
        tags: imported.tags,
        redFlagDefs: imported.redFlags,
        compareIds: [],
        tagFilter: [],
        activeVisitId: null,
        screen: "visits",
      },
      true,
    );
  },
  // Additive import: append apartments from JSON to the existing list,
  // leaving the checklist/tags/red flags untouched. Non-destructive, so no
  // confirmation — just a count of what was added.
  appendApartmentsText: async (text: string, errorMessage = "Не удалось прочитать JSON.") => {
    let appended;
    try {
      appended = await parseAppendVisits(text);
    } catch (e) {
      alert(e instanceof Error ? e.message : errorMessage);
      return;
    }
    if (!appended.length) {
      alert("В JSON нет квартир для добавления.");
      return;
    }
    set((s) => ({ visits: [...s.visits, ...appended], screen: "visits" }), true);
    alert("Добавлено квартир: " + String(appended.length));
  },
  appendApartments: async (file: File) => {
    await actions.appendApartmentsText(await file.text(), "Не удалось прочитать файл.");
  },
  appendApartmentsFromClipboard: async () => {
    const nav = navigator as Navigator & { clipboard?: { readText?: () => Promise<string> } };
    if (!nav.clipboard?.readText) {
      alert("Браузер не поддерживает чтение текста из буфера. Вставьте JSON в файл.");
      return;
    }

    let text = "";
    try {
      text = await nav.clipboard.readText();
    } catch {
      alert("Не удалось прочитать буфер обмена. Разрешите доступ или импортируйте JSON файлом.");
      return;
    }
    if (!text.trim()) {
      alert("В буфере обмена нет JSON.");
      return;
    }
    await actions.appendApartmentsText(text, "Не удалось прочитать JSON из буфера.");
  },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** One-time startup: migrate any inline photos to IndexedDB + request durability. */
export async function initStore() {
  void requestPersistentStorage();
  try {
    const { changed, visits } = await migrateInlinePhotos(state.visits);
    if (changed) set({ visits }, true);
  } catch (e) {
    console.warn("photo migration failed", e);
  }
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export type Actions = typeof actions;
