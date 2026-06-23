// ─────────────────────────────────────────────────────────────────────────
// Domain data types are DERIVED from the Zod schemas in lib/schema.ts (one
// source of truth — see FRONTEND_QUALITY §1). This file re-exports them and
// adds the types that never cross a trust boundary: UI/navigation state and
// derived scoring shapes.
//
// Photo storage note: a visit's `photos`/`floorPlan` hold IndexedDB photo ids
// (see lib/photoStore.ts), not base64 — localStorage's ~5 MB cap can't hold
// photos. Inside an export file the same fields hold data-URLs for portability.
// ─────────────────────────────────────────────────────────────────────────

export type {
  ItemType,
  ResultValue,
  TernaryResult,
  SelectOption,
  ChecklistItem,
  Category,
  Tag,
  ListingLink,
  Contact,
  Visit,
  PersistedData,
} from "./lib/schema";

import type { Category, Tag, Visit } from "./lib/schema";

/** A portable export file — photos inlined as data-URLs (built, not parsed). */
export interface ExportFile {
  app: "aptcheck";
  version: number;
  exportedAt: string;
  categories: Category[];
  visits: Visit[]; // photos here are data-URLs, not ids
  tags: Tag[];
  redFlags: string[];
}

export type Screen =
  | "visits"
  | "compare"
  | "checklist"
  | "tags"
  | "redflags"
  | "detail";

export type SortBy = "default" | "rating" | "price" | "ppm" | "area" | "date";

/** Transient UI state — NOT persisted (mirrors the prototype's component state). */
export interface UiState {
  screen: Screen;
  activeVisitId: string | null;
  compareIds: string[];
  tagFilter: string[];
  sortBy: SortBy;
  tagsFrom: Screen; // screen to return to from the tags/redflags editors
  editLinkId: string | null;
}

export interface AppState extends UiState {
  categories: Category[];
  visits: Visit[];
  tags: Tag[];
  // The master catalog of red-flag labels. Named `redFlagDefs` to distinguish
  // it from a visit's `redFlags` (the subset selected on that visit). Persisted
  // under the key `redFlags` (PersistedData/ExportFile) for export-file compat.
  redFlagDefs: string[];
}

// ── derived scoring shapes ───────────────────────────────────────────────

export interface VisitScore {
  pass: number;
  fail: number;
  na: number;
  total: number;
  answered: number;
  pct: number;
}

export interface CatScore {
  strong: number;
  weak: number;
  pass: number;
  answered: number;
  total: number;
  pct: number;
}
