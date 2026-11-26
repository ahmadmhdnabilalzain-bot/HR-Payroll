import { describe, expect, it } from "vitest";
import { ALL_AREAS } from "../../src/nav/areas";
import { isDecision } from "../../src/nav/short";

const area = (id: string) => {
  const a = ALL_AREAS.find((x) => x.id === id);
  if (a === undefined) throw new Error(`no area ${id}`);
  return a;
};

describe("the panel's Waiting column", () => {
  it("counts-decisions-only-not-open-work", () => {
    for (const id of ["people.expiring", "people.incidents",
      "people.training", "time.punches", "time.plan", "pay.hold",
      "people.helpdesk", "people.everyone"]) {
      expect(isDecision(area(id)), id).toBe(false);
    }
    for (const id of ["time.requests", "pay.approve", "pay.loans",
      "people.letters", "time.overtime", "setup.access-requests"]) {
      expect(isDecision(area(id)), id).toBe(true);
    }
  });
});
