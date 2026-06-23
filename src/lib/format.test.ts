import { describe, expect, it } from "vitest";
import {
  cmpNullsLast,
  contactHref,
  fmtDate,
  fmtRu,
  formatThousands,
  hexToRgba,
  latestDate,
  mapsHref,
  normalizeUrl,
  numArea,
  numPpm,
  numPrice,
  prettyHost,
  priceMillions,
  visitDates,
} from "./format";
import { makeVisit } from "../test/factories";

describe("formatThousands", () => {
  it("groups digits by 3 with spaces", () => {
    expect(formatThousands("5500000")).toBe("5 500 000");
    expect(formatThousands("100")).toBe("100");
    expect(formatThousands("1000")).toBe("1 000");
    expect(formatThousands(5500000)).toBe("5 500 000");
  });

  it("keeps only digits", () => {
    expect(formatThousands("$5,500.00")).toBe("550 000");
    expect(formatThousands("12 345 ₽")).toBe("12 345");
  });

  it("returns empty string for empty/null/undefined/non-digit input", () => {
    expect(formatThousands("")).toBe("");
    expect(formatThousands(null)).toBe("");
    expect(formatThousands(undefined)).toBe("");
    expect(formatThousands("abc")).toBe("");
  });
});

describe("normalizeUrl", () => {
  it("returns '#' for empty input", () => {
    expect(normalizeUrl("")).toBe("#");
  });

  it("adds https:// when no scheme present", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("sub.example.com/path")).toBe("https://sub.example.com/path");
  });

  it("preserves existing http/https scheme", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeUrl("HTTPS://example.com")).toBe("HTTPS://example.com");
  });
});

describe("prettyHost", () => {
  it("returns empty string for empty input", () => {
    expect(prettyHost("")).toBe("");
  });

  it("strips a leading www.", () => {
    expect(prettyHost("www.example.com")).toBe("example.com");
    expect(prettyHost("https://www.example.com/path")).toBe("example.com");
  });

  it("returns the bare hostname for schemeless input", () => {
    expect(prettyHost("example.com/a/b")).toBe("example.com");
  });

  it("returns empty string for an unparseable url", () => {
    expect(prettyHost("https://")).toBe("");
  });
});

describe("contactHref", () => {
  it("returns '#' for empty input", () => {
    expect(contactHref("")).toBe("#");
  });

  it("builds a mailto: link for emails", () => {
    expect(contactHref("user@example.com")).toBe("mailto:user@example.com");
    expect(contactHref("  user@example.com  ")).toBe("mailto:user@example.com");
  });

  it("builds a tel: link stripping all but digits and +", () => {
    expect(contactHref("+7 (999) 123-45-67")).toBe("tel:+79991234567");
    expect(contactHref("8 800 555 35 35")).toBe("tel:88005553535");
  });
});

describe("hexToRgba", () => {
  it("expands 3-digit hex", () => {
    expect(hexToRgba("#fff", 0.5)).toBe("rgba(255,255,255,0.5)");
    expect(hexToRgba("#000", 1)).toBe("rgba(0,0,0,1)");
    expect(hexToRgba("#f00", 1)).toBe("rgba(255,0,0,1)");
  });

  it("parses 6-digit hex", () => {
    expect(hexToRgba("#6a35d9", 1)).toBe("rgba(106,53,217,1)");
    expect(hexToRgba("#ffffff", 0.25)).toBe("rgba(255,255,255,0.25)");
  });

  it("works without the leading #", () => {
    expect(hexToRgba("00ff00", 0.8)).toBe("rgba(0,255,0,0.8)");
  });

  it("falls back to the default purple for empty input", () => {
    expect(hexToRgba("", 1)).toBe("rgba(106,53,217,1)");
  });
});

describe("fmtDate", () => {
  it("formats an ISO date as short month + numeric day", () => {
    expect(fmtDate("2026-06-23")).toBe("Jun 23");
    expect(fmtDate("2026-01-01")).toBe("Jan 1");
    expect(fmtDate("2026-12-31")).toBe("Dec 31");
  });
});

describe("numPrice", () => {
  it("parses a numeric price ignoring spaces and symbols", () => {
    expect(numPrice(makeVisit({ price: "5 500 000" }))).toBe(5500000);
    expect(numPrice(makeVisit({ price: "$1,200" }))).toBe(1200);
  });

  it("returns null when there is no price", () => {
    expect(numPrice(makeVisit({ price: "" }))).toBeNull();
    expect(numPrice(makeVisit({ price: "n/a" }))).toBeNull();
  });
});

describe("numArea", () => {
  it("parses comma decimals as floats", () => {
    expect(numArea(makeVisit({ areaTotal: "54,3" }))).toBe(54.3);
    expect(numArea(makeVisit({ areaTotal: "54.3 m²" }))).toBe(54.3);
  });

  it("returns null when unparseable", () => {
    expect(numArea(makeVisit({ areaTotal: "" }))).toBeNull();
    expect(numArea(makeVisit({ areaTotal: "большая" }))).toBeNull();
  });
});

describe("numPpm", () => {
  it("computes price per square meter", () => {
    expect(numPpm(makeVisit({ price: "5 500 000", areaTotal: "55" }))).toBe(100000);
  });

  it("returns null when price or area is missing/zero", () => {
    expect(numPpm(makeVisit({ price: "", areaTotal: "55" }))).toBeNull();
    expect(numPpm(makeVisit({ price: "5500000", areaTotal: "" }))).toBeNull();
    expect(numPpm(makeVisit({ price: "0", areaTotal: "55" }))).toBeNull();
  });
});

describe("cmpNullsLast", () => {
  it("sorts ascending", () => {
    expect(cmpNullsLast(1, 2, "asc")).toBeLessThan(0);
    expect(cmpNullsLast(2, 1, "asc")).toBeGreaterThan(0);
    expect(cmpNullsLast(5, 5, "asc")).toBe(0);
  });

  it("sorts descending", () => {
    expect(cmpNullsLast(1, 2, "desc")).toBeGreaterThan(0);
    expect(cmpNullsLast(2, 1, "desc")).toBeLessThan(0);
  });

  it("always puts nulls last regardless of direction", () => {
    expect(cmpNullsLast(null, 5, "asc")).toBe(1);
    expect(cmpNullsLast(5, null, "asc")).toBe(-1);
    expect(cmpNullsLast(null, 5, "desc")).toBe(1);
    expect(cmpNullsLast(5, null, "desc")).toBe(-1);
    expect(cmpNullsLast(null, null, "asc")).toBe(0);
  });

  it("orders an array with nulls trailing", () => {
    const values: (number | null)[] = [3, null, 1, null, 2];
    const sorted = values.slice().sort((a, b) => cmpNullsLast(a, b, "asc"));
    expect(sorted).toEqual([1, 2, 3, null, null]);
  });
});

describe("visitDates", () => {
  it("returns the dates array when present", () => {
    expect(visitDates(makeVisit({ dates: ["2026-01-01", "2026-02-02"] }))).toEqual([
      "2026-01-01",
      "2026-02-02",
    ]);
  });

  it("falls back to the legacy single date field", () => {
    expect(visitDates(makeVisit({ dates: [], date: "2026-03-03" }))).toEqual([
      "2026-03-03",
    ]);
  });

  it("returns an empty array when no dates exist", () => {
    expect(visitDates(makeVisit({ dates: [] }))).toEqual([]);
  });
});

describe("latestDate", () => {
  it("returns the maximum ISO date", () => {
    expect(
      latestDate(makeVisit({ dates: ["2026-01-01", "2026-06-23", "2026-03-03"] })),
    ).toBe("2026-06-23");
  });

  it("uses the legacy single date field", () => {
    expect(latestDate(makeVisit({ dates: [], date: "2026-03-03" }))).toBe("2026-03-03");
  });

  it("returns null when there are no dates", () => {
    expect(latestDate(makeVisit({ dates: [] }))).toBeNull();
  });
});

describe("priceMillions", () => {
  it("renders millions with a comma decimal and kk suffix", () => {
    expect(priceMillions("5500000")).toBe("5,5kk");
    expect(priceMillions("5 500 000")).toBe("5,5kk");
    expect(priceMillions("12000000")).toBe("12kk");
    expect(priceMillions("1234567")).toBe("1,23kk");
  });

  it("returns empty string for zero/empty/unparseable", () => {
    expect(priceMillions("")).toBe("");
    expect(priceMillions("0")).toBe("");
    expect(priceMillions("free")).toBe("");
  });
});

describe("fmtRu", () => {
  it("groups thousands in the ru-RU locale", () => {
    expect(fmtRu(5500000)).toBe((5500000).toLocaleString("ru-RU"));
    expect(fmtRu(1000)).toBe((1000).toLocaleString("ru-RU"));
  });

  it("rounds before formatting", () => {
    expect(fmtRu(1234.6)).toBe((1235).toLocaleString("ru-RU"));
  });

  it("returns empty string for null", () => {
    expect(fmtRu(null)).toBe("");
  });
});

describe("mapsHref", () => {
  it("builds a 2gis search url with an encoded address", () => {
    expect(mapsHref("Lenin St 1")).toBe("https://2gis.ru/search/Lenin%20St%201");
    expect(mapsHref("ул. Ленина, 1")).toBe(
      "https://2gis.ru/search/" + encodeURIComponent("ул. Ленина, 1"),
    );
  });

  it("returns '#' for an empty address", () => {
    expect(mapsHref("")).toBe("#");
  });
});
