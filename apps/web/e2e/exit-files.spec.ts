import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const clean = async (page: Page) => {
  // Let entrances (a toast, a step) settle: axe reads colours mid-fade.
  await page.waitForFunction(() => document.getAnimations().every((x) =>
    x.playState !== "running" ||
    x.effect?.getTiming().iterations === Infinity));
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};
const h1 = (page: Page, name: string) =>
  expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

test("exit-interviews-signatures-files-and-time-extras", async (
  { page }, info) => {
  const phone = info.project.name === "phone";
  await page.goto("/#/people/exit");
  await h1(page, "Exit interviews");
  await expect(page.getByText("Moving abroad").first()).toBeVisible();
  await clean(page);

  await page.goto("/#/people/files/signatures");
  await h1(page, "E-signatures");
  await page.getByRole("link", { name: /Salary certificate/ }).first()
    .click();
  await expect(page.getByText(/no legal validity/).first()).toBeVisible();
  await clean(page);

  await page.goto("/#/people/files/documents");
  await h1(page, "Documents");
  await expect(page.getByText(/stay in this browser tab only/).first())
    .toBeVisible();
  await clean(page);

  await page.goto("/#/time-off/more/encash");
  await h1(page, "Leave encashment");
  await page.getByRole("link", { name: /Moza Al Kaabi/ }).first().click();
  await page.getByRole("button", { name: "Sign off and send on" }).click();
  await expect(page.getByText(/Waiting for the General manager/).first())
    .toBeVisible();
  await clean(page);

  for (const [path, title] of [
    ["liability", "Leave liability and tickets"],
    ["corrections", "Attendance corrections"], ["phone", "Phone clock-in"],
    ["wfh", "Work from home"], ["kiosk", "Kiosk check-in"],
    ["cover", "Minimum on shift"], ["leave-for", "Record leave for someone"],
  ] as const) {
    await page.goto(`/#/time-off/more/${path}`);
    await h1(page, title);
    await clean(page);
  }
  if (phone) return;
  await page.goto("/#/time-off/more/encash");
  await page.getByRole("button", { name: /HR manager/ }).click();
  await page.getByRole("menuitemradio", { name: /Employee/ }).click();
  await page.goto("/#/time-off/more/liability");
  await expect(page.getByRole("heading", { level: 1,
    name: "Outside your view" })).toBeVisible();
});
