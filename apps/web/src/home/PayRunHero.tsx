import { ExplainLink, Explainable } from "../components/explain";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { StepTracker } from "./StepTracker";
import s from "./PayRunHero.module.css";

/**
 * The figure that supports the headline: net pay, one line under it
 * (people, payday, and what is held out of the salary file, which
 * rolls into the file when an IBAN passes), the pension caveat as a
 * small line, "Why this number", and the progress. The make-up sits
 * below the fold (MakeUp).
 */
export function PayRunHero() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const run = useRunDetail();
  const h = data.headline();
  const cal = data.payCalendar();
  const net = run.explain["run:net"];
  return (
    <section className={s.hero} aria-labelledby="run-title">
      <h2 id="run-title" className="visually-hidden">{t("home.net")}</h2>
      <div className={s.lead}>
        <p className={s.figure}>
          <Explainable explanation={net}>
            <Money value={h.netTotalFils} size="hero" countUp />
          </Explainable>
        </p>
        <p className={s.line}>
          <span>{t("home.netTo", { count: h.headcount })}</span>
          <span className={s.dot} aria-hidden="true" />
          <span>{t("home.paysOn", { date: formatDayMonth(cal.payday,
            lang) })}</span>
          <span className={s.dot} aria-hidden="true" />
          <span className={s.held} data-zero={h.heldNetFils === 0n}>
            {h.heldNetFils === 0n ? t("home.allInFile") : (
              <>
                <Money value={h.heldNetFils} size="sm" />
                {" "}{t("home.heldOut")}
              </>
            )}
          </span>
          <ExplainLink explanation={net} className={s.why}>
            <Icon name="info" size={16} />
            {t("home.whyNumber")}
          </ExplainLink>
        </p>
        <p className={s.caveat}>{h.netNote[lang]}</p>
      </div>
      <StepTracker />
    </section>
  );
}
