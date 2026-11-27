import { describe, expect, it } from "vitest";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { INITIAL, type DemoState } from "../../src/demo/state";
import { firstRoute, mayOpen, panelOf } from "../../src/nav/registry";
import { setupSummary, SETUP_LINES } from "../../src/setup/home/summary";

const demo = buildDemoSource();
const as = (role: DemoState["role"]): DemoState => ({ ...INITIAL, role });

describe("the Setup home", () => {
  it("has a line for every Setup area HR, the GM and IT can open", () => {
    for (const role of ["hr", "gm", "it"] as const) {
      const c = { data: demo.at({}), state: as(role) };
      const areas = panelOf(role, "setup").flatMap((g) => g.areas);
      expect(areas.length).toBeGreaterThan(20);
      for (const a of areas) {
        expect(SETUP_LINES[a.id], a.id).toBeDefined();
        expect(setupSummary(a, c).text, a.id).not.toBe("");
      }
    }
  });

  it("puts a waiting count first, as a state word", () => {
    const c = { data: demo.at({}), state: as("hr") };
    const req = panelOf("hr", "setup").flatMap((g) => g.areas)
      .find((a) => a.id === "setup.access-requests")!;
    expect(setupSummary(req, c)).toEqual({ text: "2 waiting",
      tone: "warn" });
  });

  it("says the pension fund is still to confirm", () => {
    const c = { data: demo.at({}), state: as("hr") };
    const el = panelOf("hr", "setup").flatMap((g) => g.areas)
      .find((a) => a.id === "setup.payelements")!;
    expect(setupSummary(el, c).tone).toBe("warn");
  });

  it("is where the Setup word goes, for roles that have Setup", () => {
    for (const role of ["hr", "gm", "it"] as const) {
      const c = { data: demo.at({}), state: as(role) };
      expect(firstRoute(role, "setup", c)).toEqual({ section: "setup" });
      expect(mayOpen(role, { section: "setup" })).toBe(true);
    }
    for (const role of ["employee", "manager"] as const) {
      expect(mayOpen(role, { section: "setup" })).toBe(false);
    }
  });

  it("writes no amounts", () => {
    for (const role of ["hr", "gm", "it"] as const) {
      const c = { data: demo.at({}), state: as(role) };
      for (const a of panelOf(role, "setup").flatMap((g) => g.areas)) {
        expect(setupSummary(a, c).text).not.toMatch(/AED|\d,\d{3}\./);
      }
    }
  });
});
