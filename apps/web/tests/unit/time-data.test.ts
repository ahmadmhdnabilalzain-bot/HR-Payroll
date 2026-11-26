import { describe, expect, it } from "vitest";
import { buildTimeSource } from "../../src/demo/data/time";
import { reduce, INITIAL } from "../../src/demo/state";
import { phaseOf } from "../../src/time/decisions";
import { todayRows, needsLook } from "../../src/time/Today";
import { hm } from "../../src/time/words";

const t = buildTimeSource().data;

describe("time data", () => {
  it("claims: five paid in October, two waiting for November", () => {
    expect(t.claims.filter((c) => c.phase === "paid")).toHaveLength(5);
    expect(t.claims.filter((c) => c.phase === "waiting")).toHaveLength(2);
    expect(t.claims.every((c) => c.value > 0n)).toBe(true);
  });

  it("a decision changes the phase and undo restores it", () => {
    const w = t.claims.find((c) => c.phase === "waiting")!;
    expect(phaseOf(w, INITIAL)).toBe("waiting");
    const s = reduce(INITIAL, { type: "time-decide", id: w.id,
      verdict: "accept", by: "emp-028" });
    expect(phaseOf(w, s)).toBe("accepted");
    expect(phaseOf(w, reduce(s, { type: "time-undo", id: w.id })))
      .toBe("waiting");
  });

  it("today lists everyone on the payroll once", () => {
    const rows = todayRows(t, new Set(t.activeToday));
    expect(rows).toHaveLength(t.activeToday.length);
    expect(rows.filter(needsLook)).toHaveLength(0);
  });

  it("late arrivals and the roster come through", () => {
    expect(t.sheets.flatMap((s) => s.late)).toHaveLength(3);
    expect(t.rosterDays).toHaveLength(14);
    expect(t.unmatched).toHaveLength(2);
  });

  it("formats minutes", () => {
    expect(hm(90)).toBe("1 h 30 min");
    expect(hm(0)).toBe("–");
  });
});
