import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const roleAs = async (page: Page, name: string): Promise<void> => {
  await page.locator("button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name }).click();
};
const clean = async (page: Page) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};

test("leave days skip the sample public holidays", async ({ page }) => {
  await page.goto("/#/time-off");
  await page.getByRole("button", { name: "Request time off" }).click();
  await page.getByLabel("First day").fill("2026-11-30");
  await page.getByLabel("Last day").fill("2026-12-04");
  await expect(page.getByText("2 public holidays not counted"))
    .toBeVisible();
  await expect(page.getByText(/3 working days/)).toBeVisible();
  await expect(page.getByText(/sample public holidays in Setup/))
    .toBeVisible();
});

test("comp-off and grants: HR sends, the General manager signs off",
  async ({ page }) => {
    await page.goto("/#/time-off/more/comp-off");
    await expect(page.getByRole("heading", { level: 1,
      name: "Comp-off days" })).toBeVisible();
    await expect(page.getByText(/^Worked /).first())
      .toBeVisible();
    await clean(page);
    await page.goto("/#/time-off/more/grants");
    await page.getByRole("button", { name: "Give a grant" }).click();
    await page.getByLabel("Why").fill("Covered the audit weekend");
    await page.getByRole("button", { name: "Send for sign-off" }).click();
    await expect(page.getByText(/Waiting for/).first()).toBeVisible();
    await roleAs(page, "General manager");
    await page.goto("/#/time-off/more/grants");
    await page.getByRole("button", { name: /^Sign off:/ }).click();
    await expect(page.getByText(/Grant signed off for/)).toBeVisible();
    await page.getByRole("button", { name: /^Undo:/ }).click();
    await expect(page.getByText("Waiting for", { exact: false }).first())
      .toBeVisible();
    await clean(page);
  });

test("an employee reports an incident and it reaches the HR log",
  async ({ page }) => {
    await page.goto("/#/home");
    await roleAs(page, "Employee");
    await page.goto("/#/me/report-incident");
    await page.getByRole("button", { name: "Report an incident" }).click();
    await page.getByLabel("What happened").fill(
      "A loose tile by the lift. Nobody fell.");
    await page.getByRole("button", { name: "Send to HR" }).click();
    await expect(page.getByText("A loose tile by the lift. Nobody fell.")
      .first()).toBeVisible();
    await clean(page);
    await roleAs(page, "HR manager");
    await page.goto("/#/people/safety/incidents");
    await expect(page.getByText("A loose tile by the lift").first())
      .toBeVisible();
    await page.goto("/#/reports/safety-incidents");
    await expect(page.getByText("Reports sent by staff").first())
      .toBeAttached();
  });

test("help shows a video marker on every card", async ({ page }) => {
  await page.goto("/#/me/help");
  await expect(page.getByText("Video to record").first()).toBeVisible();
  await expect(page.getByText(/Short videos: 0 recorded/)).toBeVisible();
  await clean(page);
});
