import type { Visit } from "../types";

/** Unique id — same scheme as the prototype. */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** "5500000" → "5 500 000" (digits only, grouped by 3 with spaces). */
export function formatThousands(str: string | number | null | undefined): string {
  const digits = String(str ?? "").replace(/\D/g, "");
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
}

export function normalizeUrl(u: string): string {
  if (!u) return "#";
  return /^https?:\/\//i.test(u) ? u : "https://" + u;
}

export function prettyHost(u: string): string {
  if (!u) return "";
  try {
    return new URL(normalizeUrl(u)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function contactHref(val: string): string {
  if (!val) return "#";
  return val.includes("@") ? "mailto:" + val.trim() : "tel:" + val.replace(/[^\d+]/g, "");
}

export function hexToRgba(hex: string, a: number): string {
  let h = (hex || "#6a35d9").replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

/** ISO yyyy-mm-dd → "Jun 23" (en-US, short month + numeric day). */
export function fmtDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

// ── numeric parsing used by sort + ppm calculations ──────────────────────

export function numPrice(v: Visit): number | null {
  const n = parseFloat(String(v.price || "").replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
}

export function numArea(v: Visit): number | null {
  const n = parseFloat(
    String(v.areaTotal || "")
      .replace(/[^\d.,]/g, "")
      .replace(",", "."),
  );
  return isNaN(n) ? null : n;
}

export function numPpm(v: Visit): number | null {
  const p = numPrice(v);
  const a = numArea(v);
  return p && a ? p / a : null;
}

export function cmpNullsLast(
  a: number | null,
  b: number | null,
  dir: "asc" | "desc",
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

// ── visit date helpers ───────────────────────────────────────────────────

export function visitDates(v: Visit): string[] {
  if (v.dates.length) return v.dates;
  if (v.date) return [v.date];
  return [];
}

export function latestDate(v: Visit): string | null {
  const d = visitDates(v).filter(Boolean);
  if (!d.length) return null;
  return d.slice().sort().reverse()[0];
}

/** "5500000" → "5,5kk" (millions, comma decimal); "" when not a positive number. */
export function priceMillions(price: string): string {
  const vp = parseFloat(String(price || "").replace(/[^\d.]/g, ""));
  return vp > 0
    ? (Math.round((vp / 1e6) * 100) / 100).toString().replace(".", ",") + "kk"
    : "";
}

/** Russian-locale thousands grouping (non-breaking spaces), rounded. */
export function fmtRu(n: number | null): string {
  return n == null ? "" : Math.round(n).toLocaleString("ru-RU");
}

export function mapsHref(address: string): string {
  return address ? "https://2gis.ru/search/" + encodeURIComponent(address) : "#";
}
