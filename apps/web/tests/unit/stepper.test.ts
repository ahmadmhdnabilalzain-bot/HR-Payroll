import { describe, expect, it } from "vitest";
import type { RunApproval } from "../../src/demo/actions";
import { demoClockIso, STEPS, stepStates } from "../../src/payrun/model";

const run = (blocked: number, phase: RunApproval["phase"]): RunApproval =>
  ({ phase, isChecker: true, blockedBy: Array(blocked).fill("x"),
    canDecide: false, decide: () => undefined });

describe("the pay run stepper has one current step", () => {
  const cases: [RunApproval, string][] = [
    [run(2, "bank-details"), "fix"], [run(0, "approve"), "approve"],
    [run(0, "file"), "pay"]];
  for (const [a, cur] of cases) {
    it(`${a.phase}: ${cur} is the only step now, wherever you look`, () => {
      for (const at of STEPS) {
        const st = stepStates(at, a);
        const now = STEPS.filter((x) => st[x] === "now" ||
          st[x] === "tofix");
        expect(now).toEqual([cur]);
        const i = STEPS.indexOf(cur as never);
        for (const x of STEPS.slice(0, i)) expect(st[x]).toBe("done");
      }
    });
  }
});

describe("the demo clock reads later than the preparation", () => {
  it("a sign-off at once is a few minutes after 09:30, same day", () => {
    const iso = demoClockIso(1000, "2026-10-27", "09:30", 1000);
    // 09:42 in Dubai (UTC+4) is 05:42 UTC, on 27 October 2026.
    expect(iso).toBe("2026-10-27T05:42:00.000Z");
  });
  it("time runs on from the page opening", () => {
    const iso = demoClockIso(1000 + 3 * 60_000, "2026-10-27", "09:30",
      1000);
    expect(iso).toBe("2026-10-27T05:45:00.000Z");
  });
});
