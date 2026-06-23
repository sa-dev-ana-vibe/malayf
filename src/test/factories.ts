import type { Category, ChecklistItem, Tag, Visit } from "../types";

let n = 0;
/** Deterministic ids for tests (no Date.now/random). */
export const testId = (prefix = "id") => `${prefix}_${++n}`;

export function makeVisit(partial: Partial<Visit> = {}): Visit {
  return {
    id: testId("v"),
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
    ...partial,
  };
}

export function makeItem(partial: Partial<ChecklistItem> = {}): ChecklistItem {
  return { id: testId("it"), text: "Item", type: "ternary", ...partial };
}

export function makeCategory(partial: Partial<Category> = {}): Category {
  return {
    id: testId("cat"),
    name: "Category",
    weight: 0,
    items: [],
    ...partial,
  };
}

export function makeTag(partial: Partial<Tag> = {}): Tag {
  return { id: testId("tag"), name: "Tag", color: "#6a35d9", ...partial };
}
