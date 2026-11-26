import { useState } from "react";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { annualNow, personFor, requestRows } from "../demo/time-off";
import {
  formatDayMonth,
  formatLongDay,
  formatMonthName,
} from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Money } from "../ui/Money";
import { Inbox } from "./inbox/Inbox";
import { LeaveForm } from "./LeaveForm";
import { RequestList } from "./RequestList";
import s from "./Self.module.css";

/**
 * The employee's Home: their own next payday and net pay with the
 * payslip one tap away, their annual leave left, and Request leave
 * inline. No company figures.
 */
export function EmployeeHome() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const [asking, setAsking] = useState(false);
  const me = personFor(data, "employee");
  const person = data.people.person(me);
  const slip = data.people.payslip(me);
  const cal = data.payCalendar();
  const month = formatMonthName(data.headline().runMonth, lang);
  const balance = annualNow(data, state, me);
  const mine = requestRows(data, state).filter((r) => r.employeeId === me);
  return (
    <div className={s.page}>
      <header className={s.lead}>
        <p className={s.date}>
          {t("home.dateLine", { date: formatLongDay(cal.asOf, lang),
            company: data.companyName[lang] })}
        </p>
        <h1 className={s.sentence}>
          {slip?.held != null ? t("home.selfHeld", { month })
            : t("home.selfPay", { month,
              date: formatDayMonth(cal.payday, lang) })}
        </h1>
      </header>
      <div className={s.cards}>
        <section className={s.card} aria-labelledby="self-net">
          <h2 id="self-net" className={s.label}>{t("home.selfNet")}</h2>
          {slip !== null && <Money value={slip.netFils} size="lg" />}
          <p className={s.meta}>{person?.name[lang]}</p>
          <a className={`${b.btn} ${b.secondary}`}
            href={hrefOf("people", me, "payslip")}>
            {t("home.openPayslip")}
          </a>
        </section>
        <section className={s.card} aria-labelledby="self-leave">
          <h2 id="self-leave" className={s.label}>{t("home.leaveLeft")}</h2>
          <p className={s.big}>
            {balance === null ? t("timeoff.notJoined")
              : t("timeoff.annualLeft", { count: balance.availableDays,
                n: String(balance.availableDays) })}
          </p>
          {!asking && (
            <button type="button" className={`${b.btn} ${b.primary}`}
              onClick={() => setAsking(true)}>{t("home.requestLeave")}</button>
          )}
        </section>
      </div>
      {asking && <LeaveForm employeeId={me} onDone={() => setAsking(false)} />}
      <RequestList title={t("home.myRequests")} rows={mine}
        empty={t("timeoff.requestsEmpty")} />
      <Inbox />
    </div>
  );
}
