import { TAMPER_AT } from "../../demo/audit-state";
import { useDemo } from "../../demo/state";
import { ALL_AREAS } from "../../nav/areas";
import b from "../../ui/button.module.css";
import { ReportPage } from "../../ui/templates";
import { useReportsSource } from "../load";
import { useMoreSource } from "./load";
import { itRows } from "./rows";

const where = (id: string): string =>
  ALL_AREAS.find((a) => a.id === id)?.label.en ?? "";

/** X24: access, connections, import and the audit chain in one table.
 * The chain row says what the last check in this session found; the
 * check is the Audit trail page's, through the shared state. */
export function ItDashboardScreen() {
  const { it } = useMoreSource();
  const src = useReportsSource();
  const { state, dispatch } = useDemo();
  const trail = src.auditWith(state.auditAdded);
  const rows = itRows(it, state.auditCheck, trail.rows.length);
  const checks = rows.filter((r) => r.state === "check").length;
  return (
    <ReportPage title="IT dashboard" period="As of 27 Oct 2026"
      figure={{ label: "Checks to look at",
        value: checks === 0 ? "None" : String(checks) }}
      actions={(
        <button type="button" className={`${b.btn} ${b.primary}`}
          onClick={() => dispatch({ type: "audit-check",
            result: trail.verify(state.auditTampered ? TAMPER_AT
            : null) })}>
          Check the chain</button>
      )}
      columns={[{ label: "Measure" }, { label: "Where it stands" },
        { label: "State" }]}
      rows={rows.map((r) => [`${r.area}: ${r.measure}`,
        `${r.text} Opens in ${where(r.openId)}.`, r.stateText])}
      csvName="it-dashboard-2026-10-27.csv" note={it.note} />
  );
}
