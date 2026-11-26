import { useDemo } from "../demo/state";
import { personFor, requestRows, visibleIds } from "../demo/time-off";
import { formatLongDay } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { RequestList } from "./RequestList";
import s from "./Self.module.css";

/**
 * The team manager's Home: the leave requests waiting for their
 * decision, then their team's booked and waiting leave from today on.
 * No company pay figures.
 */
export function ManagerHome() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const me = personFor(data, "manager");
  const asOf = data.payCalendar().asOf;
  const team = new Set(visibleIds(data, state).filter((id) => id !== me));
  const rows = requestRows(data, state);
  const waiting = rows.filter((r) => r.state === "waiting" &&
    r.approverId === me);
  const teamLeave = rows.filter((r) => team.has(r.employeeId) &&
    r.endDate >= asOf && (r.state === "booked" || (r.state === "waiting" &&
      r.approverId !== me)));
  const n = waiting.length;
  return (
    <div className={s.page}>
      <header className={s.lead}>
        <p className={s.date}>
          {t("home.dateLine", { date: formatLongDay(asOf, lang),
            company: data.companyName[lang] })}
        </p>
        <h1 key={n} className={s.sentence}>
          {n === 0 ? t("home.teamNone") : n === 1 ? t("home.teamTitleOne")
            : t("home.teamTitle", { count: n })}
        </h1>
      </header>
      <RequestList title={t("home.teamWaiting")} rows={waiting} showName
        empty={t("home.teamNone")} />
      <RequestList title={t("home.teamLeave")} rows={teamLeave} showName
        empty={t("home.teamLeaveEmpty")} />
    </div>
  );
}
