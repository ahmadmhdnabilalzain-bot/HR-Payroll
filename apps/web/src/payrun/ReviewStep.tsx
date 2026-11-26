import type { Fils } from "@payroll/engine";
import { useId, useState } from "react";
import { ExplainLink, Explainable } from "../components/explain";
import type { PersonRow } from "../demo/data/run-types";
import { useTweenedNumber } from "../demo/motion";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { ChangeNote, CountChange, monthName, SignedMoney } from "./Change";
import { ExplainHint } from "./ExplainHint";
import { RollMoney } from "./Roll";
import s from "./PayRun.module.css";

/**
 * Step 1: what this month pays, against last month. Only the people
 * whose pay moved or is held are listed; everyone else sits behind
 * "Show all 31 people".
 */
export function ReviewStep() {
  const { lang, t } = useLocale();
  const d = useRunDetail();
  const typos = new Set(useDemo().data.badIbanIds());
  const [all, setAll] = useState(false);
  const listId = useId();
  const pm = d.prevMonth;
  const month = monthName(pm, lang);
  const people = useTweenedNumber(d.totals.headcount);
  const flagged = (p: PersonRow): boolean =>
    p.significant || p.prevNet === null || !p.inFile || typos.has(p.id);
  const shown = d.people.filter(flagged);
  const rest = d.people.filter((p) => !flagged(p));
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>{t("payrun.reviewTitle")}</h2>
      <p className={s.stepSub}>{t("payrun.reviewSub", { month })}</p>
      <dl className={s.totals}>
        <div className={`${s.total} ${s.totalLead}`}>
          <dt>{t("payrun.net")}</dt>
          <dd className={s.leadFigure}>
            <Explainable explanation={d.explain["run:net"]}>
              <RollMoney value={d.totals.net} size="hero" />
            </Explainable>
            <ExplainHint />
          </dd>
          <dd><ChangeNote now={d.totals.net} prev={d.prev.net} month={pm} />
          </dd>
        </div>
        <Total label={t("payrun.gross")} now={d.totals.gross}
          prev={d.prev.gross} month={pm} />
        <Total label={t("payrun.deductions")} now={d.totals.deductions}
          prev={d.prev.deductions} month={pm} />
        <div className={s.total}>
          <dt>{t("payrun.people")}</dt>
          <dd className={s.count}><span className="tabular">{people}</span></dd>
          <dd><CountChange now={d.totals.headcount}
            prev={d.prev.headcount} month={pm} /></dd>
        </div>
      </dl>
      <p className={s.footnote}>{d.pensionNote}</p>

      <section aria-labelledby="changed-title" className={s.block}>
        <h3 id="changed-title" className={s.blockTitle}>
          {t("payrun.changedTitle", { month })}
        </h3>
        <p className={s.blockSub}>{t("payrun.changedSub")}</p>
        <ul className={s.group} id={listId}>
          {shown.map((p, i) => (
            <PersonLine key={p.id} p={p} i={i} typo={typos.has(p.id)}
              month={month} />
          ))}
          {all && rest.map((p, i) => (
            <PersonLine key={p.id} p={p} i={i} typo={false} month={month} />
          ))}
          <li className={s.disclosureRow}>
            <button type="button" className={s.disclosure}
              aria-expanded={all} aria-controls={listId}
              onClick={() => setAll(!all)}>
              <span className={s.chev} data-open={all}>
                <Icon name="chevronEnd" size={18} />
              </span>
              {all ? t("payrun.showChanged")
                : t("payrun.showAll", { count: d.people.length })}
            </button>
          </li>
        </ul>
        {d.settlements.map((x) => (
          <p key={x.personId} className={s.settlement}>
            {t("payrun.settlement", { name: x.name })}{" "}
            <ExplainLink explanation={d.explain[x.explainId]}>
              {t("payrun.settlementLink")}
            </ExplainLink>
          </p>
        ))}
      </section>
    </section>
  );
}

function PersonLine(p: { p: PersonRow; i: number; typo: boolean;
  month: string }) {
  const { t } = useLocale();
  const d = useRunDetail();
  const r = p.p;
  const flag = !r.inFile ? t("payrun.held") : p.typo ? t("payrun.ibanTypo")
    : null;
  return (
    <li className={s.row} style={{ "--i": Math.min(p.i, 8) } as object}>
      <span className={s.dotCol}>
        {flag !== null && (
          <span className={s.dot8} data-tone={r.inFile ? "warn" : "bad"} />
        )}
      </span>
      <span className={s.rowMain}>
        <span className={s.name}>{r.name}</span>
        <span className={s.reason}>
          {r.significant ? r.reasons.join("; ") : r.department}
        </span>
        {flag !== null && (
          <span className={s.flag} data-tone={r.inFile ? "warn" : "bad"}>
            {flag}
          </span>
        )}
      </span>
      <span className={s.rowFigures}>
        <Explainable explanation={d.explain[r.explainId]}>
          <Money value={r.net} size="md" />
        </Explainable>
        <span className={s.rowChange}>
          {r.prevNet === null ? t("payrun.newThisMonth")
            : <SignedMoney value={r.change} />}
        </span>
      </span>
    </li>
  );
}

function Total(p: { label: string; now: Fils; prev: Fils; month: string }) {
  return (
    <div className={s.total}>
      <dt>{p.label}</dt>
      <dd><RollMoney value={p.now} size="lg" /></dd>
      <dd><ChangeNote now={p.now} prev={p.prev} month={p.month} /></dd>
    </div>
  );
}
