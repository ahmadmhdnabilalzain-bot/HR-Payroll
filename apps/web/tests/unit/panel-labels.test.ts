import { describe, expect, it } from "vitest";
import { ALL_AREAS } from "../../src/nav/areas";

const byId = (id: string) => ALL_AREAS.find((a) => a.id === id)!;

describe("panel labels and counts", () => {
  it("labels-are-plain-short-names", () => {
    for (const a of ALL_AREAS) {
      expect([a.id, /[:,(]/.test(a.label.en)]).toEqual([a.id, false]);
      expect([a.id, a.label.en.split(" ").length <= 3])
        .toEqual([a.id, true]);
    }
  });

  it("no-repeated-labels-in-a-section", () => {
    for (const s of new Set(ALL_AREAS.map((a) => a.section))) {
      const ls = ALL_AREAS.filter((a) => a.section === s)
        .map((a) => a.label.en);
      expect(new Set(ls).size).toBe(ls.length);
    }
  });

  it("totals-carry-no-count", () => {
    for (const id of ["people.everyone", "people.positions",
      "people.appraisals", "people.goals", "people.requisitions",
      "people.board", "people.joiners", "people.leavers",
      "people.visas"]) {
      expect([id, byId(id).count]).toEqual([id, undefined]);
    }
  });
});
