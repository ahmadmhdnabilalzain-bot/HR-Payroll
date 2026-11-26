import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { buildRunSource } from "../../src/demo/data/run-detail";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import {
  itemsNow,
  nextStage,
  offerNow,
  progressOf,
  stageNow,
} from "../../src/people/moves/view";

const d = buildDemoData();
const M = d.moves;
const BANNED = /\b(compliant|approved|approve|certified|guaranteed)\b/i;

const strings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v !== null && typeof v === "object") {
    // `status` is an enum the screens turn into their own words.
    Object.entries(v).filter(([k]) => k !== "status")
      .forEach(([, x]) => strings(x, out));
  }
  return out;
};

describe("moves data", () => {
  it("says no claims anywhere it shows text", () => {
    const all = strings([M.requisitions(), M.candidates(), M.offers(),
      M.joiners(), M.leavers(), M.endings(), M.moves(), M.summary(),
      M.offers().map((o) => M.letter(o.id))]);
    expect(all.filter((x) => BANNED.test(x))).toEqual([]);
  });

  it("keeps pay figures in the letter as money, not text", () => {
    for (const o of M.offers()) {
      const lines = M.letter(o.id);
      const pay = lines.filter((l) => l.kind === "pay");
      expect(pay.length).toBeGreaterThanOrEqual(3);
      expect(lines.filter((l) => l.kind === "text").some((l) =>
        /AED/.test(l.text))).toBe(false);
    }
  });

  it("settlement on the leaver's page is the run's settlement", () => {
    const run = buildRunSource().at({});
    const leavers = M.leavers();
    expect(leavers).toHaveLength(run.settlements.length);
    for (const l of leavers) {
      const s = run.settlements.find((x) => x.personId === l.employeeId);
      expect(s?.total).toBe(l.settlement.total.value);
      expect(run.explain[`gratuity:${l.employeeId}`]).toBeDefined();
    }
  });

  it("joiners and leavers read from the same people", () => {
    for (const l of M.leavers()) {
      expect(d.people.person(l.employeeId)?.status).toBe("left");
    }
    expect(M.joiners().length).toBeGreaterThan(0);
  });
});

describe("moves in the store", () => {
  const j = M.joiners()[0]!;
  const open = j.items.find((x) => x.state !== "done")!;
  const key = `check:${j.id}:${open.key}`;
  const step = { value: "done", from: open.state, by: "emp-001",
    role: "hr" as const, on: M.asOf };

  it("marks an item done and undoes it", () => {
    const before = progressOf(itemsNow(j.id, j.items, INITIAL));
    const s1: DemoState = reduce(INITIAL, { type: "move-step", key, step });
    const after = progressOf(itemsNow(j.id, j.items, s1));
    expect(after.done).toBe(before.done + 1);
    const s2 = reduce(s1, { type: "move-undo", key });
    expect(progressOf(itemsNow(j.id, j.items, s2)).done).toBe(before.done);
  });

  it("moves a candidate a stage and back", () => {
    const c = M.candidates().find((x) => x.stage === "applied")!;
    const to = nextStage(c.stage)!;
    const s1 = reduce(INITIAL, { type: "move-step", key: `stage:${c.id}`,
      step: { ...step, value: to, from: c.stage } });
    expect(stageNow(c, s1)).toBe(to);
    expect(stageNow(c, reduce(s1, { type: "move-undo",
      key: `stage:${c.id}` }))).toBe(c.stage);
  });

  it("offers follow their steps", () => {
    const o = M.offers().find((x) => x.status === "draft")!;
    const s1 = reduce(INITIAL, { type: "move-step", key: `offer:${o.id}`,
      step: { ...step, value: "waiting", from: "draft" } });
    expect(offerNow(o, INITIAL)).toBe("draft");
    expect(offerNow(o, s1)).toBe("waiting");
  });

  it("makes ids in the reducer", () => {
    const draft = { employeeId: "emp-002", submittedOn: M.asOf,
      lastDay: "2026-12-31", reason: "", by: "emp-001",
      checkerId: "emp-003" };
    const s1 = reduce(INITIAL, { type: "ending-new", draft });
    const s2 = reduce(s1, { type: "ending-new", draft });
    expect(s2.newEndings.map((x) => x.id)).toEqual(["end-new-2",
      "end-new-1"]);
    expect(reduce(s2, { type: "ending-undo", id: "end-new-1" })
      .newEndings).toHaveLength(1);
  });
});
