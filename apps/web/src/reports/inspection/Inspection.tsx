import { hrefOf } from "../../demo/route";
import { downloadText } from "../../lib/download";
import { formatMoney } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { PageHead, toCsv } from "../../ui/templates";
import type { ViewProps } from "../../views";
import { PackBody } from "./Pack";
import { useAuditData } from "./load";
import s from "./audit.module.css";

/** X33: one page per month of evidence for an inspector, printable. */
export function Inspection(p: ViewProps) {
  const d = useAuditData();
  const { lang } = useLocale();
  const key = d.months.find((m) => m.key === p.rest[1])?.key ??
    d.months.at(-1)!.key;
  const pack = d.packs[key]!;
  const csv = (): void => downloadText(`payroll-register-${key}.csv`,
    toCsv([{ label: "Employee no" }, { label: "Person" },
      { label: "Gross (AED)" }, { label: "Net (AED)" }],
    pack.register.lines.map((l) => [l.number, l.name,
      formatMoney(l.gross, lang), formatMoney(l.net, lang)])),
  "text/csv;charset=utf-8");
  return (
    <div className={s.page}>
      <PageHead title="Inspection pack"
        lede="Evidence for one month: payroll register, sign-offs, salary
          file, exceptions, the audit chain check and policy versions. It
          is not an authority filing."
        actions={(
          <>
            <button type="button" className={`${b.btn} ${b.primary} ${s.tap}`}
              onClick={() => print()}>Print or save as PDF</button>
            <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
              onClick={csv}>Register as CSV</button>
            <a className={`${b.btn} ${b.quiet} ${s.tap}`}
              href={hrefOf("reports", "inspection", "room")}>
              Auditor's view</a>
          </>
        )} />
      <nav aria-label="Month">
        <ul className={s.months}>
          {d.months.map((m) => (
            <li key={m.key}>
              <a className={s.month} href={hrefOf("reports", "inspection",
                m.key)} aria-current={m.key === key ? "page" : undefined}>
                {m.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <PackBody pack={pack} month={key} />
    </div>
  );
}
