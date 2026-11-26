import { useDemo } from "../demo/state";
import { formatLongDay } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Approvals } from "./Approvals";
import { Departments } from "./Departments";
import { Expiries } from "./Expiries";
import { IssueList } from "./IssueList";
import { PayRunHero } from "./PayRunHero";
import s from "./Home.module.css";

/** Scene 1: what needs a decision today, for HR or the GM. */
export function Home() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const today = data.payCalendar().asOf;
  return (
    <div className={s.page}>
      <header className={s.header}>
        <nav aria-label={t("shell.breadcrumb")} className={s.crumbs}>
          <span>{data.companyName[lang]}</span>
          <span aria-hidden="true" className={s.sep}>/</span>
          <span aria-current="page">{t("shell.navHome")}</span>
        </nav>
        <h1 className={s.title}>{t("home.title")}</h1>
        <p className={s.date}>{formatLongDay(today, lang)}</p>
      </header>
      <PayRunHero />
      <div className={s.grid}>
        <IssueList />
        <div className={s.side}>
          <Approvals />
          <Expiries />
        </div>
      </div>
      <Departments />
    </div>
  );
}
