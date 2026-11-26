import { useState } from "react";
import { dayCountVars } from "../people/words";
import { useDemo } from "../demo/state";
import { annualNow, personFor, requestRows } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { PageHead } from "../ui/templates";
import { LeaveForm } from "../home/LeaveForm";
import { RequestList } from "../home/RequestList";
import s from "../home/Self.module.css";

/** E03: the viewer's annual leave left, Request leave, and their leave. */
export function MyLeave() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const [asking, setAsking] = useState(false);
  const me = personFor(data, state.role);
  const balance = annualNow(data, state, me);
  const asOf = data.people.asOf;
  const mine = requestRows(data, state).filter((r) => r.employeeId === me &&
    r.endDate >= asOf && (r.state === "booked" || r.state === "waiting"));
  return (
    <div className={s.page}>
      <PageHead title={t("me.leaveTitle")} lede={t("me.leaveLede")} />
      <section className={s.card} aria-labelledby="me-leave-left">
        <h2 id="me-leave-left" className={s.label}>{t("home.leaveLeft")}</h2>
        <p className={s.big}>
          {balance === null ? t("timeoff.notJoined")
            : t("timeoff.annualLeft",
              dayCountVars(balance.availableDays, lang))}
        </p>
        {!asking && (
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setAsking(true)}>{t("home.requestLeave")}</button>
        )}
      </section>
      {asking && <LeaveForm employeeId={me} onDone={() => setAsking(false)} />}
      <RequestList title={t("me.upcoming")} rows={mine}
        empty={t("timeoff.requestsEmpty")} />
    </div>
  );
}

/** E07: every request the viewer made, newest first, with withdraw. */
export function MyRequests() {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const mine = requestRows(data, state).filter((r) => r.employeeId === me);
  return (
    <div className={s.page}>
      <PageHead title={t("me.requestsTitle")} lede={t("me.requestsLede")} />
      <RequestList title={t("home.myRequests")} rows={mine}
        empty={t("timeoff.requestsEmpty")} />
    </div>
  );
}
