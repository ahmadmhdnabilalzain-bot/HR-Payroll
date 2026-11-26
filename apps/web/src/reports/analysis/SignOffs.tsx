import { useDemo } from "../../demo/state";
import { useExtras } from "../../demo/data/payroll-extras-load";
import type { SignOffRow } from "../../demo/data/payroll-extras-types";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { ReportPage } from "../../ui/templates";

/**
 * X32: who signed off what, and when, from the audit trail, then what
 * still waits. A decision made in this visit shows with the checker's
 * name and the demo's date.
 */
export function SignOffs() {
  const x = useExtras();
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const today = formatDate(data.payCalendar().asOf, lang);
  const live = (r: SignOffRow): SignOffRow => {
    const v = r.inboxId === null ? undefined : state.decided[r.inboxId];
    if (v === undefined) return r;
    return { ...r, outcome: v === "approve" ? "signed-off" : "declined",
      outcomeText: `${v === "approve" ? "Signed off" : "Declined"} in ` +
        "this visit", decidedOn: today, tookText: "Same day" };
  };
  const rows = x.signOffs.map(live);
  const waiting = rows.filter((r) => r.outcome === "waiting").length;
  return (
    <ReportPage title="Sign-off report"
      period="January to October 2026, newest first"
      figure={{ label: "Waiting for a decision", value: String(waiting) }}
      columns={[{ label: "Item" }, { label: "Kind" }, { label: "Asked by" },
        { label: "Asked" }, { label: "Decided by" }, { label: "Decided" },
        { label: "Outcome" }, { label: "Took" }]}
      rows={rows.map((r) => [state.hideAmounts ? r.subject.replace(
        /AED [\d,.]+/g, "AED ••••••") : r.subject, r.kindText, r.askedBy,
        r.askedOn, r.outcome === "waiting" ? `Waiting for ${r.decider}`
          : r.decider, r.decidedOn, r.outcomeText, r.tookText])}
      csvName="sign-off-report-2026.csv"
      note={"Read from the audit trail. The person who asks never decides " +
        "their own item. Sign-offs here are internal decisions, not a " +
        "decision by any authority."} />
  );
}
