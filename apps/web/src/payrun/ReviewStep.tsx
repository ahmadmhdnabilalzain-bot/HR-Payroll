import type { Fils } from "@payroll/engine";
import { ExplainLink, Explainable } from "../components/explain";
import { useTweenedNumber } from "../demo/motion";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { useLocale } from "../i18n/LocaleProvider";
import { Money } from "../ui/Money";
import { ChangeNote, CountChange, monthName, SignedMoney } from "./Change";
import s from "./PayRun.module.css";

/** Step 1: what this month pays, against last month, and who. */
export function ReviewStep() {
  const { lang, t } = useLocale();
  const d = useRunDetail();
  const typos = new Set(useDemo().data.badIbanIds());
  const pm = d.prevMonth;
  const month = monthName(pm, lang);
  const people = useTweenedNumber(d.totals.headcount);
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>{t("payrun.reviewTitle")}</h2>
      <p className={s.stepSub}>{t("payrun.reviewSub", { month })}</p>
      <dl className={s.totals}>
        <div className={`${s.total} ${s.totalLead}`}>
          <dt>{t("payrun.net")}</dt>
          <dd className={s.leadFigure}>
            <Explainable explanation={d.explain["run:net"]}>
              <Money value={d.totals.net} size="hero" />
            </Explainable>
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

      <section aria-labelledby="changed-title" className={s.block}>
        <h3 id="changed-title" className={s.blockTitle}>
          {t("payrun.changedTitle", { month })}
        </h3>
        <p className={s.blockSub}>{t("payrun.changedSub")}</p>
        <ul className={s.changes}>
          {d.changes.map((c, i) => (
            <li key={c.personId} className={s.changeRow}
              style={{ "--i": Math.min(i, 8) } as object}>
              <span className={s.changeWho}>
                <span className={s.name}>{c.name}</span>
                <span className={s.reason}>{c.reason}</span>
              </span>
              <span className={s.num}><SignedMoney value={c.change} /></span>
            </li>
          ))}
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

      <section aria-labelledby="everyone-title" className={s.block}>
        <h3 id="everyone-title" className={s.blockTitle}>
          {t("payrun.everyone")}
        </h3>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">{t("payrun.colName")}</th>
              <th scope="col" className={s.numCol}>{t("payrun.colNet")}</th>
              <th scope="col" className={s.numCol}>
                {t("payrun.colChange", { month })}
              </th>
              <th scope="col" className={s.fileCol}>
                {t("payrun.colFile")}
              </th>
            </tr>
          </thead>
          <tbody>
            {d.people.map((p) => (
              <tr key={p.id}>
                <th scope="row" className={s.who}>
                  <span className={s.name}>{p.name}</span>
                  <span className={s.reason}>
                    {p.significant ? p.reasons.join("; ") : p.department}
                  </span>
                </th>
                <td className={s.numCol} data-label={t("payrun.colNet")}>
                  <Explainable explanation={d.explain[p.explainId]}>
                    <Money value={p.net} size="sm" />
                  </Explainable>
                </td>
                <td className={s.numCol}
                  data-label={t("payrun.colChange", { month })}>
                  {p.prevNet === null
                    ? <span className={s.muted}>
                      {t("payrun.newThisMonth")}</span>
                    : <SignedMoney value={p.change} />}
                </td>
                <td className={s.fileCol}>
                  <span className={s.status} data-tone={!p.inFile ? "bad"
                    : typos.has(p.id) ? "warn" : "ok"}>
                    <span className={s.pip} aria-hidden="true" />
                    {!p.inFile ? t("payrun.held") : typos.has(p.id)
                      ? t("payrun.ibanTypo") : t("payrun.inFile")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function Total(p: { label: string; now: Fils; prev: Fils; month: string }) {
  return (
    <div className={s.total}>
      <dt>{p.label}</dt>
      <dd><Money value={p.now} size="lg" /></dd>
      <dd><ChangeNote now={p.now} prev={p.prev} month={p.month} /></dd>
    </div>
  );
}
