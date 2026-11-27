import { fils, type Fils } from "@payroll/engine";
import { notes, runPhase } from "../demo/derive";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { useLocale } from "../i18n/LocaleProvider";
import { monthName, SignedMoney } from "../payrun/Change";
import { Money } from "../ui/Money";
import { useRowLink } from "../ui/RowLink";
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
          prev={run.prev.gross} href={hrefOf("reports", "summary")} />
        <Row label={t("home.deductions")} now={h.deductionsFils}
          prev={run.prev.deductions}
          href={hrefOf("pay-run", "deductions")} />
        <Row label={t("home.net")} now={h.netTotalFils} prev={run.prev.net}
          strong href={hrefOf("reports", "summary")} />
        <Row label={t("home.inSif")} now={h.sifTotalFils} prev={null}
          href={hrefOf("pay-run", "pay")} />
        <Row label={t("home.held")} now={h.heldNetFils} prev={null}
          href={hrefOf("pay-run", "fix")} />
      </dl>
      <p className={s.people}>
        {t("home.preparedBy", { name: name(people.makerId) })}
        {" · "}
        {t(runPhase(data, state) === "file" ? "home.checkerDone"
          : "home.checker", { name: name(people.checkerId) })}
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

/** One line of the make-up; the whole line opens where it comes from. */
function Row(p: { label: string; now: Fils; prev: Fils | null;
  strong?: boolean; href: string }) {
  const link = useRowLink({ href: p.href });
  return (
    <div {...link} className={`${s.row} ${link.className}`}
      data-strong={p.strong === true}>
      <dt>{p.label}</dt>
      <dd className={s.delta}>
        {p.prev !== null && <SignedMoney value={fils(p.now - p.prev)} />}
      </dd>
      <dd><Money value={p.now} /></dd>
    </div>
  );
}
