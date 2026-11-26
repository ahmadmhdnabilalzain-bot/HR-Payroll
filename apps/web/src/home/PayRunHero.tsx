import { fils, type Fils } from "@payroll/engine";
import { ExplainLink, Explainable } from "../components/explain";
import { notes } from "../demo/derive";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDayMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import {
  ChangeNote,
  monthName,
  SignedMoney,
} from "../payrun/Change";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { Sources } from "./Sources";
import { StepTracker } from "./StepTracker";
import s from "./PayRunHero.module.css";

/**
 * The figure that supports the sentence: net pay with its change
 * against last month and a visible "Why this number", its make-up
 * (each line with its change), and the salary-file split. When an IBAN
 * passes the file check the held amount rolls into the file total.
 */
export function PayRunHero() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const run = useRunDetail();
  const h = data.headline();
  const cal = data.payCalendar();
  const people = data.runPeople();
  const name = (id: string): string => data.employee(id).name[lang];
  const note = notes(data)[0];
  const net = run.explain["run:net"];
  return (
    <section className={s.hero} aria-labelledby="run-title">
      <div className={s.top}>
        <div className={s.lead}>
          <h2 id="run-title" className="visually-hidden">
            {t("home.net")}
          </h2>
          <p className={s.figure}>
            <Explainable explanation={net}>
              <Money value={h.netTotalFils} size="hero" countUp />
            </Explainable>
          </p>
          <p className={s.change}>
            <ChangeNote now={h.netTotalFils} prev={run.prev.net}
              month={run.prevMonth} />
          </p>
          <p className={s.figureNotes}>
            <span>
              {t("home.netTo", { count: h.headcount })}
              {", "}
              {t("home.paysOn", { date: formatDayMonth(cal.payday, lang) })}
            </span>
            <ExplainLink explanation={net} className={s.why}>
              <Icon name="info" size={16} />
              {t("home.whyNumber")}
            </ExplainLink>
          </p>
          <p className={s.caveat}>{h.netNote[lang]}</p>
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
              {state.sourcesOpen ? t("home.hideSources")
                : t("home.sources")}
            </button>
          </p>
        </div>
        <dl className={s.equation}>
          <div className={s.eqHead} aria-hidden="true">
            <span />
            <span>{t("home.vsLast", { month: monthName(run.prevMonth,
              lang) })}</span>
            <span />
          </div>
          <Line label={t("home.gross")} now={h.grossTotalFils}
            prev={run.prev.gross} month={run.prevMonth} />
          <Line label={t("home.deductions")} now={h.deductionsFils}
            prev={run.prev.deductions} month={run.prevMonth} minus />
          <Line label={t("home.net")} now={h.netTotalFils}
            prev={run.prev.net} month={run.prevMonth} total />
          <div className={s.part}>
            <dt>{t("home.inSif")}</dt>
            <dd className={s.delta} />
            <dd><Money value={h.sifTotalFils} /></dd>
          </div>
          <div className={s.part} data-zero={h.heldNetFils === 0n}>
            <dt>{t("home.held")}</dt>
            <dd className={s.delta} />
            <dd><Money value={h.heldNetFils} /></dd>
          </div>
        </dl>
      </div>
      <Sources note={note?.reason[lang] ?? null} />
      <StepTracker />
    </section>
  );
}

/** One money line with its change against last month. */
function Line(p: { label: string; now: Fils; prev: Fils; month: string;
  minus?: boolean; total?: boolean }) {
  return (
    <div className={p.total === true ? s.total : undefined}>
      <dt>{p.label}</dt>
      <dd className={s.delta}>
        <SignedMoney value={fils(p.now - p.prev)} />
        <span className="visually-hidden">{p.month}</span>
      </dd>
      <dd className={p.minus === true ? s.minus : undefined}>
        {p.minus === true && <span aria-hidden="true">−</span>}
        <Money value={p.now} />
      </dd>
    </div>
  );
}
