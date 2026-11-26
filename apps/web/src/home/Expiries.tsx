import { useDemo } from "../demo/state";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import s from "./Side.module.css";

/** Documents expiring within 60 days, soonest first (from the data). */
const WINDOW_DAYS = 60;
/** Fewer days than this reads as urgent. */
const URGENT_DAYS = 14;

export function Expiries() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const list = data.documents().filter((d) => d.daysLeft <= WINDOW_DAYS);
  return (
    <section className={s.panel} aria-labelledby="expiries-title">
      <header className={s.head}>
        <h2 id="expiries-title" className={s.title}>
          {t("home.expiriesTitle")}
        </h2>
        <span className={s.note}>{t("home.expiriesSub")}</span>
      </header>
      <ul className={s.list}>
        {list.map((d) => (
          <li key={d.id} className={s.row}>
            <div className={s.main}>
              <span className={s.what}>
                {data.employee(d.employeeId).name[lang]}
              </span>
              <span className={s.meta}>
                {d.kind[lang]}
                {" · "}
                <span className="tabular">
                  {formatDayMonth(d.expiresOn, lang)}
                </span>
              </span>
            </div>
            <span className={`${s.days} tabular`}
              data-urgent={d.daysLeft < URGENT_DAYS}>
              {t("home.daysLeft", { count: d.daysLeft })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
