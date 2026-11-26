import { fils, type Fils } from "@payroll/engine";
import { notes } from "../demo/derive";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { useLocale } from "../i18n/LocaleProvider";
import { monthName, SignedMoney } from "../payrun/Change";
import { Money } from "../ui/Money";
import { Sources } from "./Sources";
import s from "./MakeUp.module.css";

/**
 * October against September, below the fold: gross, deductions and
 * net with their change, the salary-file split, who prepared and who
 * approves, and the sources on demand.
 */
export function MakeUp() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const run = useRunDetail();
  const h = data.headline();
  const people = data.runPeople();
  const name = (id: string): string => data.employee(id).name[lang];
  const note = notes(data)[0];
  const month = monthName(run.prevMonth, lang);
  return (
    <section className={s.panel} aria-labelledby="makeup-title">
      <header className={s.head}>
        <h2 id="makeup-title" className={s.title}>{t("home.makeUp")}</h2>
        <span className={s.note}>{t("home.vsLast", { month })}</span>
      </header>
      <dl className={s.rows}>
        <Row label={t("home.gross")} now={h.grossTotalFils}
          prev={run.prev.gross} />
        <Row label={t("home.deductions")} now={h.deductionsFils}
          prev={run.prev.deductions} />
        <Row label={t("home.net")} now={h.netTotalFils} prev={run.prev.net}
          strong />
        <Row label={t("home.inSif")} now={h.sifTotalFils} prev={null} />
        <Row label={t("home.held")} now={h.heldNetFils} prev={null} />
      </dl>
      <p className={s.people}>
        {t("home.preparedBy", { name: name(people.makerId) })}
        {" · "}
        {t("home.checker", { name: name(people.checkerId) })}
        <button type="button" className={s.sources}
          aria-expanded={state.sourcesOpen} aria-controls="sources"
          onClick={() => dispatch({ type: "sources",
            open: !state.sourcesOpen })}>
          {state.sourcesOpen ? t("home.hideSources") : t("home.sources")}
        </button>
      </p>
      <Sources note={note?.reason[lang] ?? null} />
    </section>
  );
}

function Row(p: { label: string; now: Fils; prev: Fils | null;
  strong?: boolean }) {
  return (
    <div className={s.row} data-strong={p.strong === true}>
      <dt>{p.label}</dt>
      <dd className={s.delta}>
        {p.prev !== null && <SignedMoney value={fils(p.now - p.prev)} />}
      </dd>
      <dd><Money value={p.now} /></dd>
    </div>
  );
}
