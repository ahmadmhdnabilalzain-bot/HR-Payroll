import { Suspense } from "react";
import type { Fils } from "@payroll/engine";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { personFor } from "../demo/time-off";
import { formatDayMonth, formatMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Money } from "../ui/Money";
import { FilterList } from "../ui/templates";
import i from "../home/inbox/inbox.module.css";
import { MyCommission } from "./MyCommission";

interface SlipRow {
  month: string;
  grossFils: Fils;
  netFils: Fils;
  current: boolean;
  held: boolean;
}

/** E02: this month's payslip, then every month paid this year (LF). */
export function MyPayslips() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const now = data.people.payslip(me);
  const rows: SlipRow[] = [
    ...(now === null ? [] : [{ month: now.month, grossFils: now.grossFils,
      netFils: now.netFils, current: true, held: now.held !== null }]),
    ...data.home.payslips(me).reverse().map((x) => ({ ...x,
      current: false, held: false })),
  ];
  const payday = formatDayMonth(data.payCalendar().payday, lang);
  return (
    <>
      <FilterList title={t("me.payslipsTitle")} lede={t("me.payslipsLede")}
        rows={rows} rowKey={(x) => x.month}
        rowHref={(x) => x.current ? hrefOf("people", me, "payslip")
          : undefined}
        columns={[
          { key: "m", label: t("me.colMonth"),
            render: (x) => formatMonth(x.month, lang) },
          { key: "s", label: t("me.colStatus"), render: (x) => (
            <span className={i.status} data-tone={x.held ? "bad"
              : x.current ? "warn" : "good"}>
              {x.held ? t("me.held") : x.current
                ? t("me.thisMonth", { date: payday }) : t("me.paid")}
            </span>) },
          { key: "n", label: t("me.colNet"), end: true,
            render: (x) => <Money value={x.netFils} size="sm" /> }]}
        empty={t("me.payslipsEmpty")} />
    <Suspense fallback={null}><MyCommission /></Suspense>
    </>
  );
}
