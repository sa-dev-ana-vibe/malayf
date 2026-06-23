// ─────────────────────────────────────────────────────────────────────────
// Runtime-computed inline styles (tag colors, score colors, weight bars …).
// These depend on data values, so they can't be static Tailwind classes —
// ported verbatim from the prototype's helper methods. Static chrome uses
// Tailwind utilities in the components themselves.
// ─────────────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import type { CatScore } from "../types";
import { hexToRgba } from "../lib/format";

export const ACCENT = "#6a35d9";
export const ACCENT_SOFT = "#f1ecfb";

export function tagChip(color: string, active: boolean, sm: boolean): CSSProperties {
  const pad = sm ? "2px 8px" : "6px 12px";
  const fs = sm ? "10.5px" : "12px";
  if (active)
    return {
      padding: pad,
      borderRadius: "20px",
      fontSize: fs,
      fontWeight: 700,
      cursor: sm ? "default" : "pointer",
      whiteSpace: "nowrap",
      border: "1px solid " + color,
      background: color,
      color: "#fff",
    };
  return {
    padding: pad,
    borderRadius: "20px",
    fontSize: fs,
    fontWeight: 600,
    cursor: sm ? "default" : "pointer",
    whiteSpace: "nowrap",
    border: "1px solid " + hexToRgba(color, 0.45),
    background: hexToRgba(color, 0.12),
    color: color,
  };
}

export function redFlagChip(active: boolean): CSSProperties {
  if (active)
    return {
      padding: "6px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 700,
      cursor: "pointer",
      whiteSpace: "nowrap",
      border: "1px solid #d6453f",
      background: "#d6453f",
      color: "#fff",
    };
  return {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    border: "1px solid #e6cfce",
    background: "#fff",
    color: "#b2726d",
  };
}

export function btnStyle(active: boolean, kind: "pass" | "fail" | "na"): CSSProperties {
  const base: CSSProperties = {
    flex: "1",
    padding: "9px 0",
    fontSize: "12px",
    fontWeight: 700,
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "7px",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const c = kind === "pass" ? "#1f9d63" : kind === "fail" ? "#d6453f" : "#7c7889";
  if (active) return { ...base, background: c, color: "#fff", borderColor: c };
  return { ...base, background: "#fff", color: "#a39fae", borderColor: "#e6e3ee" };
}

/** N/A pill for stars & select items (distinct from the ternary button row). */
export function naChip(naOn: boolean): CSSProperties {
  return {
    flex: "none",
    border: "1px solid " + (naOn ? "#7c7889" : "#e6e3ee"),
    background: naOn ? "#7c7889" : "#fff",
    color: naOn ? "#fff" : "#a39fae",
    borderRadius: "7px",
    padding: "7px 12px",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
}

/** Compare-screen apartment picker chip. */
export function compareChip(on: boolean): CSSProperties {
  if (on)
    return {
      padding: "7px 13px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 700,
      cursor: "pointer",
      whiteSpace: "nowrap",
      border: "1px solid " + ACCENT,
      background: ACCENT,
      color: "#fff",
    };
  return {
    padding: "7px 13px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    border: "1px solid #e6e3ee",
    background: "#fff",
    color: "#6f6b7a",
  };
}

export interface TableCell {
  label: string;
  style: CSSProperties;
}

export function infoCell(label: string): TableCell {
  return {
    label: label || "—",
    style: {
      padding: "8px 6px",
      textAlign: "center",
      fontSize: "12px",
      fontWeight: 700,
      color: label ? "#332f3d" : "#cdc8da",
      background: "#faf9fc",
      borderLeft: "1px solid #f1eff5",
      borderBottom: "1px solid #eeecf3",
      whiteSpace: "nowrap",
    },
  };
}

export function cellOf(sc: Pick<CatScore, "answered" | "pct">): TableCell {
  if (!sc.answered)
    return {
      label: "—",
      style: {
        padding: "8px 6px",
        textAlign: "center",
        fontSize: "12px",
        fontWeight: 600,
        color: "#bdb9c7",
        background: "#fbfafc",
        borderLeft: "1px solid #f1eff5",
        borderBottom: "1px solid #f1eff5",
      },
    };
  const col =
    sc.pct >= 70
      ? { c: "#1f9d63", b: "#e6f5ee" }
      : sc.pct >= 45
        ? { c: "#9a6c0e", b: "#fbf2dd" }
        : { c: "#d6453f", b: "#fbeceb" };
  return {
    label: sc.pct + "%",
    style: {
      padding: "8px 6px",
      textAlign: "center",
      fontSize: "12px",
      fontWeight: 700,
      color: col.c,
      background: col.b,
      borderLeft: "1px solid #fff",
      borderBottom: "1px solid #f1eff5",
    },
  };
}

export function tabStyle(active: boolean): CSSProperties {
  return {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    padding: "8px 0",
    background: active ? ACCENT_SOFT : "transparent",
    border: "none",
    borderTop: "2px solid " + (active ? ACCENT : "transparent"),
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.02em",
    color: active ? ACCENT : "#9b97a6",
  };
}

export const newVisitStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  background: ACCENT,
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "9px 13px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
};

export const titleStyle: CSSProperties = {
  fontSize: "19px",
  fontWeight: 800,
  color: ACCENT,
  lineHeight: "1.15",
  letterSpacing: "-0.01em",
};
