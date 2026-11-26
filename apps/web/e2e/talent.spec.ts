import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const clean = async (page: import("@playwright/test").Page) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};

test("skills-training-and-surveys-flow", async ({ page }, info) => {
  await page.goto("/#/s/people");
  for (const name of ["Skills", "Training and learning",
    "Engagement surveys"]) {
    await expect(page.getByRole("link", { name }).first()).toBeVisible();
  }
  await page.goto("/#/people/talent/skills");
  await expect(page.getByRole("heading", { level: 1, name: "Skills" }))
    .toBeVisible();
  await expect(page.getByText(/^Sample levels/)).toBeVisible();
  await page.getByRole("searchbox", { name: "Find a person" })
    .fill("Aisha");
  await expect(page.getByRole("link", { name: "Aisha Al Marri" }).first())
    .toBeVisible();
  await clean(page);

  await page.goto("/#/people/talent/training");
  await expect(page.getByRole("heading", { level: 1,
    name: "Training and learning" })).toBeVisible();
  await page.getByRole("link", { name: /Fire safety briefing/ }).click();
  await expect(page.getByRole("heading", { level: 1,
    name: "Fire safety briefing" })).toBeVisible();
  await expect(page.getByText(/Session 4 Nov 2026 at 10:00/).first())
    .toBeVisible();
  await clean(page);

  await page.goto("/#/people/talent/surveys");
  await page.getByRole("link", { name: /September pulse survey/ }).click();
  await expect(page.getByText("Staff engagement score")).toBeVisible();
  await page.getByRole("tab", { name: "By group" }).click();
  await expect(page.getByText("Too few answers to show").first())
    .toBeVisible();
  await expect(page.getByText(/fewer than 5 answers/).first())
    .toBeVisible();
  await clean(page);
  await page.goto("/#/people/talent/surveys/sv-2026-12");
  await expect(page.getByText(/30 Nov 2026/).first()).toBeVisible();
  if (info.project.name === "phone") return;
  await page.getByRole("button", { name: /HR manager/ }).click();
  await page.getByRole("menuitemradio", { name: /Employee/ }).click();
  await expect(page.getByRole("heading", { level: 1,
    name: "Outside your view" })).toBeVisible();
});
