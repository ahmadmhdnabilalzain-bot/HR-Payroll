import type { DemoData } from "../../demo/data/types";
import { decisionsFor, waitingCount } from "../../demo/approvals";
import { figures } from "../../demo/figures";
import type { DemoState } from "../../demo/state";
import { formatDate, formatMonthName } from "../../i18n/format";
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
  return [
    ["Problems that stop pay", String(fig.blocking),
      `${fig.toReview} to check`, fig.blocking === 0
        ? "Nothing holds the run back"
        : "Bank details to enter before the run can be signed off"],
    [`Active on ${asOf}`, String(fig.activeToday),
      `${sum("start")} on 1 January`, "Employed on the report date"],
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
      `${gone.length} already expired`, "Visas and Emirates IDs " +
        "to renew"],
    ["Waiting for a decision", String(waiting), "-",
      "Requests in the decisions inbox"],
    [`Unpaid leave in ${last.label}`, plural(last.unpaidDays, "day",
      "days"), `${plural(last.sickDays, "sick day", "sick days")}`,
    "Working days taken in the run month"],
  ];
}

/** Executive dashboard rows: the run, what moved it, what it costs. */
export function execDashboardRows(src: ReportsSource, data: DemoData,
  state: DemoState, signed: (f: bigint) => string): Cell[][] {
  const fig = figures(data, state);
  const now = src.months.at(-1)!;
  const before = src.months.at(-2)!;
  const top = [...data.departments()].sort((a, b) =>
    a.costFils < b.costFils ? 1 : -1)[0];
  const v = src.variance(now.month, before.month);
  const main = v.drivers[0];
  const waiting = decisionsFor(data, state).length;
  return [
    ["Gross pay", { fils: now.gross }, { fils: before.gross },
      `${signed(v.grossChange)} (${percent(v.grossChange,
        before.gross)}) on ${before.label}`],
    ["Biggest cause of the change", main === undefined ? "-"
      : { fils: main.amount, signed: true }, main?.label ?? "-",
    main === undefined ? "Nothing moved" : main.people.join(", ")],
    ["People paid", String(now.headcount), String(before.headcount),
      "Includes the leaver's part month"],
    ["Overtime this month", { fils: now.overtimeAmount },
      { fils: before.overtimeAmount }, `${hours(now.overtimeMinutes)} ` +
        `hours across ${plural(now.overtimePeople, "person", "people")}`],
    ["Held out of the salary file", { fils: fig.heldNetFils }, "-",
      "Net pay with no valid bank account yet"],
    ["Waiting for your decision", String(waiting), "-",
      "Open Home to decide"],
    ["Biggest department", top === undefined ? "-"
      : { fils: top.costFils },
      top === undefined ? "-" : top.name.en, "Gross cost for the month"],
  ];
}
