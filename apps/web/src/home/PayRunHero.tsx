import { Suspense } from "react";
import { Explainable } from "../components/explain";
import { notes } from "../demo/derive";
import { useRunDetail } from "../demo/useRunDetail";
import { useDemo } from "../demo/state";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { Sources } from "./Sources";
import { StepTracker } from "./StepTracker";
import s from "./PayRunHero.module.css";

/**
 * The figure that supports the sentence: net pay, its make-up, and the
 * salary-file split. When an IBAN passes the file check the held
 * amount rolls into the file total; then the progress steps.
 */
export function PayRunHero() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const h = data.headline();
  const cal = data.payCalendar();
  const people = data.runPeople();
  const name = (id: string): string => data.employee(id).name[lang];
  const note = notes(data)[0];
  return (
    <section className={s.hero} aria-labelledby="run-title">
      <div className={s.top}>
        <div className={s.lead}>
          <h2 id="run-title" className="visually-hidden">
            {t("home.net")}
          </h2>
          <p className={s.figure}>
            <Suspense fallback={<Money value={h.netTotalFils} size="hero" />}>
              <ExplainedNet />
            </Suspense>
          </p>
          <p className={s.caveat}>
            <Icon name="info" size={16} />
            <span>{h.netNote[lang]}</span>
          </p>
          <p className={s.sub}>
            {t("home.netTo", { count: h.headcount })}
            {", "}
            {t("home.paysOn", { date: formatDayMonth(cal.payday, lang) })}
          </p>
          <p className={s.people}>
            <span>{t("home.preparedBy", { name: name(people.makerId) })}
            </span>
            <span className={s.dot} aria-hidden="true" />
            <span>{t("home.checker", { name: name(people.checkerId) })}
            </span>
            <button type="button" className={s.sourcesBtn}
              aria-expanded={state.sourcesOpen} aria-controls="sources"
              onClick={() => dispatch({ type: "sources",
                open: !state.sourcesOpen })}>
              <Icon name="info" size={14} />
              {state.sourcesOpen ? t("home.hideSources")
                : t("home.sources")}
            </button>
          </p>
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
            <dd><Money value={h.sifTotalFils} /></dd>
          </div>
          <div className={s.part} data-zero={h.heldNetFils === 0n}>
            <dt>{t("home.held")}</dt>
            <dd><Money value={h.heldNetFils} /></dd>
          </div>
        </dl>
      </div>
      <Sources note={note?.reason[lang] ?? null} />
      <StepTracker />
    </section>
  );
}

/** The net figure opens its explanation (loaded with the run detail). */
function ExplainedNet() {
  const { data } = useDemo();
  const run = useRunDetail();
  return (
    <Explainable explanation={run.explain["run:net"]}>
      <Money value={data.headline().netTotalFils} size="hero" />
    </Explainable>
  );
}
