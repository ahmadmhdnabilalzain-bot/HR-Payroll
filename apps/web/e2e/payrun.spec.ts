import { expect, test } from "@playwright/test";

test("pay-run: fix both IBANs, the GM approves, the file opens",
  async ({ page }) => {
    await page.goto("/#/pay-run/approve");
    const approve = page.getByRole("button", { name: "Sign off pay run" });
    await expect(approve).toBeDisabled();
    // One primary action: the sticky row holds it; no disabled twin.
    await expect(page.getByRole("button", { name: "Continue to Pay" }))
      .toHaveCount(0);
    await expect(page.locator("#approve-why"))
      .toContainText("Bank details still need fixing");

    await page.goto("/#/pay-run/fix");
    await expect(page.getByText("Stops pay").first()).toBeVisible();
    await expect(page.getByText("Check").first()).toBeVisible();
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "Enter IBAN" }).first().click();
      await page.getByRole("button", { name: "Fill from bank letter" })
        .click();
      await page.getByRole("button", { name: "Save and check" }).click();
    }
    await expect(page.getByRole("button", { name: "Enter IBAN" }))
      .toHaveCount(0);

    await page.goto("/#/pay-run/approve");
    await page.getByRole("button", { name: "View as General Manager" })
      .click();
    await page.getByRole("button", { name: "Sign off pay run" }).click();
    await expect(page.getByText("Sign-off recorded")).toBeVisible();
    await page.getByRole("link", { name: "Continue to Pay" }).click();
    await expect(page.getByRole("button", { name: "Download salary file" }))
      .toBeEnabled();
    await expect(page.getByText("The file in brief")).toBeVisible();
  });
