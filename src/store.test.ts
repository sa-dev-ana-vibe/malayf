import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type * as StoreModule from "./store";

// The store is a module singleton that loads its state at import time, so each
// test gets a FRESH module (reset modules + cleared storage) for isolation.
async function freshStore(): Promise<typeof StoreModule> {
  vi.resetModules();
  localStorage.clear();
  return import("./store");
}

beforeEach(() => {
  vi.stubGlobal("confirm", () => true); // auto-accept delete confirmations
  vi.stubGlobal("alert", () => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("visit lifecycle", () => {
  it("newVisit prepends a visit and opens it in the detail screen", async () => {
    const store = await freshStore();
    const { result } = renderHook(() => store.useApp());
    act(() => store.actions.newVisit());
    expect(result.current.visits).toHaveLength(1);
    expect(result.current.screen).toBe("detail");
    expect(result.current.activeVisitId).toBe(result.current.visits[0].id);
  });

  it("setResult toggles an answer off when set to the same value", async () => {
    const store = await freshStore();
    const { result } = renderHook(() => store.useApp());
    act(() => store.actions.newVisit());
    const itemId = result.current.categories[0].items[0].id;
    act(() => store.actions.setResult(itemId, "pass"));
    expect(result.current.visits[0].results[itemId]).toBe("pass");
    act(() => store.actions.setResult(itemId, "pass"));
    expect(result.current.visits[0].results[itemId]).toBeUndefined();
  });
});

describe("cascade deletes (the load-bearing ones QA flagged)", () => {
  it("deleteTag removes the tag from every visit's tagIds", async () => {
    const store = await freshStore();
    const { result } = renderHook(() => store.useApp());
    act(() => store.actions.newVisit());
    const tagId = result.current.tags[0].id;
    act(() => store.actions.toggleVisitTag(tagId));
    expect(result.current.visits[0].tagIds).toContain(tagId);

    act(() => store.actions.deleteTag(tagId));
    expect(result.current.tags.find((t) => t.id === tagId)).toBeUndefined();
    expect(result.current.visits[0].tagIds).not.toContain(tagId);
  });

  it("deleteRedFlag removes the label from every visit", async () => {
    const store = await freshStore();
    const { result } = renderHook(() => store.useApp());
    act(() => store.actions.newVisit());
    const label = result.current.redFlagDefs[0];
    act(() => store.actions.toggleRedFlag(label));
    expect(result.current.visits[0].redFlags).toContain(label);

    act(() => store.actions.deleteRedFlag(0));
    expect(result.current.redFlagDefs).not.toContain(label);
    expect(result.current.visits[0].redFlags).not.toContain(label);
  });

  it("renameRedFlag renames the label everywhere it is used", async () => {
    const store = await freshStore();
    const { result } = renderHook(() => store.useApp());
    act(() => store.actions.newVisit());
    const label = result.current.redFlagDefs[0];
    act(() => store.actions.toggleRedFlag(label));

    act(() => store.actions.renameRedFlag(0, "Renamed flag"));
    expect(result.current.redFlagDefs[0]).toBe("Renamed flag");
    expect(result.current.visits[0].redFlags).toContain("Renamed flag");
    expect(result.current.visits[0].redFlags).not.toContain(label);
  });

  it("deleteVisit also drops it from the compare selection", async () => {
    const store = await freshStore();
    const { result } = renderHook(() => store.useApp());
    act(() => store.actions.newVisit());
    const id = result.current.visits[0].id;
    act(() => store.actions.toggleCompare(id));
    expect(result.current.compareIds).toContain(id);

    act(() => store.actions.deleteVisit(id));
    expect(result.current.visits).toHaveLength(0);
    expect(result.current.compareIds).not.toContain(id);
  });
});

describe("checklist weights", () => {
  it("setCatWeight keeps the total at 100", async () => {
    const store = await freshStore();
    const { result } = renderHook(() => store.useApp());
    const first = result.current.categories[0].id;
    act(() => store.actions.setCatWeight(first, "55"));
    const total = result.current.categories.reduce((n, c) => n + c.weight, 0);
    expect(total).toBe(100);
    expect(result.current.categories.find((c) => c.id === first)?.weight).toBe(55);
  });
});

describe("persistence", () => {
  it("writes new visits to localStorage", async () => {
    const store = await freshStore();
    act(() => store.actions.newVisit());
    const raw = localStorage.getItem("aptcheck_v1");
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw ?? "{}") as { visits: unknown[] };
    expect(data.visits).toHaveLength(1);
  });
});
