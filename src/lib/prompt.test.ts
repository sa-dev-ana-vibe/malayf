import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EXAMPLE, buildAppendPrompt } from "./prompt";
import { HOUSE_TYPES, listingSchema } from "./schema";
import { parseAppendVisits } from "./storage";

describe("buildAppendPrompt", () => {
  const prompt = buildAppendPrompt();

  it("includes the root shape, the generated JSON Schema, and the rules", () => {
    expect(prompt).toContain('"visits"');
    expect(prompt).toContain("JSON Schema");
    expect(prompt).toContain('"properties"'); // generated from zod
    expect(prompt).toContain("name"); // the one required field
    expect(prompt).toContain("Добавить квартиры из JSON"); // where to import
  });

  it("lists every allowed house type", () => {
    for (const type of HOUSE_TYPES) expect(prompt).toContain(type);
  });

  it("tells the model NOT to emit internal fields", () => {
    expect(prompt).toContain("Не добавляй поля id");
    expect(prompt).toMatch(/photos\/results/);
  });
});

describe("the documented example round-trips through the real importer", () => {
  it("the EXAMPLE validates against the listing contract (catches drift)", () => {
    const rootSchema = z.object({ visits: z.array(listingSchema) });
    expect(rootSchema.safeParse(EXAMPLE).success).toBe(true);
  });

  it("parseAppendVisits accepts the prompt's EXAMPLE", async () => {
    const visits = await parseAppendVisits(JSON.stringify(EXAMPLE));
    expect(visits).toHaveLength(1);
    const v = visits[0];
    expect(v.name).toBe("2-комн. у парка");
    expect(v.price).toBe("5500000");
    expect(v.houseType).toBe("Кирпичный");
    // ids are assigned by the importer (the example/contract omits them)
    expect(v.id).toBeTruthy();
    expect(v.links[0].url).toContain("avito");
    expect(v.links[0].id).toBeTruthy();
    expect(v.contacts[0].value).toContain("+7");
    expect(v.photos).toEqual([]);
    expect(v.floorPlan).toBeNull();
  });
});
