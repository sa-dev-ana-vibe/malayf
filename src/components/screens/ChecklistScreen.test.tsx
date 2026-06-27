import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

async function freshChecklistScreen() {
  vi.resetModules();
  localStorage.clear();
  return import("./ChecklistScreen");
}

beforeEach(() => {
  vi.stubGlobal("confirm", () => true);
  vi.stubGlobal("alert", () => undefined);
});

describe("ChecklistScreen navigation helpers", () => {
  it("collapses categories and exposes a shortcut to data tools", async () => {
    const user = userEvent.setup();
    const { default: ChecklistScreen } = await freshChecklistScreen();

    render(<ChecklistScreen />);

    const dataShortcut = screen.getByRole("link", { name: "К импорту/экспорту ↓" });
    expect(dataShortcut).toHaveAttribute("href", "#checklist-data-tools");
    expect(screen.getByText("Данные").closest("div[id]")).toHaveAttribute(
      "id",
      "checklist-data-tools",
    );

    const categoryName = screen.getAllByLabelText("Category name")[0].getAttribute("value");
    expect(categoryName).toBeTruthy();
    expect(screen.getAllByLabelText("Requirement").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Свернуть критерии" }));

    expect(screen.queryByLabelText("Requirement")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Развернуть критерии" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Развернуть категорию ${categoryName}` }),
    ).toHaveAttribute("aria-expanded", "false");

    const firstCategory = screen.getAllByText(/шт\./)[0].closest("div.bg-card");
    expect(firstCategory).not.toBeNull();
    expect(within(firstCategory as HTMLElement).getByText(/\d+ шт\./)).toBeInTheDocument();
  });

  it("shows a confirmed destructive action for clearing apartments", async () => {
    const { default: ChecklistScreen } = await freshChecklistScreen();

    render(<ChecklistScreen />);

    expect(
      screen.getByRole("button", { name: "🗑 Удалить все квартиры" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/очистит только список квартир после подтверждения/i),
    ).toBeInTheDocument();
  });
});
