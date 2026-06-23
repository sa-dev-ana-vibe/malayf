// ─────────────────────────────────────────────────────────────────────────
// The data model lives here as Zod schemas (single source of truth), with the
// domain types DERIVED via z.infer — so the runtime shape and the compile-time
// type can never drift (FRONTEND_QUALITY §1). localStorage and imported JSON
// are untrusted boundaries, so they are PARSED here, never `as`-cast (§2).
//
// Field-level `.catch(default)` keeps partial corruption from discarding a
// whole record; element-level parsing (parseArray) keeps one bad item from
// discarding the whole collection.
// ─────────────────────────────────────────────────────────────────────────

import { z } from "zod";

export const itemTypeSchema = z.enum(["ternary", "stars", "select"]);
export type ItemType = z.infer<typeof itemTypeSchema>;

/**
 * A stored answer: a number (stars 1–5) or a string (ternary result / option id).
 * Deliberately a loose union — the discriminant for an answer is the *item's*
 * type (looked up by item id elsewhere), not the answer itself, so a tighter
 * per-item discriminated union can't be expressed at this key. itemScore() is
 * the single place that interprets a value against its item's type.
 */
export const resultValueSchema = z.union([z.number(), z.string()]);
export type ResultValue = z.infer<typeof resultValueSchema>;

/** Ternary answers — a named subset of the string results, used by the UI. */
export type TernaryResult = "pass" | "fail" | "na";

export const selectOptionSchema = z.object({
  id: z.string(),
  label: z.string().catch(""),
  value: z.string().catch(""),
});
export type SelectOption = z.infer<typeof selectOptionSchema>;

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string().catch(""),
  type: itemTypeSchema.optional(),
  options: z.array(selectOptionSchema).optional(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().catch(""),
  weight: z.number().catch(0),
  items: z.array(checklistItemSchema).catch([]),
});
export type Category = z.infer<typeof categorySchema>;

export const tagSchema = z.object({
  id: z.string(),
  name: z.string().catch(""),
  color: z.string().catch("#6a35d9"),
});
export type Tag = z.infer<typeof tagSchema>;

export const listingLinkSchema = z.object({
  id: z.string(),
  label: z.string().catch(""),
  url: z.string().catch(""),
});
export type ListingLink = z.infer<typeof listingLinkSchema>;

export const contactSchema = z.object({
  id: z.string(),
  name: z.string().catch(""),
  value: z.string().catch(""),
});
export type Contact = z.infer<typeof contactSchema>;

export const visitSchema = z.object({
  id: z.string(),
  name: z.string().catch(""),
  address: z.string().catch(""),
  dates: z.array(z.string()).catch([]),
  /** legacy single-date field from older prototype exports */
  date: z.string().optional(),
  results: z.record(z.string(), resultValueSchema).catch({}),
  notes: z.string().catch(""),
  /** photo references — IndexedDB ids when persisted, data-URLs inside an export */
  photos: z.array(z.string()).catch([]),
  floorPlan: z.string().nullable().catch(null),
  links: z.array(listingLinkSchema).catch([]),
  contacts: z.array(contactSchema).catch([]),
  tagIds: z.array(z.string()).catch([]),
  redFlags: z.array(z.string()).catch([]),
  price: z.string().catch(""),
  areaTotal: z.string().catch(""),
  areaLiving: z.string().catch(""),
  floor: z.string().catch(""),
  floorsTotal: z.string().catch(""),
  houseType: z.string().catch(""),
  yearBuilt: z.string().catch(""),
  invLive: z.string().catch("").optional(),
  invGood: z.string().catch("").optional(),
});
export type Visit = z.infer<typeof visitSchema>;

export interface PersistedData {
  categories: Category[];
  visits: Visit[];
  tags: Tag[];
  redFlags: string[];
}

// ── boundary parsing ─────────────────────────────────────────────────────

/** Parse JSON text into `unknown` (never `any`), so callers must narrow it. */
export function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

// Each collection is parsed element-by-element (a single bad item is dropped,
// not the whole array). Specialized per schema so each `r.data` is the concrete
// output type — no `any` leaks in from a generic parameter.

export function parseCategories(arr: unknown): Category[] {
  if (!Array.isArray(arr)) return [];
  const out: Category[] = [];
  for (const el of arr) {
    const r = categorySchema.safeParse(el);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function parseVisits(arr: unknown): Visit[] {
  if (!Array.isArray(arr)) return [];
  const out: Visit[] = [];
  for (const el of arr) {
    const r = visitSchema.safeParse(el);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function parseTags(arr: unknown): Tag[] {
  if (!Array.isArray(arr)) return [];
  const out: Tag[] = [];
  for (const el of arr) {
    const r = tagSchema.safeParse(el);
    if (r.success) out.push(r.data);
  }
  return out;
}

export const parseStringArray = (arr: unknown): string[] =>
  Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

/**
 * Best-effort parse of persisted localStorage data. Returns null when there is
 * no usable object (the caller then seeds defaults), mirroring the prototype's
 * `!data || !data.categories` check.
 */
export function parsePersisted(raw: unknown): PersistedData | null {
  const o = asRecord(raw);
  if (!o || !("categories" in o)) return null;
  return {
    categories: parseCategories(o.categories),
    visits: parseVisits(o.visits),
    tags: parseTags(o.tags),
    redFlags: parseStringArray(o.redFlags),
  };
}

/**
 * Parse an import file. Throws a user-facing message when it isn't a valid
 * export (no visits/categories arrays) — the §2 "surface failures" path.
 */
export function parseImportFile(raw: unknown): PersistedData {
  const o = asRecord(raw);
  if (!o || !Array.isArray(o.visits) || !Array.isArray(o.categories)) {
    throw new Error("Неверный файл: нет данных визитов или чек-листа.");
  }
  return {
    categories: parseCategories(o.categories),
    visits: parseVisits(o.visits),
    tags: parseTags(o.tags),
    redFlags: parseStringArray(o.redFlags),
  };
}

// ── LLM-listing contract (for the "copy prompt" feature) ──────────────────
// The shape an LLM should emit for ADDITIVE import. Intentionally a clean
// subset of a visit — no ids/photos/results (the app assigns ids and leaves the
// rest empty). The .describe() texts become the JSON-Schema descriptions in the
// generated prompt, so this stays the single source of truth for that contract.

export const HOUSE_TYPES = [
  "Панельный",
  "Кирпичный",
  "Монолит",
  "Монолитно-кирпичный",
  "Блочный",
  "Деревянный",
] as const;

export const listingSchema = z
  .object({
    name: z.string().describe("Краткое название квартиры, напр. «2-комн. у парка»"),
    address: z.string().describe("Улица, дом, город").optional(),
    price: z.string().describe("Цена — только цифры строкой, напр. «5500000»").optional(),
    areaTotal: z
      .string()
      .describe("Общая площадь, м² (строка), напр. «54» или «54.3»")
      .optional(),
    areaLiving: z.string().describe("Жилая площадь, м² (строка)").optional(),
    floor: z.string().describe("Этаж (строка)").optional(),
    floorsTotal: z.string().describe("Этажей в доме (строка)").optional(),
    yearBuilt: z.string().describe("Год постройки (строка)").optional(),
    houseType: z.enum(HOUSE_TYPES).describe("Тип дома — одно из значений").optional(),
    notes: z.string().describe("Заметки: ощущения, соседи, что-то необычное").optional(),
    links: z
      .array(
        z.object({
          label: z.string().describe("Название источника, напр. «Avito»").optional(),
          url: z.string().describe("Ссылка на объявление"),
        }),
      )
      .describe("Ссылки на объявления (Avito, Cian, Idealista…)")
      .optional(),
    contacts: z
      .array(
        z.object({
          name: z.string().describe("Имя/роль, напр. «Владелец», «Агент»").optional(),
          value: z.string().describe("Телефон или email"),
        }),
      )
      .describe("Контакты")
      .optional(),
    dates: z
      .array(z.string())
      .describe("Даты визитов в формате ISO yyyy-mm-dd")
      .optional(),
  })
  .describe("Одна квартира для добавления в MALAYF");
