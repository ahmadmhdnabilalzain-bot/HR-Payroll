import { describe, expect, it } from "vitest";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { isBlocking, openIssues } from "../../src/demo/derive";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import {
  beforeApproval,
  execTiles,
  hrTiles,
  trendBars,
  type IssueWords,
  type TileModel,
} from "../../src/reports/dash/model";
import { buildReportsSource } from "../../src/reports/source";

const src = buildReportsSource();
const demo = buildDemoSource();
const words: IssueWords = (b) => ({ unit: "stop pay",
  sub: `${b.checks} to check` });
const tile = (ts: TileModel[], id: string): TileModel =>
  ts.find((t) => t.id === id)!;
const money = (t: TileModel): bigint =>
  t.figure.kind === "money" ? t.figure.fils : -1n;
const count = (t: TileModel): number =>
  t.figure.kind === "count" ? t.figure.n : -1;

/** Fix's own counting (payrun/FixStep.tsx), written out again. */
function fixCounts(s: DemoState): { stops: number; checks: number } {
  const d = demo.at(s.ibans);
  const issues = d.issues().filter((i) => i.kind === "issue");
  return { stops: issues.filter(isBlocking).length,
    checks: issues.filter((i) => !isBlocking(i) &&
      s.resolved[i.id] === undefined).length };
}

const STATES: [string, DemoState][] = (() => {
  const d = demo.at({});
  const held = d.heldIds()[0]!;
  const iban = demo.bankLetterIban(held);
  const check = openIssues(d, INITIAL).find((i) => !isBlocking(i))!;
  const withIban = reduce(INITIAL, { type: "iban", employeeId: held,
    value: iban });
  const reviewed = reduce(INITIAL, { type: "resolve", id: check.id,
    how: "reviewed" });
  return [["initial", INITIAL], ["one IBAN saved", withIban],
    ["one check reviewed", reviewed]];
})();

describe("dashboard tiles agree with their selectors", () => {
  it.each(STATES)("before approval matches Fix (%s)", (_, s) => {
    const d = demo.at(s.ibans);
    const b = beforeApproval(d, s);
    expect(b).toEqual(fixCounts(s));
    expect(b.stops + b.checks).toBe(openIssues(d, s).length);
    for (const ts of [execTiles(src, d, s, words), hrTiles(src, d, s,
      words)]) {
      expect(count(tile(ts, "before-approval"))).toBe(b.stops);
      expect(tile(ts, "before-approval").sub).toBe(`${b.checks} to check`);
    }
  });

  it("starts at 2 stop pay and 6 to check, as Fix and Home say", () => {
    expect(beforeApproval(demo.at({}), INITIAL))
      .toEqual({ stops: 2, checks: 6 });
  });

  it.each(STATES)("net and gross are the run's own (%s)", (_, s) => {
    const d = demo.at(s.ibans);
    const h = d.headline();
    const ts = execTiles(src, d, s, words);
    expect(money(tile(ts, "net"))).toBe(h.netTotalFils);
    expect(money(tile(ts, "gross"))).toBe(h.grossTotalFils);
  });

  it("the history's October is the live run, so the lines end on it", () => {
    const h = demo.at({}).headline();
    const oct = src.months.at(-1)!;
    expect(oct.net).toBe(h.netTotalFils);
    expect(oct.gross).toBe(h.grossTotalFils);
    expect(oct.headcount).toBe(h.headcount);
  });

  it("changes are against September from the same history", () => {
    const d = demo.at({});
    const sep = src.months.at(-2)!;
    const oct = src.months.at(-1)!;
    const ts = execTiles(src, d, INITIAL, words);
    const net = tile(ts, "net").change;
    expect(net).toMatchObject({ kind: "money", against: "Sep" });
    expect(net?.kind === "money" ? net.fils : 0n).toBe(oct.net - sep.net);
    const paid = tile(hrTiles(src, d, INITIAL, words), "paid");
    expect(count(paid)).toBe(oct.headcount);
    expect(paid.change).toMatchObject({ n: oct.headcount - sep.headcount });
    expect(paid.series).toEqual(src.months.map((m) => m.headcount));
    expect(paid.compare).toBe(sep.headcount);
  });

  it("leave and overtime tiles are the history's October", () => {
    const oct = src.months.at(-1)!;
    const ts = hrTiles(src, demo.at({}), INITIAL, words);
    expect(count(tile(ts, "leave"))).toBe(oct.annualDays + oct.sickDays +
      oct.unpaidDays);
    expect(count(tile(ts, "overtime"))).toBe(oct.overtimeMinutes / 60);
  });

  it("the trend marks September (paid) and October (this run)", () => {
    const bars = trendBars(src, "To approve");
    expect(bars).toHaveLength(10);
    expect(bars.at(-2)).toMatchObject({ label: "Sep", mark: "Paid" });
    expect(bars.at(-1)).toMatchObject({ label: "Oct", mark: "To approve",
      focus: true });
    expect(bars.filter((b) => b.mark !== undefined)).toHaveLength(2);
    expect(bars.map((b) => b.value)).toEqual(src.months.map((m) => m.gross));
  });
});
