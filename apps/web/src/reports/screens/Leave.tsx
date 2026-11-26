import { ReportPage } from "../../ui/templates";
import { useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";

const days = (n: number): string => n === 0 ? "-" : String(n);

/** Leave and absence this year: who has taken or is waiting on days. */
export function Leave() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const rows = src.leave.map((x) => [x.name, x.department,
    String(x.annualLeft), days(x.annualTaken), days(x.sickDays),
    days(x.unpaidDays), days(x.waitingDays)]);
  return (
    <ReportPage crumbs={crumbs} title="Leave and absence" period="2026 so far"
      figure={{ label: "Annual leave left across everyone",
        value: `${src.annualLeftTotal} days` }}
      columns={[{ label: "Person" }, { label: "Department" },
        { label: "Annual left", end: true },
        { label: "Annual taken", end: true },
        { label: "Sick", end: true }, { label: "Unpaid", end: true },
        { label: "Waiting", end: true }]}
      rows={rows} csvName="leave-and-absence-2026.csv"
      note={`${src.leaveOthers} other people have taken no leave this ` +
        "year and are not listed. Days are working days. Leave booked " +
        "before October is only what the leave records hold. Sick " +
        "days are unpaid only inside probation."} />
  );
}
