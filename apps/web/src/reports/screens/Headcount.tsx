import { useDemo } from "../../demo/state";
import { ReportPage, type Cell } from "../../ui/templates";
import { deptHrefByName } from "../dash/itemSeam";
import { turnoverText as turnover, useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";
import type { DeptHeads } from "../types";

const list = (names: string[]): string => names.length === 0 ? "nobody"
  : names.join(", ");

/** Headcount and turnover for the year so far, by department. */
export function Headcount() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { data } = useDemo();
  const total = src.heads;
  const last = src.departments.length;
  const line = (d: DeptHeads): Cell[] => [d.name, d.start, d.joined,
    d.departed, d.now, turnover(d)];
  const rows = src.departments.map(line);
  return (
    <ReportPage crumbs={crumbs} title="Headcount and turnover"
      period="1 January 2026 to the report date"
      figure={{ label: "Turnover this year", value: src.turnover,
        explanation: src.explain["turnover:total"] }}
      explain={(r, c) => r !== last ? undefined : c === 4
        ? src.explain["headcount:now"] : c === 5
          ? src.explain["turnover:total"] : undefined}
      columns={[{ label: "Department" }, { label: "1 January", end: true },
        { label: "Joined", end: true }, { label: "Left", end: true },
        { label: "Now", end: true }, { label: "Turnover", end: true }]}
      rows={rows} total={line(total)}
      rowHref={(r) => deptHrefByName(data.departments(),
        src.departments[r]?.name ?? "")}
      csvName="headcount-turnover-2026.csv"
      note={`Joined: ${list(src.joiners)}. Left: ${list(src.leavers)}. ` +
        "Turnover is the people who left divided by the average of the " +
        "headcount on 1 January and now, for the year so far."} />
  );
}
