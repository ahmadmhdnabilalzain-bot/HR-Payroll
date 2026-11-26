import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, type Role } from "../../src/demo/state";
import { areasFor, barFor, panelOf, routeOf } from "../../src/nav/registry";
import { tabsAt } from "../../src/shell/groupTabs";

const ROLES: Role[] = ["hr", "gm", "it", "manager", "employee"];

describe("group tabs", () => {
  it("every-reachable-area-is-a-group-row-or-one-of-its-tabs", () => {
    const missing: string[] = [];
    for (const role of ROLES) {
      const c = { data: buildDemoData(), state: { ...INITIAL, role } };
      const seen = new Set<string>();
      for (const w of barFor(role)) {
        for (const { group, areas } of panelOf(role, w)) {
          const first = areas[0];
          if (first === undefined) continue;
          seen.add(first.id);
          const r = routeOf(first, c);
          const found = tabsAt(role, c, r.section, r.rest ?? [],
            `${group.section}/${group.id}`);
          for (const a of found?.tabs ?? []) seen.add(a.id);
          if (areas.length > 1) {
            expect(found?.tabs.map((a) => a.id)).toEqual(
              areas.map((a) => a.id));
          }
        }
      }
      for (const a of areasFor(role)) {
        if (barFor(role).includes(a.section) && !seen.has(a.id)) {
          missing.push(`${role}: ${a.id}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("a-variance-month-keeps-the-variance-tabs", () => {
    const c = { data: buildDemoData(), state: { ...INITIAL, role: "hr" as
      const } };
    const page = tabsAt("hr", c, "reports", ["variance"]);
    const month = tabsAt("hr", c, "reports", ["variance", "2026-09"]);
    expect(page?.at.id).toBe("reports.variance");
    expect(month?.at.id).toBe("reports.variance");
    expect(month?.tabs.map((a) => a.id))
      .toEqual(page?.tabs.map((a) => a.id));
  });
});
