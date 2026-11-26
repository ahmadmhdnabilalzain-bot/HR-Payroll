import type { Fils } from "@payroll/engine";
import type { DemoData } from "../../demo/data/types";
import { decisionsFor, openApprovals } from "../../demo/approvals";
import { figures } from "../../demo/figures";
import type { DemoState } from "../../demo/state";
import { formatDate, formatMonthName } from "../../i18n/format";
import { hours, percent, plural, share } from "../fmt";
import type { ReportsSource } from "../types";

/** "1 blocks approval", "2 block approval": the plural helper. */
export const blockText = (n: number): string =>
  `${n} ${n === 1 ? "blocks" : "block"} approval`;

/** HR dashboard rows: people, papers and what is waiting. Pure. */
export function hrDashboardRows(src: ReportsSource, data: DemoData,
  state: DemoState): string[][] {
  const fig = figures(data, state);
  const last = src.months.at(-1)!;
  const sum = (k: "start" | "joined" | "departed" | "now"): number =>
    src.departments.reduce((n, d) => n + d[k], 0);
  const docs = data.documents();
  const soon = docs.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30);
  const gone = docs.filter((d) => d.daysLeft < 0);
  const waiting = openApprovals(data, state).length;
  const asOf = formatDate(data.payCalendar().asOf, "en");
  return [
    ["Problems that block approval", String(fig.blocking),
      `${fig.toReview} to review`, fig.blocking === 0
        ? "Nothing holds the run back"
        : "Bank details to enter before the run can be approved"],
    [`Active on ${asOf}`, String(fig.activeToday),
      `${sum("start")} on 1 January`, "Employed on the demo date"],
    [`On the ${formatMonthName(data.headline().runMonth, "en")} payroll`,
      String(fig.onPayroll),
      "-", "Includes anyone paid for part of the month"],
    ["Joined this year", String(sum("joined")), "-",
      src.joiners.join(", ") || "Nobody"],
    ["Left this year", String(sum("departed")), "-",
      src.leavers.join(", ") || "Nobody"],
    ["Turnover this year", sum("departed") === 0 ? "None"
      : share(sum("departed"), (sum("start") + sum("now")) / 2), "-",
    "People who left, against the average headcount"],
    ["Papers expiring in 30 days", String(soon.length),
      `${gone.length} already expired`, "Visas, Emirates IDs and " +
        "passports to renew"],
    ["Waiting for a decision", String(waiting), "-",
      "Requests in the approvals inbox"],
    [`Unpaid leave in ${last.label}`, plural(last.unpaidDays, "day",
      "days"), `${plural(last.sickDays, "sick day", "sick days")}`,
    "Working days taken in the run month"],
  ];
}

/** Executive dashboard rows: the run, what moved it, what it costs. */
export function execDashboardRows(src: ReportsSource, data: DemoData,
  state: DemoState, m: (f: Fils) => string,
  signed: (f: Fils) => string): string[][] {
  const fig = figures(data, state);
  const now = src.months.at(-1)!;
  const before = src.months.at(-2)!;
  const top = [...data.departments()].sort((a, b) =>
    a.costFils < b.costFils ? 1 : -1)[0];
  const v = src.variance(now.month, before.month);
  const main = v.drivers[0];
  const waiting = decisionsFor(data, state).length;
  return [
    ["Gross pay", m(now.gross), m(before.gross),
      `${signed(v.grossChange)} (${percent(v.grossChange,
        before.gross)}) on ${before.label}`],
    ["Biggest cause of the change", main === undefined ? "-"
      : signed(main.amount), main?.label ?? "-",
    main === undefined ? "Nothing moved" : main.people.join(", ")],
    ["People paid", String(now.headcount), String(before.headcount),
      "Includes the leaver's part month"],
    ["Overtime this month", m(now.overtimeAmount),
      m(before.overtimeAmount), `${hours(now.overtimeMinutes)} hours ` +
        `across ${plural(now.overtimePeople, "person", "people")}`],
    ["Held out of the salary file", m(fig.heldNetFils), "-",
      "Net pay with no valid bank account yet"],
    ["Waiting for your decision", String(waiting), "-",
      "Open Home to decide"],
    ["Biggest department", top === undefined ? "-" : m(top.costFils),
      top === undefined ? "-" : top.name.en, "Gross cost for the month"],
  ];
}
