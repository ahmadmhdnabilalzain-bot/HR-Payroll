import { openIssueCount, pendingApprovals } from "../demo/derive";
import { useTweenedNumber } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatDayMonth, formatMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { Sources } from "./Sources";
import { StepTracker } from "./StepTracker";
import s from "./PayRunHero.module.css";

/** The next pay run: one large number, its make-up, and progress. */
export function PayRunHero() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const h = data.headline();
  const cal = data.payCalendar();
  const people = data.runPeople();
  const maker = data.employee(people.makerId).name[lang];
  const checker = data.employee(people.checkerId).name[lang];
  const issues = useTweenedNumber(openIssueCount(data, state));
  const waiting = useTweenedNumber(pendingApprovals(data, state).length);
  return (
    <section className={s.hero} aria-labelledby="run-title">
      <div className={s.top}>
        <div className={s.lead}>
          <div className={s.labelRow}>
            <h2 id="run-title" className={s.label}>
              {t("home.runLabel", { month: formatMonth(h.runMonth, lang) })}
            </h2>
            <button type="button" className={s.sourcesBtn}
              aria-expanded={state.sourcesOpen} aria-controls="sources"
              onClick={() => dispatch({ type: "sources",
                open: !state.sourcesOpen })}>
              <Icon name="info" size={14} />
              {state.sourcesOpen ? t("home.hideSources")
                : t("home.sources")}
            </button>
          </div>
          <p className={s.figure}>
            <Money value={h.netTotalFils} size="hero" />
          </p>
          <p className={s.sub}>
            {t("home.netTo", { count: h.headcount })}
            <span className={s.dot} aria-hidden="true" />
            {t("home.paysOn", { date: formatDayMonth(cal.payday, lang) })}
          </p>
          <p className={s.people}>
            {t("home.preparedBy", { name: maker })}
            <span className={s.dot} aria-hidden="true" />
            {t("home.checker", { name: checker })}
          </p>
          <ul className={s.status}>
            <li data-tone={issues > 0 ? "warn" : "ok"}>
              <span className={s.pip} aria-hidden="true" />
              <span className="tabular">
                {issues > 0 ? t("home.openIssues", { count: issues })
                  : t("home.noIssues")}
              </span>
            </li>
            <li data-tone={waiting > 0 ? "info" : "ok"}>
              <span className={s.pip} aria-hidden="true" />
              <span className="tabular">
                {t("home.waiting", { count: waiting })}
              </span>
            </li>
          </ul>
        </div>
        <dl className={s.equation}>
          <div>
            <dt>{t("home.gross")}</dt>
            <dd><Money value={h.grossTotalFils} /></dd>
          </div>
          <div>
            <dt>{t("home.deductions")}</dt>
            <dd className={s.minus}>
              <span aria-hidden="true">−</span>
              <Money value={h.deductionsFils} />
            </dd>
          </div>
          <div className={s.total}>
            <dt>{t("home.net")}</dt>
            <dd><Money value={h.netTotalFils} /></dd>
          </div>
          <div className={s.part}>
            <dt>{t("home.inSif")}</dt>
            <dd><Money value={h.sifTotalFils} size="sm" /></dd>
          </div>
          <div className={s.part}>
            <dt>{t("home.held")}</dt>
            <dd><Money value={h.heldNetFils} size="sm" /></dd>
          </div>
        </dl>
      </div>
      <Sources />
      <StepTracker />
    </section>
  );
}
