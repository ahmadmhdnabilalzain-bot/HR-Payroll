import { expect, test } from "@playwright/test";

test("the audit trail grows with each demo action, as the IT manager sees it",
  async ({ page }, info) => {
    test.skip(info.project.name === "phone", "role menu is an avatar");
    await page.goto("/#/pay-run/fix");
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
    // Six checks are open: the GM signs over them knowingly.
    await page.getByRole("button", { name: "Sign off anyway" }).click();
    await expect(page.getByText("Sign-off recorded")).toBeVisible();
    await page.locator("button[aria-haspopup=menu]").click();
    await page.getByRole("menuitemradio", { name: "IT manager" }).click();
    await page.goto("/#/reports/audit");
    await page.getByRole("button", { name: "Check the chain" }).click();
    await expect(page.getByText("all 61 entries fit")).toBeVisible();
    await expect(page.getByText(/signed off the pay run\.$/))
      .toBeVisible();
    await expect(page.getByText("Bank account saved").first())
      .toBeVisible();
    await page.getByRole("button", { name: "Edit one entry" }).click();
    await page.getByRole("button", { name: "Check the chain" }).click();
    await expect(page.getByText(/Chain broken at entry 11/)).toBeVisible();
  });
