import { ReportPage } from "../../ui/templates";
import { turnoverText as turnover } from "../fmt";
import { useReportsSource } from "../load";

const list = (names: string[]): string => names.length === 0 ? "nobody"
  : names.join(", ");

/** Headcount and turnover for the year so far, by department. */
export function Headcount() {
  const src = useReportsSource();
  const total = src.heads;
  const last = src.departments.length;
  const rows = [...src.departments, total].map((d) => [d.name,
    String(d.start), String(d.joined), String(d.departed), String(d.now),
    turnover(d)]);
  return (
    <ReportPage title="Headcount and turnover"
      period="1 January 2026 to the demo date"
      figure={{ label: "Turnover this year", value: src.turnover,
        explanation: src.explain["turnover:total"] }}
      explain={(r, c) => r !== last ? undefined : c === 4
        ? src.explain["headcount:now"] : c === 5
          ? src.explain["turnover:total"] : undefined}
      columns={[{ label: "Department" }, { label: "1 January", end: true },
        { label: "Joined", end: true }, { label: "Left", end: true },
        { label: "Now", end: true }, { label: "Turnover", end: true }]}
      rows={rows} csvName="headcount-turnover-2026.csv"
      note={`Joined: ${list(src.joiners)}. Left: ${list(src.leavers)}. ` +
        "Turnover is the people who left divided by the average of the " +
        "headcount on 1 January and now, for the year so far."} />
  );
}
