import { Suspense } from "react";
import { useExtras } from "../../demo/data/payroll-extras-load";
import { SettingsPage } from "../../ui/templates";
import s from "../../pay/gate/gate.module.css";

function FieldsPage() {
  const x = useExtras();
  return (
    <SettingsPage title="Custom fields"
      lede={"Extra fields the company keeps on each employee, and the " +
        "screens where they show."}
      groups={[{ title: "Extra employee fields", items: x.fields.map((f) =>
        ({ key: f.id, label: f.label, value: f.shownOn.join(", "),
          help: `${f.typeText}. ${f.required ? "Required" : "Optional"}. ` +
            f.help })) },
      { title: "Where they never show", items: [{ key: "limits",
        label: "Salary file and payslip figures", value: "Never",
        help: x.fieldLimits }] }]}
      log={[]} />
  );
}

/** S08: the list of extra employee fields and where each shows. */
export function CustomFields() {
  return (
    <Suspense fallback={<div className={s.page}>
      <p className={s.muted}>Loading fields</p></div>}>
      <FieldsPage />
    </Suspense>
  );
}
