// ─────────────────────────────────────────────────────────────────────────
// Builds a ready-to-paste prompt that asks an LLM to convert apartment listings
// into the JSON the app's additive import ("Добавить квартиры из JSON") accepts.
// The JSON Schema is generated from the Zod `listingSchema` (single source of
// truth) so it can never drift from what the importer actually parses.
// ─────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { HOUSE_TYPES, listingSchema } from "./schema";

const rootSchema = z.object({
  visits: z.array(listingSchema).describe("Массив квартир"),
});

export const EXAMPLE = {
  visits: [
    {
      name: "2-комн. у парка",
      address: "ул. Ленина 10, Казань",
      price: "5500000",
      areaTotal: "54",
      floor: "4",
      floorsTotal: "9",
      yearBuilt: "2015",
      houseType: "Кирпичный",
      notes: "Тихий двор, окна во двор",
      links: [{ label: "Avito", url: "https://www.avito.ru/..." }],
      contacts: [{ name: "Агент", value: "+7 999 000-00-00" }],
      dates: ["2026-06-25"],
    },
  ],
};

export function buildAppendPrompt(): string {
  const schema = JSON.stringify(
    zodToJsonSchema(rootSchema, { name: "MalayfApartments", $refStrategy: "none" }),
    null,
    2,
  );
  return `Ты помогаешь заполнить приложение MALAYF — чек-лист для оценки квартир при поиске жилья.

ЗАДАЧА: преврати данные объявлений (которые я вставлю ниже) в один JSON-объект
строго по схеме и верни ТОЛЬКО валидный JSON, без markdown-обёрток и пояснений.

Корневой объект: { "visits": [ <квартира>, ... ] }

JSON Schema:
${schema}

ПРАВИЛА:
- Не добавляй поля id — приложение присвоит их само.
- Не добавляй поля photos/results/tagIds/redFlags — они заполняются в приложении.
- "price" — только цифры строкой (без пробелов и валюты), напр. "5500000".
- Площади, этаж, этажность, год — строки.
- "houseType" — одно из: ${HOUSE_TYPES.join(", ")} (или опусти, если неизвестно).
- "dates" — даты визитов в формате ISO yyyy-mm-dd.
- "links": [{ "label": "Avito", "url": "https://..." }]
- "contacts": [{ "name": "Владелец", "value": "+7..." }] — value это телефон или email.
- Пропускай поля, которых нет в объявлении. Обязательно только "name".

ПРИМЕР вывода:
${JSON.stringify(EXAMPLE, null, 2)}

После ответа сохрани JSON в файл .json и импортируй его в приложении:
Settings → «➕ Добавить квартиры из JSON» (это добавит квартиры, не заменяя текущие).

Данные объявлений:
`;
}
