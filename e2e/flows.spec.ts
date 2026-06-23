import { test, expect } from "@playwright/test";

// A 1×1 transparent PNG — a real image so the canvas resize pipeline runs.
const PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test("photo: upload, mark as floor plan, and survive a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add first appartment" }).click();
  await page.getByPlaceholder("Apartment name").fill("Photo Flat");

  // The photo <input type=file> is hidden inside the "+ Photo" label.
  await page
    .locator('input[type="file"][accept*="image"]')
    .setInputFiles({ name: "p.png", mimeType: "image/png", buffer: Buffer.from(PNG_1X1, "base64") });

  await expect(page.getByRole("img").first()).toBeVisible();

  // Mark it as the floor plan → the ▦ badge gains the "ПЛАН" label.
  await page.getByRole("button", { name: "▦", exact: true }).click();
  await expect(page.getByText("ПЛАН")).toBeVisible();

  // Reload (photo Blob lives in IndexedDB), reopen, and confirm both survive.
  await page.reload();
  await page.getByText("Photo Flat").click();
  await expect(page.getByRole("img").first()).toBeVisible();
  await expect(page.getByText("ПЛАН")).toBeVisible();
});

test("import replaces all current data after confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add first appartment" }).click();
  await page.getByPlaceholder("Apartment name").fill("Original Flat");
  await page.getByRole("button", { name: "Назад" }).click();
  await expect(page.getByText("Original Flat")).toBeVisible();

  await page.getByRole("button", { name: /Settings/ }).click();
  page.on("dialog", (d) => void d.accept()); // accept the "replace ALL" confirm
  await page
    .locator('input[aria-label="Импорт JSON"]')
    .setInputFiles("e2e/fixtures/import.json");

  await expect(page.getByText("Imported Flat")).toBeVisible();
  await expect(page.getByText("Original Flat")).toHaveCount(0);
});

test("append adds apartments from a file, keeping the existing ones", async ({ page }) => {
  // Append shows a "added N" alert and (unlike replace-all import) no confirm.
  page.on("dialog", (d) => void d.accept());
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add first appartment" }).click();
  await page.getByPlaceholder("Apartment name").fill("Kept Flat");
  await page.getByRole("button", { name: "Назад" }).click();
  await expect(page.getByText("Kept Flat")).toBeVisible();

  await page.getByRole("button", { name: /Settings/ }).click();
  await page
    .locator('input[type="file"][aria-label="Добавить квартиры из JSON"]')
    .setInputFiles("e2e/fixtures/import.json");

  // The action navigates back to the list; both apartments are present.
  await expect(page.getByText("Imported Flat")).toBeVisible();
  await expect(page.getByText("Kept Flat")).toBeVisible();
});

test("delete an apartment after confirming", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add first appartment" }).click();
  await page.getByPlaceholder("Apartment name").fill("Doomed Flat");

  page.on("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "DELETE" }).click();

  await expect(page.getByText("No apartments yet")).toBeVisible();
});

test("tag filter shows the no-match empty state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add first appartment" }).click();
  await page.getByPlaceholder("Apartment name").fill("Untagged");
  await page.getByRole("button", { name: "Назад" }).click();

  // Filter by a default tag the apartment doesn't have → empty-state message.
  await page.getByRole("button", { name: "позвонить" }).click();
  await expect(page.getByText("Нет квартир с выбранными метками.")).toBeVisible();
});
