import type { TeamTodayRow } from "../../demo/data/home-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import type { MessageKey } from "../../i18n/t";
import { useLocale } from "../../i18n/LocaleProvider";
import s from "./inbox.module.css";

const WORD: Record<TeamTodayRow["status"], [MessageKey, string]> = {
  present: ["inbox.teamAtWork", "good"],
  leave: ["inbox.teamOnLeave", "neutral"],
  "absent-unpaid": ["inbox.teamAway", "warn"],
  "no-record": ["inbox.teamNoRecord", "neutral"],
};

/** E10: the manager's own people today, from the attendance record. */
export function TeamToday() {
  const { t } = useLocale();
  const { data } = useDemo();
  const rows = data.home.teamToday(personFor(data, "manager"));
  return (
    <section className={s.panel} aria-labelledby="team-today">
      <header className={s.head}>
        <h2 id="team-today" className={s.title}>{t("inbox.teamToday")}</h2>
      </header>
      {rows.length === 0 ? (
        <p className={s.empty}>{t("inbox.teamTodayEmpty")}</p>
      ) : (
        <ul className={s.list}>
          {rows.map((r) => {
            const [key, tone] = WORD[r.status];
            return (
              <li key={r.employeeId} className={s.row}>
                <div className={s.main}>
                  <a className={s.what} href={hrefOf("people", r.employeeId)}>
                    {r.name}
                  </a>
                  <span className={s.meta}>{r.title}</span>
                </div>
                <span className={s.status} data-tone={tone}
                  title={r.statusText}>
                  {r.status === "present" ? r.statusText : t(key)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
