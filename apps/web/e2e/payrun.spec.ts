import { expect, test } from "@playwright/test";

test("pay-run: fix both IBANs, the GM approves, the file opens",
  async ({ page }) => {
    await page.goto("/#/pay-run/approve");
    // HR prepared the run: the header says who signs, not a dead
    // button, and the page says why it cannot be signed yet.
    await expect(page.getByText("Waiting for Khalid Al Nuaimi",
      { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign off pay run" }))
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
    // Six checks are open: the GM signs over them knowingly.
    await expect(page.getByRole("dialog"))
      .toContainText("6 checks not reviewed");
    await page.getByRole("button", { name: "Sign off anyway" }).click();
    await expect(page.getByText("Sign-off recorded")).toBeVisible();
    // The stamp reads later than "Prepared ... at 09:30", on that day.
    await expect(page.getByText(/^27 October 2026 at 09:(4\d|5\d)$/))
      .toBeVisible();
    // Undo: in the toast and under the stamp, nowhere else.
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(2);
    await page.getByRole("link", { name: "Continue to Pay" }).click();
    await expect(page.getByRole("button", { name: "Download salary file" }))
      .toBeEnabled();
    await expect(page.getByText("The file in brief")).toBeVisible();
  });
