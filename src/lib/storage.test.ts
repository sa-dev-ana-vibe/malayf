import { describe, expect, it } from "vitest";
import {
  KEY,
  buildExport,
  loadState,
  migrateInlinePhotos,
  parseImport,
  persist,
} from "./storage";
import {
  blobToDataUrl,
  dataUrlToBlob,
  getPhotoBlob,
  putPhoto,
} from "./photoStore";
import { defaultCats, defaultRedFlags, defaultTags } from "./defaults";
import { makeCategory, makeTag, makeVisit } from "../test/factories";
import type { PersistedData } from "../types";

// A tiny 1x1 transparent PNG as a base64 data-URL — round-trips through
// dataUrlToBlob/blobToDataUrl without external fixtures.
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

describe("loadState", () => {
  it("seeds defaults when localStorage is empty", () => {
    const s = loadState();
    expect(s.screen).toBe("visits");
    expect(s.categories).toHaveLength(5);
    expect(s.categories.map((c) => c.name)).toEqual([
      "Space & Layout",
      "Light & Comfort",
      "Kitchen & Bath",
      "Building & Location",
      "Condition",
    ]);
    expect(s.visits).toEqual([]);
    expect(s.tags).toHaveLength(defaultTags().length);
    expect(s.tags.map((t) => t.name)).toEqual(defaultTags().map((t) => t.name));
    expect(s.redFlagDefs).toEqual(defaultRedFlags());
  });

  it("falls back to defaults on corrupt JSON in storage", () => {
    localStorage.setItem(KEY, "{not valid json");
    const s = loadState();
    expect(s.categories).toHaveLength(5);
    expect(s.visits).toEqual([]);
    expect(s.tags.map((t) => t.name)).toEqual(defaultTags().map((t) => t.name));
    expect(s.redFlagDefs).toEqual(defaultRedFlags());
  });

  it("fills empty tags/redFlags with defaults but keeps stored categories/visits", () => {
    const cat = makeCategory({ name: "Custom", weight: 100 });
    const visit = makeVisit({ name: "Flat A" });
    persist({ categories: [cat], visits: [visit], tags: [], redFlags: [] });

    const s = loadState();
    expect(s.categories).toEqual([cat]);
    expect(s.visits).toEqual([visit]);
    // empty tags/redFlags fall back to defaults
    expect(s.tags.map((t) => t.name)).toEqual(defaultTags().map((t) => t.name));
    expect(s.redFlagDefs).toEqual(defaultRedFlags());
  });
});

describe("persist + loadState round-trip", () => {
  it("preserves categories, visits, tags and redFlags", () => {
    const cat = makeCategory({ name: "Layout", weight: 60 });
    const visit = makeVisit({ name: "Flat B", price: "1000", photos: [] });
    const tag = makeTag({ name: "shortlist", color: "#1f9d63" });
    const redFlags = ["Mold", "Noise"];

    persist({ categories: [cat], visits: [visit], tags: [tag], redFlags });

    const s = loadState();
    expect(s.categories).toEqual([cat]);
    expect(s.visits).toEqual([visit]);
    expect(s.tags).toEqual([tag]);
    expect(s.redFlagDefs).toEqual(redFlags);
  });

  it("writes exactly the four persisted fields under KEY", () => {
    persist({
      categories: defaultCats(),
      visits: [makeVisit()],
      tags: defaultTags(),
      redFlags: defaultRedFlags(),
    });
    const raw = localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    const obj = JSON.parse(raw!) as Record<string, unknown>;
    expect(Object.keys(obj).sort()).toEqual([
      "categories",
      "redFlags",
      "tags",
      "visits",
    ]);
  });
});

describe("buildExport", () => {
  it("inlines IndexedDB photos as data-URLs and maps floorPlan to its data-URL", async () => {
    const photoBlob = new Blob(["x"], { type: "image/png" });
    const photoId = await putPhoto(photoBlob);
    const planBlob = new Blob(["plan-bytes"], { type: "image/png" });
    const planId = await putPhoto(planBlob);

    // floorPlan is resolved from the same id->url map built off `photos`, so a
    // floor-plan id must also appear in `photos` to be inlined.
    const visit = makeVisit({
      name: "With photos",
      photos: [photoId, planId],
      floorPlan: planId,
    });
    const data: PersistedData = {
      categories: defaultCats(),
      visits: [visit],
      tags: defaultTags(),
      redFlags: defaultRedFlags(),
    };

    const file = await buildExport(data);

    expect(file.app).toBe("aptcheck");
    expect(file.version).toBe(1);
    expect(typeof file.exportedAt).toBe("string");
    expect(file.categories).toEqual(data.categories);
    expect(file.tags).toEqual(data.tags);
    expect(file.redFlags).toEqual(data.redFlags);

    expect(file.visits).toHaveLength(1);
    const ev = file.visits[0];
    // ids replaced by inlined data-URLs
    expect(ev.photos).toHaveLength(2);
    expect(ev.photos.every((p) => p.startsWith("data:"))).toBe(true);
    expect(ev.photos).not.toContain(photoId);
    expect(ev.photos).not.toContain(planId);
    expect(ev.floorPlan).not.toBeNull();
    expect(ev.floorPlan!.startsWith("data:")).toBe(true);

    // the inlined data-URLs decode back to the original bytes
    const photoUrl = await blobToDataUrl(photoBlob);
    const planUrl = await blobToDataUrl(planBlob);
    expect(ev.photos[0]).toBe(photoUrl);
    expect(ev.photos[1]).toBe(planUrl);
    expect(ev.floorPlan).toBe(planUrl); // floorPlan maps to its own data-URL
  });

  it("drops missing photo ids and nulls a floorPlan that has no blob", async () => {
    const visit = makeVisit({
      photos: ["ph_does_not_exist"],
      floorPlan: "ph_also_missing",
    });
    const file = await buildExport({
      categories: defaultCats(),
      visits: [visit],
      tags: defaultTags(),
      redFlags: defaultRedFlags(),
    });
    expect(file.visits[0].photos).toEqual([]);
    expect(file.visits[0].floorPlan).toBeNull();
  });
});

describe("parseImport", () => {
  function exportText(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      app: "aptcheck",
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      categories: defaultCats(),
      visits: [],
      tags: defaultTags(),
      redFlags: defaultRedFlags(),
      ...overrides,
    });
  }

  it("persists inline data-URL photos to IndexedDB and references new ids", async () => {
    const visit = makeVisit({
      name: "Imported",
      photos: [PNG_DATA_URL],
      floorPlan: PNG_DATA_URL,
    });
    const data = await parseImport(exportText({ visits: [visit] }));

    expect(data.visits).toHaveLength(1);
    const iv = data.visits[0];
    expect(iv.photos).toHaveLength(1);
    // photos are now fresh IndexedDB ids, not data-URLs
    expect(iv.photos[0].startsWith("data:")).toBe(false);
    expect(iv.photos[0]).not.toBe(PNG_DATA_URL);
    expect(iv.floorPlan).toBe(iv.photos[0]);

    // the new id resolves to a real stored blob
    const blob = await getPhotoBlob(iv.photos[0]);
    expect(blob).toBeInstanceOf(Blob);
    const expected = dataUrlToBlob(PNG_DATA_URL);
    expect(blob!.size).toBe(expected.size);
    expect(blob!.type).toBe(expected.type);
  });

  it("keeps the other fields from a valid export", async () => {
    const cat = makeCategory({ name: "Imp", weight: 100 });
    const tag = makeTag({ name: "x" });
    const data = await parseImport(
      exportText({ categories: [cat], tags: [tag], redFlags: ["RF"] }),
    );
    expect(data.categories).toEqual([cat]);
    expect(data.tags).toEqual([tag]);
    expect(data.redFlags).toEqual(["RF"]);
  });

  it("falls back to default tags and redFlags when they are empty", async () => {
    const data = await parseImport(exportText({ tags: [], redFlags: [] }));
    expect(data.tags.map((t) => t.name)).toEqual(
      defaultTags().map((t) => t.name),
    );
    expect(data.redFlags).toEqual(defaultRedFlags());
  });

  it("throws on invalid JSON", async () => {
    await expect(parseImport("{ broken")).rejects.toThrow();
  });

  it("throws when the visits array is missing", async () => {
    const text = JSON.stringify({ app: "aptcheck", categories: defaultCats() });
    await expect(parseImport(text)).rejects.toThrow(/визит|чек-лист/);
  });

  it("throws when the categories array is missing", async () => {
    const text = JSON.stringify({ app: "aptcheck", visits: [] });
    await expect(parseImport(text)).rejects.toThrow(/визит|чек-лист/);
  });
});

describe("migrateInlinePhotos", () => {
  it("moves inline data-URL photos into IndexedDB and rewrites to ids", async () => {
    const visit = makeVisit({
      name: "Legacy",
      photos: [PNG_DATA_URL],
      floorPlan: PNG_DATA_URL,
    });

    const { changed, visits } = await migrateInlinePhotos([visit]);

    expect(changed).toBe(true);
    expect(visits).toHaveLength(1);
    const mv = visits[0];
    expect(mv.photos).toHaveLength(1);
    expect(mv.photos[0].startsWith("data:")).toBe(false);
    expect(mv.photos[0]).not.toBe(PNG_DATA_URL);
    // floorPlan remapped to the same new id (it was the same data-URL)
    expect(mv.floorPlan).toBe(mv.photos[0]);

    const blob = await getPhotoBlob(mv.photos[0]);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("preserves existing id-based photos and reports changed=false", async () => {
    const id = await putPhoto(new Blob(["x"], { type: "image/png" }));
    const visit = makeVisit({ photos: [id], floorPlan: id });

    const { changed, visits } = await migrateInlinePhotos([visit]);

    expect(changed).toBe(false);
    // returned visit is the same untouched reference (nothing to migrate)
    expect(visits[0]).toBe(visit);
    expect(visits[0].photos).toEqual([id]);
    expect(visits[0].floorPlan).toBe(id);
  });

  it("keeps already-stored ids while migrating only the inline data-URLs", async () => {
    const id = await putPhoto(new Blob(["keep"], { type: "image/png" }));
    const visit = makeVisit({
      photos: [id, PNG_DATA_URL],
      floorPlan: null,
    });

    const { changed, visits } = await migrateInlinePhotos([visit]);

    expect(changed).toBe(true);
    const mv = visits[0];
    expect(mv.photos).toHaveLength(2);
    expect(mv.photos[0]).toBe(id); // untouched id kept in place
    expect(mv.photos[1].startsWith("data:")).toBe(false);
    expect(mv.floorPlan).toBeNull();
  });
});
