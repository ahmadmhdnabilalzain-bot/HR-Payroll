import { hrefOf } from "../demo/route";
import { SettingsPage } from "../ui/templates";
import { usePay } from "./load";

/** Pay groups: who is paid together, and when (read-only here). */
export function PayGroups() {
  const pay = usePay();
  return (
    <SettingsPage title="Pay groups"
      lede={"Who is paid together. Both groups are paid in the same " +
        "monthly run."}
      groups={pay.groups.map((g) => ({ title: g.label, items: [
        { key: `${g.id}-n`, label: "People",
          value: String(g.names.length), href: hrefOf("people"),
          list: g.names.slice(0, 6),
          ...(g.names.length > 6
            ? { help: `And ${g.names.length - 6} more` } : {}) },
        { key: `${g.id}-day`, label: "Payday",
          value: g.payday.replace(/\s*\(sample\)/, "") },
      ] }))}
      log={[]} />
  );
}

/** Pay elements: every line a payslip can carry, and how it is set. */
export function PayElements() {
  const pay = usePay();
  const of = (type: "earning" | "deduction") => pay.elements
    .filter((e) => e.type === type).map((e) => ({ key: e.code,
      label: e.label, value: e.salaryFile, help: e.howSet }));
  return (
    <SettingsPage title="Pay elements"
      lede={"Each line a payslip can carry: how it is set, and where it " +
        "goes in the salary file."}
      groups={[{ title: "Earnings", items: of("earning") },
        { title: "Deductions", items: of("deduction") }]}
      log={[]} />
  );
}
