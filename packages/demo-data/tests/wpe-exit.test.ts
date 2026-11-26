import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  exitFlowOf,
  exitFlows,
  finalSettlements,
  leaverChecklistView,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE exit flow (R34)", () => {
  it("one flow per leaver, on the run's own settlement", () => each((c) => {
    const flows = exitFlows(c);
    const s = finalSettlements(c);
    expect(flows.map((f) => f.employeeId)).toEqual(s.map((x) =>
      x.employeeId));
    for (const f of flows) {
      expect(leaverChecklistView(c, f.employeeId)).not.toBeNull();
      expect(exitFlowOf(c, f.employeeId)).toEqual(f);
    }
  }));

  it("the pay-by day is 14 days after the last day, in words", () =>
    each((c) => {
      const f = exitFlows(c)[0]!;
      expect(f.lastDay).toBe("15 Oct 2026");
      expect(f.payBy).toBe("29 Oct 2026");
      expect(f.daysToPay).toBe(2);
      const by = f.flags.find((x) => x.id === "pay-by")!;
      expect(by.word).toBe("Check");
      expect(by.text).toMatch(/As we read it/);
    }));

  it("names what is not worked out and keeps the run's separation", () =>
    each((c) => {
      const f = exitFlows(c)[0]!;
      const n = f.flags.find((x) => x.id === "not-worked-out")!;
      expect(n.text).toMatch(/notice pay/);
      expect(f.flags.find((x) => x.id === "run")!.text)
        .toMatch(/outside the run/);
    }));

  it("no banned word, no raw date, no claim for an authority", () =>
    each((c) => {
      const t = asText(exitFlows(c));
      expect(t).not.toMatch(BANNED_WORDS);
      expect(t).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
      expect(t).not.toMatch(/compliant|guarantee/i);
    }));
});
