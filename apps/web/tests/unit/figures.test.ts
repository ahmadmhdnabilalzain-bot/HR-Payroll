import { describe, expect, it } from "vitest";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { approvalBlockedBy } from "../../src/demo/derive";
import { figures } from "../../src/demo/figures";
import { INITIAL, type DemoState } from "../../src/demo/state";
import { formatMoney } from "../../src/i18n/format";
import { buildMoreSource } from "../../src/reports/more/source";
import { boardRows, briefRows } from "../../src/reports/more/rows";
import {
  execDashboardRows,
  hrDashboardRows,
} from "../../src/reports/screens/dashboard-rows";
import { buildReportsSource } from "../../src/reports/source";

const source = buildDemoSource();
const reports = buildReportsSource();
const more = buildMoreSource();
const m = (f: bigint): string => formatMoney(f as never, "en");

/** Every surface's figure for the same measure, read through its own
 * selector, so a stale page shows up as a mismatch. */
function surfaces(s: DemoState) {
  const d = source.at(s.ibans);
  const fig = figures(d, s);
  const brief = briefRows(more.brief, { fig, verdict: undefined,
    settlementFils: null }, m);
  const board = boardRows(more.board, fig, m);
  const hr = hrDashboardRows(reports, d, s);
  const exec = execDashboardRows(reports, d, s, m, m);
  const cell = (rows: string[][], head: string, col: number): string =>
    rows.find((r) => r[0]!.startsWith(head))?.[col] ?? "missing";
  return { fig,
    held: [m(fig.heldNetFils),
      cell(brief, "Pay: Held out of the salary file", 2),
      cell(exec, "Held out of the salary file", 1)],
    open: [String(fig.open),
      cell(brief, "Pay: Problems to fix before sign-off", 2),
      cell(board, "Open items: Problems before sign-off", 2)],
    blocking: [String(fig.blocking),
      cell(hr, "Problems that block approval", 1)],
    onPayroll: [String(fig.onPayroll),
      cell(board, "People: On the October payroll", 2),
      cell(hr, "On the October payroll", 1)],
    active: [String(fig.activeToday),
      cell(board, "People: Active on 27 Oct 2026", 2),
      cell(hr, "Active on 27 Oct", 1)] };
}

const KEYS = ["held", "open", "blocking", "onPayroll", "active"] as const;

const allSame = (xs: string[]): void => {
  expect(new Set(xs).size, xs.join(" | ")).toBe(1);
};

describe("one figure on every surface", () => {
  const before = INITIAL;
  const held = approvalBlockedBy(source.at({}), before);
  const after: DemoState = { ...INITIAL, ibans: Object.fromEntries(
    held.map((id) => [id, source.bankLetterIban(id)])) };

  it("two bank details hold the run before the fix", () => {
    expect(held).toHaveLength(2);
    const x = surfaces(before);
    expect(x.fig.blocking).toBe(2);
    expect(x.fig.heldNetFils > 0n).toBe(true);
    for (const k of KEYS) allSame(x[k]);
  });

  it("after both IBANs, every surface agrees on the new figures", () => {
    const x = surfaces(after);
    const b = surfaces(before);
    expect(x.fig.blocking).toBe(0);
    expect(x.fig.heldNetFils).toBe(0n);
    expect(x.fig.open).toBe(b.fig.open - 2);
    expect(x.held[0]).toBe(m(0n));
    for (const k of KEYS) allSame(x[k]);
  });

  it("31 on the payroll and 30 active are two labelled figures", () => {
    const x = surfaces(before);
    expect(x.fig.onPayroll).toBe(31);
    expect(x.fig.activeToday).toBe(30);
  });
});
