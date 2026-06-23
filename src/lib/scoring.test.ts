import { describe, expect, it } from "vitest";
import {
  catScore,
  colorFor,
  distributeWeightsInList,
  itemScore,
  itemType,
  roundWeights,
  scoreVisit,
  setCatWeightInList,
  weightedScore,
} from "./scoring";
import { makeCategory, makeItem, makeVisit } from "../test/factories";

describe("itemType", () => {
  it("defaults unknown/absent types to ternary", () => {
    expect(itemType(makeItem({ type: undefined }))).toBe("ternary");
    expect(itemType(makeItem({ type: "stars" }))).toBe("stars");
    expect(itemType(makeItem({ type: "select" }))).toBe("select");
  });
});

describe("itemScore", () => {
  it("scores ternary pass=100, fail=0, unrated/na=null", () => {
    const it1 = makeItem({ type: "ternary" });
    expect(itemScore(makeVisit({ results: { [it1.id]: "pass" } }), it1)).toBe(100);
    expect(itemScore(makeVisit({ results: { [it1.id]: "fail" } }), it1)).toBe(0);
    expect(itemScore(makeVisit({ results: { [it1.id]: "na" } }), it1)).toBeNull();
    expect(itemScore(makeVisit(), it1)).toBeNull();
  });

  it("scores stars as n/5*100, 0/unset = null", () => {
    const star = makeItem({ type: "stars" });
    expect(itemScore(makeVisit({ results: { [star.id]: 5 } }), star)).toBe(100);
    expect(itemScore(makeVisit({ results: { [star.id]: 3 } }), star)).toBe(60);
    expect(itemScore(makeVisit({ results: { [star.id]: 1 } }), star)).toBe(20);
    expect(itemScore(makeVisit(), star)).toBeNull();
  });

  it("scores select by the chosen option's clamped value", () => {
    const sel = makeItem({
      type: "select",
      options: [
        { id: "o1", label: "Great", value: "100" },
        { id: "o2", label: "Meh", value: "40" },
        { id: "o3", label: "Over", value: "250" },
      ],
    });
    expect(itemScore(makeVisit({ results: { [sel.id]: "o1" } }), sel)).toBe(100);
    expect(itemScore(makeVisit({ results: { [sel.id]: "o2" } }), sel)).toBe(40);
    expect(itemScore(makeVisit({ results: { [sel.id]: "o3" } }), sel)).toBe(100); // clamped
    expect(itemScore(makeVisit({ results: { [sel.id]: "missing" } }), sel)).toBeNull();
    expect(itemScore(makeVisit(), sel)).toBeNull();
  });
});

describe("scoreVisit", () => {
  it("counts pass(>=60)/fail/na and averages only rated items", () => {
    const a = makeItem({ type: "ternary" });
    const b = makeItem({ type: "ternary" });
    const c = makeItem({ type: "stars" });
    const d = makeItem({ type: "ternary" });
    const cat = makeCategory({ items: [a, b, c, d] });
    const v = makeVisit({
      results: { [a.id]: "pass", [b.id]: "fail", [c.id]: 4, [d.id]: "na" },
    });
    const sc = scoreVisit([cat], v);
    expect(sc.total).toBe(4);
    expect(sc.answered).toBe(3); // na excluded from rated
    expect(sc.na).toBe(1);
    expect(sc.pass).toBe(2); // 100 and 80 (4 stars) are >=60
    expect(sc.fail).toBe(1); // the 0
    expect(sc.pct).toBe(Math.round((100 + 0 + 80) / 3));
  });

  it("is all-zero / pct 0 when nothing is rated", () => {
    const a = makeItem();
    const sc = scoreVisit([makeCategory({ items: [a] })], makeVisit());
    expect(sc).toEqual({ pass: 0, fail: 0, na: 0, total: 1, answered: 0, pct: 0 });
  });
});

describe("catScore", () => {
  it("aliases pass to strong and averages rated only", () => {
    const a = makeItem({ type: "ternary" });
    const b = makeItem({ type: "ternary" });
    const cat = makeCategory({ items: [a, b] });
    const cs = catScore(makeVisit({ results: { [a.id]: "pass" } }), cat);
    expect(cs.answered).toBe(1);
    expect(cs.total).toBe(2);
    expect(cs.strong).toBe(1);
    expect(cs.pass).toBe(cs.strong);
    expect(cs.pct).toBe(100);
  });
});

describe("weightedScore", () => {
  it("weights category pcts and returns null when nothing answered", () => {
    const a = makeItem({ type: "ternary" });
    const b = makeItem({ type: "ternary" });
    const c1 = makeCategory({ weight: 70, items: [a] });
    const c2 = makeCategory({ weight: 30, items: [b] });
    expect(weightedScore([c1, c2], makeVisit())).toBeNull();
    // c1 = 100%, c2 = 0% → 0.7*100 + 0.3*0 = 70
    const v = makeVisit({ results: { [a.id]: "pass", [b.id]: "fail" } });
    expect(weightedScore([c1, c2], v)).toBe(70);
  });

  it("falls back to equal weights when total weight is 0", () => {
    const a = makeItem({ type: "ternary" });
    const b = makeItem({ type: "ternary" });
    const c1 = makeCategory({ weight: 0, items: [a] });
    const c2 = makeCategory({ weight: 0, items: [b] });
    const v = makeVisit({ results: { [a.id]: "pass", [b.id]: "fail" } });
    expect(weightedScore([c1, c2], v)).toBe(50);
  });

  it("ignores categories with no answered items in the weighting", () => {
    const a = makeItem({ type: "ternary" });
    const b = makeItem({ type: "ternary" });
    const c1 = makeCategory({ weight: 70, items: [a] });
    const c2 = makeCategory({ weight: 30, items: [b] }); // unanswered
    const v = makeVisit({ results: { [a.id]: "fail" } });
    expect(weightedScore([c1, c2], v)).toBe(0); // only c1 counts
  });
});

describe("colorFor", () => {
  it("maps score to traffic-light colors", () => {
    expect(colorFor(null)).toBe("#9b97a6");
    expect(colorFor(70)).toBe("#1f9d63");
    expect(colorFor(69)).toBe("#c08410");
    expect(colorFor(45)).toBe("#c08410");
    expect(colorFor(44)).toBe("#d6453f");
  });
});

describe("weight balancing", () => {
  const sum = (cs: { weight: number }[]) => cs.reduce((n, c) => n + c.weight, 0);

  it("setCatWeightInList locks the edited weight and rebalances to 100", () => {
    const cats = [
      makeCategory({ weight: 40 }),
      makeCategory({ weight: 30 }),
      makeCategory({ weight: 30 }),
    ];
    const out = setCatWeightInList(cats, cats[0].id, 60);
    expect(out.find((c) => c.id === cats[0].id)?.weight).toBe(60);
    expect(sum(out)).toBe(100);
  });

  it("setCatWeightInList forces a single category to 100", () => {
    const cats = [makeCategory({ weight: 40 })];
    expect(setCatWeightInList(cats, cats[0].id, 10)[0].weight).toBe(100);
  });

  it("roundWeights always sums to exactly 100", () => {
    const cats = [
      makeCategory({ weight: 33.3 }),
      makeCategory({ weight: 33.3 }),
      makeCategory({ weight: 33.3 }),
    ];
    expect(sum(roundWeights(cats, cats[0].id, 34))).toBe(100);
  });

  it("distributeWeightsInList spreads evenly and sums to 100", () => {
    const cats = [makeCategory(), makeCategory(), makeCategory()];
    const out = distributeWeightsInList(cats);
    expect(sum(out)).toBe(100);
    expect(out.map((c) => c.weight)).toEqual([34, 33, 33]);
  });
});
