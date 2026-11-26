import { describe, expect, it } from "vitest";
import { parseHash } from "../../src/demo/route";
import { EID_INITIAL, reduceEid } from "../../src/demo/eid-state";
import { INITIAL, reduce } from "../../src/demo/state";
import { buildDemoData } from "../../src/demo/data/adapter";
import { letterRows } from "../../src/people/papers/model";

describe("unknown routes", () => {
  it("an empty hash is Home, a made-up one is not found", () => {
    expect(parseHash("")).toEqual({ section: "home", rest: [] });
    expect(parseHash("#/home")).toEqual({ section: "home", rest: [] });
    expect(parseHash("#/nonsense").unknown).toBe(true);
    expect(parseHash("#/people/emp-001"))
      .toEqual({ section: "people", rest: ["emp-001"] });
  });
});

describe("Emirates ID reveal", () => {
  const entry = { employeeId: "emp-023", by: "emp-028", role: "hr" as const,
    on: "2026-11-01" };
  it("logs each Show and masks again on hide", () => {
    const a = reduceEid(EID_INITIAL, { type: "eid-show", entry });
    expect(a.eidShown).toBe("emp-023");
    expect(a.eidLog).toEqual([entry]);
    const b = reduceEid(a, { type: "eid-hide" });
    expect(b.eidShown).toBeNull();
    expect(b.eidLog).toEqual([entry]);
  });
  it("a role switch masks it", () => {
    const a = reduce(INITIAL, { type: "eid-show", entry });
    expect(reduce(a, { type: "role", role: "gm" }).eidShown).toBeNull();
  });
});

describe("letter references", () => {
  it("read like ZB-LTR-2026-0140, never masked", () => {
    const d = buildDemoData();
    for (const l of letterRows(d, INITIAL)) {
      expect(l.reference).toMatch(/^ZB-LTR-2026-\d{4}$/);
    }
  });
});
