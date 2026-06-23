import type { Category, Tag } from "../types";
import { uid } from "./format";

export function defaultTags(): Tag[] {
  const T = (name: string, color: string): Tag => ({ id: uid(), name, color });
  return [
    T("позвонить", "#2f6fd6"),
    T("не ответили", "#8a8794"),
    T("просмотр назначен", "#6a35d9"),
    T("просмотр пройден", "#1f9d63"),
    T("не подходит", "#d6453f"),
    T("маленькая", "#d98a2b"),
    T("подозрительная", "#b07a16"),
  ];
}

export function defaultRedFlags(): string[] {
  return [
    "Плесень / сырость",
    "Неприятный запах",
    "Плохая звукоизоляция",
    "Старая проводка",
    "Слабый напор воды",
    "Окна не закрываются",
    "Насекомые",
    "Нет интернета",
    "Тёмно / мало света",
    "Подозрительный хозяин",
  ];
}

export function defaultCats(): Category[] {
  const C = (name: string, weight: number, items: string[]): Category => ({
    id: uid(),
    name,
    weight,
    items: items.map((t) => ({ id: uid(), text: t })),
  });
  return [
    C("Space & Layout", 30, [
      "Room for a workbench",
      "Space for a home gym",
      "Enough storage / closets",
      "Dedicated work-from-home spot",
    ]),
    C("Light & Comfort", 20, [
      "Good natural light",
      "Cross-ventilation",
      "Low street noise",
      "Heating / AC works well",
    ]),
    C("Kitchen & Bath", 15, [
      "Kitchen counter space",
      "Strong water pressure",
      "Bathroom ventilation",
      "Appliances in good shape",
    ]),
    C("Building & Location", 25, [
      "Elevator in building",
      "Close to transit",
      "Parking available",
      "Feels safe at night",
      "Groceries nearby",
    ]),
    C("Condition", 10, [
      "No damp or mold",
      "Windows seal properly",
      "Mobile signal is good",
      "Walls & floors solid",
    ]),
  ];
}
