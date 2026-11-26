import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL } from "../../src/demo/state";
import { ALL_AREAS } from "../../src/nav/areas";
import { isReachable, mayOpen, routeOf } from "../../src/nav/registry";

const data = buildDemoData();

describe("the registry's roles and the route guard agree", () => {
  for (const role of ["hr", "gm", "manager", "employee", "it"] as const) {
    it(`${role}: every area offered (panel, search) opens`, () => {
      const c = { data, state: { ...INITIAL, role } };
      const bad = ALL_AREAS.filter((a) => a.status === "live" &&
        isReachable(a, role) && !mayOpen(role, routeOf(a, c)))
        .map((a) => a.id);
      expect(bad).toEqual([]);
    });
  }

  it("the IT manager is not offered parallel run or decision cover", () => {
    for (const id of ["setup.parallel", "setup.cover"]) {
      const a = ALL_AREAS.find((x) => x.id === id)!;
      expect(isReachable(a, "it")).toBe(false);
    }
  });
});
