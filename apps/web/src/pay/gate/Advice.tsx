import { useDemo } from "../../demo/state";
import { useRunDetail } from "../../demo/useRunDetail";
import { formatDate, formatList } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { useCellMoney as useMoney } from "./cell-money";

/**
 * R12: the payment advice behind the salary file, one line per person,
 * to print. It reads the file's own lines, so its total is the Pay
 * step's. A salary held by choice is marked; the file is not rebuilt.
 */
export function Advice() {
  const { state } = useDemo();
  const { lang } = useLocale();
  const { m } = useMoney();
  const d = useRunDetail();
  const f = d.file;
  const byName = new Map(d.people.map((p) => [p.name, p.id]));
  const held = new Map(state.salaryHolds.map((h) => [h.employeeId, h]));
  const out = d.people.filter((p) => !p.inFile).map((p) => p.name);
  const dated = formatDate(f.dated, lang);
  const rows = f.records.map((r) => {
    const h = held.get(byName.get(r.name) ?? "");
    return [r.name, r.account, m(r.total), dated,
      h === undefined ? "Pay" : "Held: do not pay"];
  });
  const heldCount = rows.filter((r) => r[4] !== "Pay").length;
  return (
    <ReportPage title="Bank advice"
      period={`October 2026, file ${f.fileName}, to ${f.bank}`}
      figure={{ label: `${f.people} people in the salary file`,
        value: <Money value={f.total} size="lg" tween={false} /> }}
      columns={[{ label: "Person" }, { label: "Account (IBAN)" },
        { label: "Amount", end: true }, { label: "Value date" },
        { label: "Advice" }]}
      rows={rows} csvName="bank-advice-2026-10.csv"
      note={["Each line is the salary file's own line, so the total is " +
        "the file's.", out.length === 0 ? "" : `${formatList(out, lang)} ` +
        `${out.length === 1 ? "is" : "are"} not in the file: no IBAN ` +
        "that passes its check yet.", heldCount === 0 ? "" : `${heldCount} ` +
        `${heldCount === 1 ? "salary is" : "salaries are"} held by choice; ` +
        "the file is not made again, so tell the bank before " +
        "upload.", "The bank checks the file again on upload."]
        .filter((x) => x !== "").join(" ")} />
  );
}
