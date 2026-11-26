import { useDemo } from "../../demo/state";
import { formatMoney } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { fils } from "@payroll/engine";
import { M } from "./words";

/** T06: unused annual leave priced like an encashment. */
export function Liability() {
  const { data } = useDemo();
  const { lang } = useLocale();
  const W = M.liability;
  const rows = data.files.leave.liability();
  const total = fils(rows.reduce((n, r) => n + r.liability, 0n));
  const most = rows.reduce((m, r) => r.liability > m ? r.liability : m, 0n);
  return (
    <ReportPage title={W.title} period={W.period}
      figure={{ label: W.figure, value: <Money value={total} size="lg" /> }}
      columns={[{ label: W.person }, { label: W.job },
        { label: W.days, end: true }, { label: W.rate, end: true },
        { label: W.owed, end: true }]}
      rows={rows.map((r) => [r.name, r.title, String(r.days),
        formatMoney(r.rate, lang), formatMoney(r.liability, lang)])}
      bars={rows.map((r) => most === 0n ? 0
        : Number(r.liability * 1000n / most))}
      note={data.files.leave.liabilityNote} csvName={W.csv} />
  );
}

/** T15: work from home against the sample limits. */
export function Wfh() {
  const { data } = useDemo();
  const W = M.wfh;
  const rows = data.files.clock.wfh();
  const over = rows.filter((r) => r.over).length;
  return (
    <ReportPage title={W.title} period={W.period}
      figure={{ label: W.figure, value: String(over) }}
      columns={[{ label: W.person }, { label: W.job },
        { label: W.days, end: true }, { label: W.limit, end: true },
        { label: W.status }]}
      rows={rows.map((r) => [r.name, r.title, String(r.days),
        String(r.allowed), r.over ? W.over(r.days - r.allowed)
          : W.within])}
      note={data.files.clock.wfhNote} csvName={W.csv} />
  );
}
