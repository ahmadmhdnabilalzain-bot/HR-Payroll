import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("setup-structure: jobs, letter preview, holidays, rules page",
  async ({ page }) => {
    await page.goto("/#/setup/structure/jobs");
    await expect(page.getByRole("heading", { name: "Jobs and grades" }))
      .toBeVisible();
    await page.getByRole("tab", { name: "Grades" }).click();
    await expect(page.getByText("Grade 1").first()).toBeVisible();

    await page.goto("/#/setup/structure/letters");
    await page.getByRole("link", { name: /Salary certificate/ }).click();
    await expect(page.getByText(/Issued at the employee's request/)
      .first()).toBeVisible();
    await page.getByLabel("For").selectOption({ index: 1 });
    await expect(page.getByText(/request for a rental contract/).first())
      .toBeVisible();

    await page.goto("/#/setup/structure/exemptions");
    await expect(page.getByText("Pension").first()).toBeVisible();

    await page.goto("/#/setup/structure/holidays");
    await expect(page.getByText(/Sample dates/).first()).toBeVisible();
    // Phones list the month's days under the grid; the cells keep dots.
    await expect(page.getByText("UAE National Day")
      .filter({ visible: true }).first()).toBeVisible();

    await page.goto("/#/setup/rules/holidays");
    await expect(page.getByText(/sample dates/).first()).toBeVisible();
    await expect(page.getByText("None loaded")).toHaveCount(1);

    for (const p of ["jobs", "documents", "letters", "checklists",
      "sign-off", "kpis", "exemptions", "devices", "holidays"]) {
      await page.goto(`/#/setup/structure/${p}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const r = await new AxeBuilder({ page }).analyze();
      expect(r.violations.map((v) => v.id), p).toEqual([]);
    }
  });
