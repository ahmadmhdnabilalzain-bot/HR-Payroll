import { expect, test, type Page } from "@playwright/test";

const open = async (page: Page, slug: string): Promise<void> => {
  await page.goto(`/#/time-off/${slug}`);
  await page.getByRole("heading", { level: 1 }).waitFor();
};

const roleAs = async (page: Page, name: string): Promise<void> => {
  await page.locator("button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name }).click();
};

test("time-hr-decides-overtime-and-undoes", async ({ page }) => {
  await open(page, "overtime");
  await expect(page.getByText("Waiting for Arjun Menon").first())
    .toBeVisible();
  await page.getByRole("link", { name: /Rafiq Hossain/ }).first().click();
  // The list rows carry Accept too: wait for the claim's own page.
  await expect(page.getByRole("tab", { name: "Claim", exact: true }))
    .toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText(/Accepted by .*27 October/).first())
    .toBeVisible();
  await expect(page.getByText("The claim accepted.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).first().click();
  await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
});

test("time-match-a-punch", async ({ page }) => {
  await open(page, "punches");
  await page.getByRole("button", { name: "Match" }).last().click();
  await expect(page.getByText(/Suggested: Nimal Perera/)).toBeVisible();
  await page.getByRole("button", { name: "Match punch" }).click();
  await expect(page.getByText("Punch matched to Nimal Perera."))
    .toBeVisible();
});

test("time-pages-open-and-employee-is-turned-away", async ({ page }) => {
  for (const slug of ["attendance", "register", "register/emp-008",
    "against", "roster", "plan", "balances", "overtime/crew"]) {
    await open(page, slug);
    await expect(page.getByText("outside your view")).toHaveCount(0);
  }
  await roleAs(page, "Employee");
  await open(page, "overtime");
  await expect(page.getByText("This page is outside your view."))
    .toBeVisible();
});
