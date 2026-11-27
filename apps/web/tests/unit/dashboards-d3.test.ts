import { describe, expect, it } from "vitest";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { isBlocking, openIssues } from "../../src/demo/derive";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import {
  beforeApproval,
  deptView,
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
  sub: `${b.checks} to check`,
  calm: { unit: "to check", sub: "nothing stops pay" } });
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
      const t = tile(ts, "before-approval");
      // Nothing stops pay: the big figure is the checks left, never a
      // 0 over "6 to check".
      expect(count(t)).toBe(b.stops === 0 ? b.checks : b.stops);
      expect(t.sub).toBe(b.stops === 0 ? "nothing stops pay"
        : `${b.checks} to check`);
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
    const bars = trendBars(src, "To sign off");
    expect(bars).toHaveLength(10);
    expect(bars.at(-2)).toMatchObject({ label: "Sep", mark: "Paid" });
    expect(bars.at(-1)).toMatchObject({ label: "Oct", mark: "To sign off",
      focus: true });
    expect(bars.filter((b) => b.mark !== undefined)).toHaveLength(2);
    expect(bars.map((b) => b.value)).toEqual(src.months.map((m) => m.gross));
  });
});

describe("the board pack summary reads rows that exist", () => {
  it("finds every row it lifts a figure from", async () => {
    const { buildMoreSource } = await import("../../src/reports/more/source");
    const { board } = buildMoreSource();
    for (const m of ["On the October payroll", "Gratuity", "Loans",
      "Gross plus employer cost", "Problems before sign-off"]) {
      expect(board.rows.some((r) => r.measure.startsWith(m))).toBe(true);
    }
    expect(Number(board.rows.find((r) => r.measure ===
      "On the October payroll")?.text)).toBe(demo.at({}).headline()
      .headcount);
  });
});

describe("the dashboards agree with Home and with themselves", () => {
  it("September and October net match Home's trend (payTrend)", async () => {
    const { buildPayView } = await import("../../src/demo/data/pay");
    const runs = buildPayView().runs;
    const oct = runs.at(-1)!;
    const sep = runs.at(-2)!;
    expect(oct.net).toBe(src.months.at(-1)!.net);
    expect(sep.net).toBe(src.months.at(-2)!.net);
    // Home's "against Sep" is the exec tile's change.
    const net = tile(execTiles(src, demo.at({}), INITIAL, words), "net");
    expect(net.change?.kind === "money" ? net.change.fils : 0n)
      .toBe(oct.change);
  });

  it("people by department add up to the people on the payroll", () => {
    const now = src.departments.reduce((n, d) => n + d.now, 0);
    expect(now).toBe(30);
    expect(demo.at({}).team.chart()).toBeDefined();
  });
});

describe("the details table and the department view", () => {
  it("has no 'Compared with' column: three cells a row", async () => {
    const { execDashboardRows, hrDashboardRows } = await import(
      "../../src/reports/screens/dashboard-rows");
    const d = demo.at({});
    const m = (f: bigint): string => String(f);
    for (const r of hrDashboardRows(src, d, INITIAL)) {
      expect(r).toHaveLength(3);
    }
    for (const r of execDashboardRows(src, d, INITIAL, m, m)) {
      expect(r).toHaveLength(3);
    }
  });

  it("people paid draws from zero, others on their own range", () => {
    const d = demo.at({});
    expect(tile(hrTiles(src, d, INITIAL, words), "paid").zero).toBe(true);
    expect(tile(execTiles(src, d, INITIAL, words), "paid").zero).toBe(true);
    expect(tile(execTiles(src, d, INITIAL, words), "net").zero)
      .toBeUndefined();
  });

  it("cost per head is the department's cost over its people", () => {
    const d = demo.at({});
    const v = deptView(d);
    expect(v).toHaveLength(d.departments().length);
    for (const x of v) {
      const h = BigInt(x.row.headcount);
      expect(x.perHead * h - x.row.costFils <= h).toBe(true);
      expect(x.row.costFils - x.perHead * h <= h).toBe(true);
    }
    for (let i = 1; i < v.length; i++) {
      expect(v[i - 1]!.perHead >= v[i]!.perHead).toBe(true);
    }
    const total = v.reduce((n, x) => n + x.share, 0);
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(v.length);
  });
});

describe("every dashboard line opens a page", () => {
  it("each row of both dashboards, the brief and the board has one",
    async () => {
      const { areaHref } = await import("../../src/reports/dash/itemSeam");
      const { execDashboardRows, hrDashboardRows } = await import(
        "../../src/reports/screens/dashboard-rows");
      const { buildMoreSource } = await import(
        "../../src/reports/more/source");
      const { brief, board } = buildMoreSource();
      const d = demo.at({});
      const m = (f: bigint): string => String(f);
      const words = [
        ...hrDashboardRows(src, d, INITIAL).map((r) => String(r[0])),
        ...execDashboardRows(src, d, INITIAL, m, m)
          .map((r) => String(r[0])),
        ...brief.items.map((i) => `${i.area}: ${i.item}`),
        ...board.rows.map((r) => r.measure)];
      for (const w of words) expect(areaHref(w), w).toMatch(/^#\//);
      expect(areaHref("Before sign-off")).toBe("#/pay-run/fix");
      expect(areaHref("Leave requests waiting"))
        .toBe("#/reports/leave");
      expect(areaHref("Gratuity if everyone left today"))
        .toBe("#/reports/gratuity-liability");
    });

  it("every tile links", () => {
    const d = demo.at({});
    for (const t of [...hrTiles(src, d, INITIAL, words),
      ...execTiles(src, d, INITIAL, words)]) {
      expect(t.href, t.id).toMatch(/^#\//);
    }
  });
});
