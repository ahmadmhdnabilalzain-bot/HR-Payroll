import { ALL_AREAS } from "../../nav/areas";
import { ReportPage } from "../../ui/templates";
import { useMoreSource } from "./load";

const where = (id: string): string =>
  ALL_AREAS.find((a) => a.id === id)?.label.en ?? "";

/** X24: access, connections, import and the audit chain in one table. */
export function ItDashboardScreen() {
  const { it } = useMoreSource();
  return (
    <ReportPage title="IT dashboard" period="As of 27 Oct 2026"
      figure={{ label: "Checks to look at",
        value: it.checks === 0 ? "None" : String(it.checks) }}
      columns={[{ label: "Measure" }, { label: "Where it stands" },
        { label: "State" }]}
      rows={it.rows.map((r) => [`${r.area}: ${r.measure}`,
        `${r.text} Opens in ${where(r.openId)}.`, r.stateText])}
      csvName="it-dashboard-2026-10-27.csv" note={it.note} />
  );
}
