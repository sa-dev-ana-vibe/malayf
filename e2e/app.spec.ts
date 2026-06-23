import { test, expect, type Page } from "@playwright/test";

/** Collect console errors / page errors so a test can assert there were none. */
function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("create an apartment, score it, and persist across reload", async ({ page }) => {
  const errors = trackConsole(page);
  await page.goto("/");

  // Empty state.
  await expect(page.getByText("No apartments yet")).toBeVisible();
  await page.getByRole("button", { name: "+ Add first appartment" }).click();

  // Lands on the detail screen.
  const name = page.getByPlaceholder("Apartment name");
  await expect(name).toBeVisible();
  await name.fill("Sunny 2BR");

  // Price is grouped into thousands as you type.
  const price = page.getByPlaceholder("Цена");
  await price.fill("5500000");
  await expect(price).toHaveValue("5 500 000");

  // Answering a checklist item moves the score off the "–" placeholder.
  await page.getByRole("button", { name: "Pass" }).first().click();
  await expect(page.getByText("100%").first()).toBeVisible();

  // Back to the list — the card is there.
  await page.getByRole("button", { name: "Назад" }).click();
  await expect(page.getByText("Sunny 2BR")).toBeVisible();

  // Reload: data survives (localStorage + IndexedDB).
  await page.reload();
  await expect(page.getByText("Sunny 2BR")).toBeVisible();

  expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
});

test("settings: weights stay at 100% after distribute, and export downloads a file", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Settings/ }).click();

  await page.getByRole("button", { name: "Distribute evenly" }).click();
  // The weight-total badge reads exactly "100%" (the intro paragraph also
  // contains "100%" as a substring, so match exactly).
  await expect(page.getByText("100%", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Экспорт JSON/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^aptcheck-.*\.json$/);
});

test("compare builds a table from a selected apartment", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add first appartment" }).click();
  await page.getByPlaceholder("Apartment name").fill("Flat A");
  await page.getByRole("button", { name: "Назад" }).click();

  await page.getByRole("button", { name: /Compare/ }).click();
  await expect(page.getByText("Pick apartments")).toBeVisible();
  await page.getByRole("button", { name: "Flat A" }).click();

  // The comparison table renders its sticky CATEGORY header + OVERALL row.
  await expect(page.getByText("CATEGORY")).toBeVisible();
  await expect(page.getByText("OVERALL")).toBeVisible();
});
