import { FilterList } from "../../ui/templates";
import { Money } from "../../ui/Money";
import { Status } from "../../setup/access/ui";
import { useMaskText } from "../../ui/mask";
import { useAuditData } from "./load";
import type { AuditData } from "./data";

type Row = AuditData["remedies"][number];

/** X37: each payroll error, who found it, the fix and the run that pays. */
export function RemediesList(p: { d: AuditData }) {
  const { d } = p;
  const mask = useMaskText();
  return (
    <FilterList<Row> title="Error-remedy record"
      lede={`Each payroll error, who found it, how it is put right and ` +
        `which run pays it. ${mask(d.remedyNote)}`}
      rows={d.remedies} rowKey={(r) => r.id}
      searchText={(r) => `${r.personName} ${r.what} ${r.foundBy} ${r.source}`}
      segments={[{ id: "all", label: "All", match: () => true },
        { id: "fixed", label: "Corrections", match: (r) =>
          r.source !== "Salary file check" },
        { id: "open", label: "Open in October", match: (r) =>
          r.source === "Salary file check" }]}
      columns={[
        { key: "p", label: "What went wrong", render: (r) => (
          <span>{r.personName}, {r.monthText}. {mask(r.what)}</span>) },
        { key: "f", label: "Found by", render: (r) =>
          `${r.foundBy}, ${r.foundOn}` },
        { key: "x", label: "The fix", render: (r) => mask(r.fix) },
        { key: "a", label: "Amount", end: true, render: (r) =>
          r.amount === null ? "Not paid" : <Money value={r.amount}
            size="sm" tween={false} /> },
        { key: "s", label: "Pays in", end: true, render: (r) => (
          <Status tone={r.source === "Salary file check" ? "danger"
            : "warn"}>{r.paidIn}</Status>) }]}
      empty="No errors recorded." />
  );
}

export function RemediesScreen() {
  return <RemediesList d={useAuditData()} />;
}
