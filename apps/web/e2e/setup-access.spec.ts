import { expect, test } from "@playwright/test";

test("IT manager: who can approve, review, key, import", async ({ page }) => {
  await page.goto("/#/setup/access/who/pay.approve");
  await expect(page.getByRole("heading", { name: "Approve a pay run" }))
    .toBeVisible();
  await expect(page.getByText("Khalid Al Nuaimi").first()).toBeVisible();

  await page.goto("/#/setup/connections/keys");
  await expect(page.getByText(/\*{16}a91f/)).toBeVisible();
  await page.getByRole("button", { name: "Revoke", exact: true }).first().click();
  await expect(page.getByText(/Revoked by/)).toBeVisible();

  await page.goto("/#/setup/connections/hooks/hook-002");
  await page.getByRole("button", { name: "Send again" }).click();
  await expect(page.getByText(/sends nothing outside/).first())
    .toBeVisible();

  await page.goto("/#/setup/data/import");
  await expect(page.getByText(/12 rows read: 4 ready, 3 to review/))
    .toBeVisible();
  await page.getByRole("button", { name: "Import the ready rows" }).click();
  await expect(page.getByText(/Nothing imported/)).toBeVisible();

  await page.goto("/#/setup/access/review");
  await page.getByRole("button", { name: "Keep everyone's access" }).click();
  await expect(page.getByText(/Everyone.s access is kept/)).toBeVisible();
});
