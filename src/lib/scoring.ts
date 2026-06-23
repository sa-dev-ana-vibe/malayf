import type {
  Category,
  CatScore,
  ChecklistItem,
  ItemType,
  Visit,
  VisitScore,
} from "../types";

/** Normalize an item's type — unknown/absent falls back to "ternary". */
export function itemType(it: ChecklistItem): ItemType {
  return it.type === "stars" || it.type === "select" ? it.type : "ternary";
}

/**
 * Returns a 0–100 score for an answered item, or null if unrated / N-A.
 * Exact port of the prototype's itemScore.
 */
export function itemScore(v: Visit, it: ChecklistItem): number | null {
  const r = v.results[it.id];
  const type = itemType(it);
  if (type === "stars") {
    const n = Number(r);
    if (!n) return null;
    return (Math.max(0, Math.min(5, n)) / 5) * 100;
  }
  if (type === "select") {
    if (r == null || r === "") return null;
    const opt = (it.options ?? []).find((o) => o.id === r);
    if (!opt) return null;
    return Math.max(0, Math.min(100, Number(opt.value) || 0));
  }
  if (r === "pass") return 100;
  if (r === "fail") return 0;
  return null;
}

/** Whole-visit tally across every category's items. */
export function scoreVisit(categories: Category[], v: Visit): VisitScore {
  let pass = 0,
    fail = 0,
    na = 0,
    total = 0,
    sum = 0,
    rated = 0;
  categories.forEach((c) =>
    c.items.forEach((it) => {
      total++;
      const sc = itemScore(v, it);
      if (sc == null) {
        if (v.results[it.id] === "na") na++;
      } else {
        rated++;
        sum += sc;
        if (sc >= 60) pass++;
        else fail++;
      }
    }),
  );
  return { pass, fail, na, total, answered: rated, pct: rated ? Math.round(sum / rated) : 0 };
}

/** Per-category tally. */
export function catScore(v: Visit, cat: Category): CatScore {
  let strong = 0,
    weak = 0,
    sum = 0,
    rated = 0;
  cat.items.forEach((it) => {
    const sc = itemScore(v, it);
    if (sc != null) {
      rated++;
      sum += sc;
      if (sc >= 60) strong++;
      else weak++;
    }
  });
  return {
    strong,
    weak,
    pass: strong, // alias of `strong`, kept so call sites can read `cs.pass`
    answered: rated,
    total: cat.items.length,
    pct: rated ? Math.round(sum / rated) : 0,
  };
}

/** Weighted overall score (0–100) across answered categories, or null. */
export function weightedScore(categories: Category[], v: Visit): number | null {
  const totalW = categories.reduce((n, c) => n + (Number(c.weight) || 0), 0);
  let wsum = 0,
    acc = 0,
    any = false;
  categories.forEach((cat) => {
    const cs = catScore(v, cat);
    if (cs.answered > 0) {
      any = true;
      const w = totalW > 0 ? Number(cat.weight) || 0 : 1;
      wsum += w;
      acc += w * cs.pct;
    }
  });
  if (!any || wsum === 0) return null;
  return Math.round(acc / wsum);
}

/** Score → traffic-light color. null/grey, ≥70 green, ≥45 amber, else red. */
export function colorFor(pct: number | null): string {
  if (pct == null) return "#9b97a6";
  return pct >= 70 ? "#1f9d63" : pct >= 45 ? "#c08410" : "#d6453f";
}

// ── Category-weight balancing (Settings editor) ──────────────────────────

/**
 * Re-round category weights to integers that sum to exactly 100, keeping the
 * just-edited category locked at its value. Exact port of roundWeights.
 */
export function roundWeights(
  cats: Category[],
  lockedId: string,
  lockedVal: number,
): Category[] {
  const arr = cats.map((c) => ({
    ...c,
    weight: c.id === lockedId ? lockedVal : Math.max(0, Math.round(c.weight)),
  }));
  let diff = 100 - arr.reduce((n, c) => n + c.weight, 0);
  const idxs = arr
    .map((_, i) => i)
    .filter((i) => arr[i].id !== lockedId)
    .sort((a, b) => arr[b].weight - arr[a].weight);
  let k = 0;
  while (diff !== 0 && idxs.length && k < 5000) {
    const i = idxs[k % idxs.length];
    const step = diff > 0 ? 1 : -1;
    if (arr[i].weight + step >= 0) {
      arr[i].weight += step;
      diff -= step;
    }
    k++;
  }
  return arr;
}

/** Set one category's weight and proportionally rebalance the rest to 100. */
export function setCatWeightInList(
  cats: Category[],
  id: string,
  val: string | number,
): Category[] {
  const target = Math.max(0, Math.min(100, parseInt(String(val), 10) || 0));
  if (cats.length === 1) return cats.map((c) => ({ ...c, weight: 100 }));
  const others = cats.filter((c) => c.id !== id);
  const otherSum = others.reduce((n, c) => n + (Number(c.weight) || 0), 0);
  const remaining = 100 - target;
  const arr = cats.map((c) => {
    if (c.id === id) return { ...c, weight: target };
    const w = Number(c.weight) || 0;
    const nw = otherSum > 0 ? remaining * (w / otherSum) : remaining / others.length;
    return { ...c, weight: nw };
  });
  return roundWeights(arr, id, target);
}

/** Even split that still sums to exactly 100 (remainder spread over the first N). */
export function distributeWeightsInList(cats: Category[]): Category[] {
  const n = cats.length;
  if (!n) return cats;
  const base = Math.floor(100 / n);
  const rem = 100 - base * n;
  return cats.map((c, i) => ({ ...c, weight: base + (i < rem ? 1 : 0) }));
}
