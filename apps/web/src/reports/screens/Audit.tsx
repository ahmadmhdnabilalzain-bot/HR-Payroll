import { TAMPER_AT } from "../../demo/audit-state";
import { useDemo } from "../../demo/state";
import { useMaskText } from "../../ui/mask";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { FilterList } from "../../ui/templates";
import b from "../../ui/button.module.css";
import { useReportsSource } from "../load";
import type { AuditCheck, AuditView } from "../types";
import s from "../Audit.module.css";

const GROUPS: [string, string[]][] = [["Pay", ["Pay"]],
  ["People", ["People", "Time off"]], ["Setup", ["Access", "Setup"]]];

const LEDE = "Each action is written down as an entry linked to the " +
  "one before it by a fingerprint (SHA-256), so an edited or removed " +
  "entry shows up when the chain is checked: the check detects a " +
  "change, it does not prevent one. In this demo the check runs in " +
  "your browser; it is not a legal proof.";

function statusText(c: AuditCheck | null, tampered: boolean): string {
  if (c === null) {
    return tampered ? `Entry ${TAMPER_AT} edited in this copy. Not checked`
      : "Not checked yet";
  }
  return c.ok ? `Chain checked: all ${c.checked} entries fit`
    : `Chain broken at entry ${c.brokenAt}: its fingerprint no longer ` +
      "matches";
}

/** Audit trail (LF): every entry, the chain check, and a tamper demo. */
export function Audit() {
  const src = useReportsSource();
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const mask = useMaskText();
  const trail = src.auditWith(state.auditAdded);
  const check = state.auditCheck;
  const tampered = state.auditTampered;
  /* Emirates ID shown in full: written down at once, newest first.
     These are not part of the checked chain (they hold no fingerprint). */
  const shown: AuditView[] = state.eidLog.map((e, i) => ({
    id: `eid-${i}`, seq: 10000 + i, when: formatDate(e.on, lang),
    who: data.people.person(e.by)?.name[lang] ?? e.by, area: "People",
    action: "Emirates ID shown", summary: "Shown in full on the profile",
    subject: data.people.person(e.employeeId)?.name[lang] ?? e.employeeId,
    shortHash: "not chained", shortPrev: "" })).reverse();
  // Amounts in entry text are masked for display only; the chain is
  // checked on the entries as written.
  const rows: AuditView[] = [...shown, ...trail.rows.map((r) => ({ ...r,
    summary: mask(tampered && r.seq === TAMPER_AT
      ? `${r.summary} (edited)` : r.summary), subject: mask(r.subject) }))];
  const tone = check === null ? "" : check.ok ? s.ok : s.broken;
  return (
    <FilterList<AuditView> title="Audit trail" lede={LEDE} rows={rows}
      rowKey={(r) => r.id}
      searchText={(r) => `${r.who} ${r.action} ${r.summary} ${r.subject}`}
      segments={[{ id: "all", label: "All", match: () => true },
        ...GROUPS.map(([id, areas]) => ({ id, label: id,
          match: (r: AuditView) => areas.includes(r.area) }))]}
      columns={[
        { key: "what", label: "What happened", render: (r) => (
          <span className={s.what}><span>{r.action}</span>
            <span className={s.sub}>{r.summary}</span></span>) },
        { key: "who", label: "Who", render: (r) => r.who },
        { key: "when", label: "When", render: (r) => r.when },
        { key: "area", label: "Area", render: (r) => r.area },
        { key: "hash", label: "Fingerprint", end: true, render: (r) => (
          <span className={s.hash}>{r.shortHash}</span>) }]}
      empty="No entries match. Clear the search or pick All."
      meta={(
        <div className={s.chain}>
          <span className={`${s.status} ${tone}`} role="status">
            <span className={s.dot} aria-hidden="true" />
            {statusText(check, tampered)}
          </span>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => dispatch({ type: "audit-tamper",
              on: !tampered })}>
            {tampered ? "Restore the entry" : "Edit one entry"}
          </button>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => dispatch({ type: "audit-check",
              result: trail.verify(tampered ? TAMPER_AT : null) })}>
            Check the chain</button>
        </div>
      )} />
  );
}
