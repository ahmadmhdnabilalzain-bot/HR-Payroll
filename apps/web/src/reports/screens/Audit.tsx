import { useState } from "react";
import { FilterList } from "../../ui/templates";
import b from "../../ui/button.module.css";
import { useReportsSource } from "../load";
import type { AuditCheck, AuditView } from "../types";
import s from "../Audit.module.css";

const GROUPS: [string, string[]][] = [["Pay", ["Pay"]],
  ["People", ["People", "Time off"]], ["Setup", ["Access", "Setup"]]];
const TAMPER_AT = 11;

const LEDE = "Every action is written down once and cannot be changed " +
  "quietly. Each entry carries a fingerprint (SHA-256) made from the " +
  "entry and the one before it, so an edited or removed entry shows up " +
  "when the chain is checked. This is a demo of the idea, worked out " +
  "when the page loads; it is not a legal proof.";

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
  const [check, setCheck] = useState<AuditCheck | null>(null);
  const [tampered, setTampered] = useState(false);
  const rows: AuditView[] = src.audit.map((r) => tampered &&
    r.seq === TAMPER_AT ? { ...r, summary: `${r.summary} (edited)` } : r);
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
      actions={(
        <>
          <span className={`${s.status} ${tone}`} role="status">
            <span className={s.dot} aria-hidden="true" />
            {statusText(check, tampered)}
          </span>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => { setTampered((t) => !t); setCheck(null); }}>
            {tampered ? "Restore the entry" : "Edit one entry"}
          </button>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setCheck(src.verifyAudit(
              tampered ? TAMPER_AT : null))}>Check the chain</button>
        </>
      )} />
  );
}
