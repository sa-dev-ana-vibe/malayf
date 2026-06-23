import { describe, expect, it } from "vitest";
import {
  categorySchema,
  parseImportFile,
  parseJson,
  parsePersisted,
  parseStringArray,
  resultValueSchema,
  visitSchema,
} from "./schema";

// These parsers sit at the untrusted boundary (localStorage / imported JSON).
// Inputs are therefore built as plain objects/JSON — NOT via the factories,
// which only ever produce already-valid domain objects.

describe("parseJson", () => {
  it("parses JSON text into the value as unknown", () => {
    expect(parseJson('{"a":1,"b":[2,3]}')).toEqual({ a: 1, b: [2, 3] });
    expect(parseJson('"hi"')).toBe("hi");
    expect(parseJson("42")).toBe(42);
    expect(parseJson("null")).toBeNull();
  });

  it("throws on malformed JSON", () => {
    expect(() => parseJson("{not json")).toThrow();
  });
});

describe("parseStringArray", () => {
  it("keeps only string elements", () => {
    expect(parseStringArray(["a", 1, "b", null, true, "c"])).toEqual(["a", "b", "c"]);
  });

  it("returns [] for non-arrays", () => {
    expect(parseStringArray(null)).toEqual([]);
    expect(parseStringArray(undefined)).toEqual([]);
    expect(parseStringArray("nope")).toEqual([]);
    expect(parseStringArray({ 0: "a" })).toEqual([]);
  });

  it("returns [] for an empty array", () => {
    expect(parseStringArray([])).toEqual([]);
  });
});

describe("resultValueSchema", () => {
  it("accepts numbers and strings", () => {
    expect(resultValueSchema.parse(5)).toBe(5);
    expect(resultValueSchema.parse("pass")).toBe("pass");
    expect(resultValueSchema.parse("o1")).toBe("o1");
  });

  it("rejects other types", () => {
    expect(resultValueSchema.safeParse(true).success).toBe(false);
    expect(resultValueSchema.safeParse(null).success).toBe(false);
    expect(resultValueSchema.safeParse({}).success).toBe(false);
  });
});

describe("visitSchema defaults", () => {
  it("fills every optional field from a bare { id }", () => {
    const v = visitSchema.parse({ id: "v1" });
    expect(v).toEqual({
      id: "v1",
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
    });
  });

  it("recovers a non-string name via field-level .catch (name='')", () => {
    const v = visitSchema.parse({ id: "v1", name: 123 });
    expect(v.id).toBe("v1");
    expect(v.name).toBe("");
  });

  it("recovers corrupt array/record fields to their defaults", () => {
    const v = visitSchema.parse({
      id: "v1",
      dates: "not-an-array",
      results: 42,
      photos: { junk: true },
      floorPlan: 99,
      links: "bad",
      tagIds: null,
      redFlags: 7,
    });
    expect(v.dates).toEqual([]);
    expect(v.results).toEqual({});
    expect(v.photos).toEqual([]);
    expect(v.floorPlan).toBeNull();
    expect(v.links).toEqual([]);
    expect(v.tagIds).toEqual([]);
    expect(v.redFlags).toEqual([]);
  });

  it("preserves valid values and accepts null floorPlan / legacy date", () => {
    const v = visitSchema.parse({
      id: "v1",
      name: "Flat",
      dates: ["2026-06-23"],
      date: "2020-01-01",
      results: { it1: "pass", it2: 4 },
      floorPlan: "fp_1",
      tagIds: ["t1", "t2"],
    });
    expect(v.name).toBe("Flat");
    expect(v.dates).toEqual(["2026-06-23"]);
    expect(v.date).toBe("2020-01-01");
    expect(v.results).toEqual({ it1: "pass", it2: 4 });
    expect(v.floorPlan).toBe("fp_1");
    expect(v.tagIds).toEqual(["t1", "t2"]);
  });

  it("rejects a visit with a missing/non-string id (required key)", () => {
    expect(visitSchema.safeParse({}).success).toBe(false);
    expect(visitSchema.safeParse({ id: 1 }).success).toBe(false);
  });
});

describe("categorySchema defaults", () => {
  it("fills weight=0 and items=[] from a bare { id }", () => {
    const c = categorySchema.parse({ id: "c1" });
    expect(c).toEqual({ id: "c1", name: "", weight: 0, items: [] });
  });

  it("recovers a non-string name and a non-number weight via .catch", () => {
    const c = categorySchema.parse({ id: "c1", name: { x: 1 }, weight: "heavy" });
    expect(c.name).toBe("");
    expect(c.weight).toBe(0);
  });

  it("recovers a corrupt items array to []", () => {
    const c = categorySchema.parse({ id: "c1", items: "nope" });
    expect(c.items).toEqual([]);
  });

  it("rejects a category with no id", () => {
    expect(categorySchema.safeParse({ name: "x" }).success).toBe(false);
  });
});

describe("parsePersisted", () => {
  it("returns a fully-populated PersistedData for a valid object", () => {
    const data = parsePersisted({
      categories: [{ id: "c1", name: "Kitchen", weight: 50, items: [] }],
      visits: [{ id: "v1", name: "Flat" }],
      tags: [{ id: "t1", name: "fav", color: "#fff" }],
      redFlags: ["mold", "noise"],
    });
    expect(data).not.toBeNull();
    expect(data?.categories).toHaveLength(1);
    expect(data?.categories[0]).toEqual({
      id: "c1",
      name: "Kitchen",
      weight: 50,
      items: [],
    });
    expect(data?.visits).toHaveLength(1);
    expect(data?.visits[0].id).toBe("v1");
    expect(data?.tags).toEqual([{ id: "t1", name: "fav", color: "#fff" }]);
    expect(data?.redFlags).toEqual(["mold", "noise"]);
  });

  it("returns null when there is no `categories` key", () => {
    expect(parsePersisted({ visits: [], tags: [] })).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parsePersisted(null)).toBeNull();
    expect(parsePersisted(undefined)).toBeNull();
    expect(parsePersisted("str")).toBeNull();
    expect(parsePersisted(42)).toBeNull();
    expect(parsePersisted([{ id: "c1" }])).toBeNull(); // arrays are not records
  });

  it("accepts an object whose `categories` is present but corrupt (→ [])", () => {
    const data = parsePersisted({ categories: "broken" });
    expect(data).not.toBeNull();
    expect(data?.categories).toEqual([]);
    expect(data?.visits).toEqual([]);
    expect(data?.tags).toEqual([]);
    expect(data?.redFlags).toEqual([]);
  });

  it("drops a bad category element but keeps the good ones (element resilience)", () => {
    const data = parsePersisted({
      categories: [
        { id: "c1", name: "Good", weight: 10, items: [] },
        { name: "no id — dropped" },
        { id: "c2", name: "Also good", weight: 20, items: [] },
      ],
    });
    expect(data?.categories.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("drops a bad visit element but keeps the good ones", () => {
    const data = parsePersisted({
      categories: [],
      visits: [{ id: "v1" }, { name: "no id" }, { id: "v2" }],
    });
    expect(data?.visits.map((v) => v.id)).toEqual(["v1", "v2"]);
  });

  it("filters non-string redFlags", () => {
    const data = parsePersisted({
      categories: [],
      redFlags: ["a", 1, "b", null, "c"],
    });
    expect(data?.redFlags).toEqual(["a", "b", "c"]);
  });

  it("applies field-level .catch so a category with a non-string name still parses (name='')", () => {
    const data = parsePersisted({
      categories: [{ id: "c1", name: 999, weight: 5, items: [] }],
    });
    expect(data?.categories).toHaveLength(1);
    expect(data?.categories[0].name).toBe("");
  });
});

describe("parseImportFile", () => {
  const RU_MESSAGE = "Неверный файл: нет данных визитов или чек-листа.";

  it("parses a valid export", () => {
    const data = parseImportFile({
      categories: [{ id: "c1", name: "Bath", weight: 100, items: [] }],
      visits: [{ id: "v1", name: "Flat" }],
      tags: [{ id: "t1", name: "fav", color: "#abc" }],
      redFlags: ["damp"],
    });
    expect(data.categories.map((c) => c.id)).toEqual(["c1"]);
    expect(data.visits.map((v) => v.id)).toEqual(["v1"]);
    expect(data.tags).toEqual([{ id: "t1", name: "fav", color: "#abc" }]);
    expect(data.redFlags).toEqual(["damp"]);
  });

  it("throws the RU message when the input is not an object", () => {
    expect(() => parseImportFile(null)).toThrow(RU_MESSAGE);
    expect(() => parseImportFile("str")).toThrow(RU_MESSAGE);
    expect(() => parseImportFile(42)).toThrow(RU_MESSAGE);
    expect(() => parseImportFile([])).toThrow(RU_MESSAGE);
  });

  it("throws the RU message when visits is not an array", () => {
    expect(() => parseImportFile({ categories: [], visits: "nope" })).toThrow(RU_MESSAGE);
  });

  it("throws the RU message when categories is not an array", () => {
    expect(() => parseImportFile({ categories: {}, visits: [] })).toThrow(RU_MESSAGE);
  });

  it("throws the RU message when either array key is missing", () => {
    expect(() => parseImportFile({ visits: [] })).toThrow(RU_MESSAGE);
    expect(() => parseImportFile({ categories: [] })).toThrow(RU_MESSAGE);
  });

  it("accepts empty (but present) visits and categories arrays", () => {
    const data = parseImportFile({ categories: [], visits: [] });
    expect(data).toEqual({ categories: [], visits: [], tags: [], redFlags: [] });
  });

  it("parses tags/redFlags and filters non-strings out of redFlags", () => {
    const data = parseImportFile({
      categories: [],
      visits: [],
      tags: [{ id: "t1", name: "x", color: "#000" }, { name: "no id — dropped" }],
      redFlags: ["a", 5, "b", {}, "c"],
    });
    expect(data.tags.map((t) => t.id)).toEqual(["t1"]);
    expect(data.redFlags).toEqual(["a", "b", "c"]);
  });

  it("drops a corrupt visit element while parsing the rest", () => {
    const data = parseImportFile({
      categories: [],
      visits: [{ id: "v1" }, { id: 2 }, { id: "v3" }],
    });
    expect(data.visits.map((v) => v.id)).toEqual(["v1", "v3"]);
  });
});
