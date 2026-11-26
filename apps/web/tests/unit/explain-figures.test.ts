import { describe, expect, it } from "vitest";
import {
  contractProblems,
  isSum,
  type ExplainValue,
  type Explanation,
} from "../../src/components/explain/types";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { buildRunSource } from "../../src/demo/data/run-detail";
import { pendingApprovals } from "../../src/demo/derive";
import * as live from "../../src/demo/live-explain";
import { INITIAL, type DemoState } from "../../src/demo/state";
import { offOn, requestRows } from "../../src/demo/time-off";
import { share } from "../../src/reports/fmt";
import { buildReportsSource } from "../../src/reports/source";

/**
 * Every figure made explainable: its working meets the contract, opts
 * in to the sum check (each run of parts adds up to its total, the
 * last total is the result), and the result is the figure the screen
 * shows, read from the same selector the screen reads. Two demo states:
 * as it opens, and with every IBAN taken from the bank letter.
 */

const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;
const CODES = /\b(mod 97|[A-Z]{3,}_[A-Z_]+|\d{4}-\d{2}-\d{2})\b/;
const AED = /AED\s?\d/;

const numberOf = (v: ExplainValue): bigint | number | string =>
  v.kind === "money" ? v.fils : v.kind === "count" ? v.n : v.text;

/** Every figure checked, by explanation id (for the count). */
const CHECKED = new Set<string>();

function holds(e: Explanation | undefined, shown: bigint | number | string,
  where: string): void {
  expect(e, `${where}: no explanation`).toBeDefined();
  if (e === undefined) return;
  expect(contractProblems(e), `${where} (${e.id})`).toEqual([]);
  expect(isSum(e), `${where} (${e.id}) has no total`).toBe(true);
  expect(numberOf(e.result.value), `${where} (${e.id})`).toBe(shown);
  const words = [e.title, e.summary, ...e.steps.map((s) => s.text),
    ...e.rules.map((r) => r.text), ...e.notComputed,
    ...e.inputs.map((i) => i.label)];
  expect(words.filter((x) => BANNED.test(x) || CODES.test(x) ||
    AED.test(x)), e.id).toEqual([]);
  CHECKED.add(e.id);
}

const src = buildDemoSource();
const runs = buildRunSource();
const held = src.at({}).heldIds();
const typos = src.at({}).badIbanIds();
const FIXED = Object.fromEntries([...held, ...typos].map((id) =>
  [id, src.bankLetterIban(id)]));
const STATES: [string, Readonly<Record<string, string>>][] = [
  ["as it opens", {}], ["with every IBAN fixed", FIXED]];

describe("reports: every explainable figure adds up", () => {
  const r = buildReportsSource();

  it("payroll-trend-total-and-each-month", () => {
    holds(r.explain["trend:total"], r.grossTotal, "trend total");
    for (const m of r.months) {
      holds(r.explain[`trend:${m.month}`], m.gross, `gross ${m.month}`);
      holds(r.explain[`trend-net:${m.month}`], m.net, `net ${m.month}`);
    }
    const paid = r.months.filter((m) => m.paid)
      .reduce((n, m) => n + m.gross, 0n);
    holds(r.explain["trend:paid"], paid, "paid months");
  });

  it("variance-headline-and-each-driver-for-every-month", () => {
    for (let i = 1; i < r.months.length; i++) {
      const v = r.variance(r.months[i]!.month, r.months[i - 1]!.month);
      holds(v.explanation, v.grossChange, `variance ${v.month}`);
      for (const d of v.drivers) {
        holds(v.driverExplain[d.key], d.amount, `${v.month} ${d.key}`);
      }
    }
  });

  it("overtime-total-and-each-month", () => {
    holds(r.explain["overtime:total"], r.overtimeTotal, "overtime");
    for (const m of r.months) {
      holds(r.explain[`overtime:${m.month}`], m.overtimeAmount,
        `overtime ${m.month}`);
    }
  });

  it("headcount-now-and-turnover", () => {
    holds(r.explain["headcount:now"], r.heads.now, "headcount");
    holds(r.explain["turnover:total"], r.turnover, "turnover");
    const h = r.heads;
    expect(r.turnover).toBe(share(h.departed, (h.start + h.now) / 2));
    expect(r.heads.now).toBe(r.departments.reduce((n, d) => n + d.now, 0));
  });

  it("annual-leave-left", () => {
    holds(r.explain["leave:annual-left"], r.annualLeftTotal, "leave");
  });
});

describe.each(STATES)("pay run figures, %s", (_name, ibans) => {
  const d = runs.at(ibans);
  const data = src.at(ibans);
  const h = data.headline();

  it("review-and-summary-totals", () => {
    holds(d.explain["run:net"], d.totals.net, "net");
    holds(d.explain["run:gross"], d.totals.gross, "gross");
    holds(d.explain["run:deductions"], d.totals.deductions, "deductions");
    holds(d.explain["run:people"], d.totals.headcount, "people");
    holds(d.explain["run:file"], d.file.total, "salary file");
    holds(d.explain["run:held"], h.heldNetFils, "held out");
    expect(d.totals.net).toBe(h.netTotalFils);
  });

  it("cost-by-department-and-nationality", () => {
    const rows = data.departments();
    for (const x of rows) {
      holds(d.explain[`dept-cost:${x.id}`], x.costFils, `dept ${x.id}`);
    }
    holds(d.explain["dept-cost:total"],
      rows.reduce((n, x) => n + x.costFils, 0n), "dept total");
    for (const x of d.nationalities.rows) {
      holds(d.explain[`nationality:${x.name}`], x.count, x.name);
    }
    holds(d.explain["nationality:total"], d.nationalities.total,
      "nationality total");
  });

  it("live-counts", () => {
    const state: DemoState = { ...INITIAL, role: "gm", ibans };
    const list = pendingApprovals(data, state);
    holds(live.waitingExplain(data, list, d.scope), list.length,
      "waiting");
    holds(live.issuesExplain(data, d.scope), h.issuesOpen, "issues");
    holds(live.headcountExplain(data, d.scope), h.headcount, "headcount");
    const away = offOn(requestRows(data, state), data.payCalendar().asOf);
    holds(live.onLeaveExplain(data, away, d.scope), away.length, "away");
    const soon = data.documents().filter((x) => x.daysLeft <= 30);
    holds(live.docsExplain(data, soon, "Documents", "ends soon", d.scope),
      soon.length, "documents");
  });
});

describe("coverage", () => {
  it("every-figure-above-was-checked", () => {
    // Runs last in this file: the ids gathered by the checks above.
    expect(CHECKED.size).toBeGreaterThan(80);
  });
});
