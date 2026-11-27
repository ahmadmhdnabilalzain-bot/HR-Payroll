import type { DocumentExpiry } from "../demo/data/types";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { RowLink } from "../ui/RowLink";
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
          <li key={d.id}>
            <ExpiryRow d={d} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One document: the whole row opens the person's documents. */
function ExpiryRow(p: { d: DocumentExpiry }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const d = p.d;
  return (
    <RowLink href={hrefOf("people", "files", "documents",
      d.employeeId)} className={`${s.row} ${s.linkRow}`}>
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
    </RowLink>
  );
}
