import type { DemoData } from "../../demo/data/types";
import { decisionsFor, waitingCount } from "../../demo/approvals";
import { figures } from "../../demo/figures";
import type { DemoState } from "../../demo/state";
import {
  formatDate,
  formatMoney,
  formatMonthName,
} from "../../i18n/format";
import { hours, percent, plural, share } from "../fmt";
import type { Cell } from "../../ui/templates";
import type { ReportsSource } from "../types";

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
  const waiting = waitingCount(data, state);
  const asOf = formatDate(data.payCalendar().asOf, "en");
  const and = (x: string, y: string): string => `${x}; ${y}`;
  return [
    ["Problems that stop pay", String(fig.blocking),
      and(fig.blocking === 0 ? "Nothing holds the run back"
        : "Bank details to enter before the run can be signed off",
      `${fig.toReview} to check`)],
    [`Active on ${asOf}`, String(fig.activeToday),
      and("Employed on the report date", `${sum("start")} on 1 January`)],
    [`On the ${formatMonthName(data.headline().runMonth, "en")} payroll`,
      String(fig.onPayroll),
      "Includes anyone paid for part of the month"],
    ["Joined this year", String(sum("joined")),
      src.joiners.join(", ") || "Nobody"],
    ["Left this year", String(sum("departed")),
      src.leavers.join(", ") || "Nobody"],
    ["Turnover this year", sum("departed") === 0 ? "None"
      : share(sum("departed"), (sum("start") + sum("now")) / 2),
    "People who left, against the average headcount"],
    ["Papers expiring in 30 days", String(soon.length),
      and("Visas and Emirates IDs to renew",
        `${gone.length} already expired`)],
    ["Waiting for a decision", String(waiting),
      "Requests in the decisions inbox"],
    [`Unpaid leave in ${last.label}`, plural(last.unpaidDays, "day",
      "days"), and("Working days taken in the run month",
      `${plural(last.sickDays, "sick day", "sick days")} besides`)],
  ];
}

/** Executive dashboard rows: the run, what moved it, what it costs. */
export function execDashboardRows(src: ReportsSource, data: DemoData,
  state: DemoState, signed: (f: bigint) => string,
  money: (f: bigint) => string = (f) => formatMoney(f as never, "en"))
  : Cell[][] {
  const fig = figures(data, state);
  const now = src.months.at(-1)!;
  const before = src.months.at(-2)!;
  const top = [...data.departments()].sort((a, b) =>
    a.costFils < b.costFils ? 1 : -1)[0];
  const v = src.variance(now.month, before.month);
  const main = v.drivers[0];
  const waiting = decisionsFor(data, state).length;
  return [
    ["Gross pay", { fils: now.gross },
      `${signed(v.grossChange)} (${percent(v.grossChange,
        before.gross)}) against ${money(before.gross)} in ${before.label}`],
    ["Biggest cause of the change", main === undefined ? "-"
      : { fils: main.amount, signed: true }, main === undefined
      ? "Nothing moved" : `${main.label}: ${main.people.join(", ")}`],
    ["People paid", String(now.headcount),
      `${before.headcount} in ${before.label}; includes the leaver's ` +
        "part month"],
    ["Overtime this month", { fils: now.overtimeAmount },
      `${hours(now.overtimeMinutes)} hours across ` +
        `${plural(now.overtimePeople, "person", "people")}; ` +
        `${money(before.overtimeAmount)} in ${before.label}`],
    ["Held out of the salary file", { fils: fig.heldNetFils },
      "Net pay with no valid bank account yet"],
    ["Waiting for your decision", String(waiting),
      "Open Home to decide"],
    ["Biggest department", top === undefined ? "-"
      : { fils: top.costFils },
    top === undefined ? "-" : `${top.name.en}: gross cost for the month`],
  ];
}
