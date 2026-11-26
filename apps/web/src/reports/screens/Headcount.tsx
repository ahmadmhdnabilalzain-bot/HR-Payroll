import { ReportPage } from "../../ui/templates";
import { share } from "../fmt";
import { useReportsSource } from "../load";
import type { DeptHeads } from "../types";

const turnover = (d: Pick<DeptHeads, "start" | "now" | "departed">): string =>
  d.departed === 0 ? "None" : share(d.departed, (d.start + d.now) / 2);

const list = (names: string[]): string => names.length === 0 ? "nobody"
  : names.join(", ");

/** Headcount and turnover for the year so far, by department. */
export function Headcount() {
  const src = useReportsSource();
  const sum = (k: "start" | "joined" | "departed" | "now"): number =>
    src.departments.reduce((n, d) => n + d[k], 0);
  const total: DeptHeads = { name: "Everyone", start: sum("start"),
    joined: sum("joined"), departed: sum("departed"), now: sum("now") };
  const rows = [...src.departments, total].map((d) => [d.name,
    String(d.start), String(d.joined), String(d.departed), String(d.now),
    turnover(d)]);
  return (
    <ReportPage title="Headcount and turnover"
      period="1 January 2026 to the report date"
      figure={{ label: "Turnover this year", value: turnover(total) }}
      columns={[{ label: "Department" }, { label: "1 January", end: true },
        { label: "Joined", end: true }, { label: "Left", end: true },
        { label: "Now", end: true }, { label: "Turnover", end: true }]}
      rows={rows} csvName="headcount-turnover-2026.csv"
      note={`Joined: ${list(src.joiners)}. Left: ${list(src.leavers)}. ` +
        "Turnover is the people who left divided by the average of the " +
        "headcount on 1 January and now, for the year so far."} />
  );
}
