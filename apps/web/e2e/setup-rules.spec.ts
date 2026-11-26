import { expect, test } from "@playwright/test";

test("setup-rules-edit-and-undo", async ({ page }) => {
  await page.goto("/#/setup/rules/packs");
  await expect(page.getByRole("heading", { name: "Rules and sources" }))
    .toBeVisible();
  await page.getByRole("button", { name: /^No source yet/ }).click();
  await expect(page.getByText(/of \d+$/).first()).toBeVisible();
  await page.goto("/#/setup/rules/hours");
  await page.getByRole("button", { name: "Edit" }).nth(1).click();
  const box = page.getByRole("dialog").getByRole("textbox");
  await box.fill("10%");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("alert")).toContainText("at least 25%");
  await box.fill("30%");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("set to 30%").first()).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("(undone)")).toBeVisible();
});
