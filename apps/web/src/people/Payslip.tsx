import { Explainable } from "../components/explain";
import type { PayslipLineView, PayslipView } from "../demo/data/people-types";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { canSeePay } from "../demo/time-off";
import { formatMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Money } from "../ui/Money";
import { dayText, lineLabel } from "./words";
import p from "./page.module.css";
import s from "./Payslip.module.css";

/** The month's payslip, line by line; every figure explains itself. */
export function Payslip(q: { id: string }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const x = data.people.person(q.id);
  const slip = data.people.payslip(q.id);
  if (x === null) return null;
  const month = formatMonth(data.headline().runMonth, lang);
  const allowed = canSeePay(data, state, q.id);
  return (
    <div className={`${p.page} ${s.page}`}>
      <header className={p.header}>
        <nav aria-label={t("shell.breadcrumb")} className={p.crumbs}>
          {state.role !== "employee" && (
            <>
              <a href={hrefOf("people")}>{t("people.back")}</a>
              <span aria-hidden="true" className={p.sep}>/</span>
            </>
          )}
          <a href={hrefOf("people", q.id)}>{x.name[lang]}</a>
          <span aria-hidden="true" className={p.sep}>/</span>
          <span aria-current="page">{t("people.pay")}</span>
        </nav>
        <h1 className={p.title}>{t("people.payslipTitle", { month })}</h1>
        {slip !== null && allowed && (
          <p className={p.lead}>
            {x.name[lang]} · {t("people.period", {
              from: dayText(slip.payStart, lang),
              to: dayText(slip.payEnd, lang) })}
          </p>
        )}
      </header>
      {!allowed ? (
        <p className={p.empty}>{t("people.payslipPrivate")}</p>
      ) : slip === null ? (
        <p className={p.empty}>{t("people.noPayslip", { month })}</p>
      ) : (
        <Slip slip={slip} />
      )}
    </div>
  );
}

/** The shared panel's explanation for one line of this payslip. */
function useExplained(slip: PayslipView, traceId: string, label: string) {
  const { lang } = useLocale();
  const { data } = useDemo();
  return data.people.explain(slip.id, traceId, label, lang);
}

function Line(q: { slip: PayslipView; line: PayslipLineView }) {
  const { t } = useLocale();
  const label = lineLabel(q.line, t);
  const ex = useExplained(q.slip, q.line.traceId, label);
  return (
    <div className={s.line}>
      <dt>{label}</dt>
      <dd>
        <Explainable explanation={ex}>
          <Money value={q.line.amountFils} tween={false} />
        </Explainable>
      </dd>
    </div>
  );
}

/** A national's pension: not computed, said where the line would be. */
function Pension(q: { slip: PayslipView; traceId: string }) {
  const { t } = useLocale();
  const label = t("people.pensionNote");
  const ex = useExplained(q.slip, q.traceId, label);
  return (
    <div className={s.line}>
      <dt>{label}</dt>
      <dd>
        <Explainable explanation={ex}>
          <span className={s.notComputed}>{t("people.notComputed")}</span>
        </Explainable>
      </dd>
    </div>
  );
}

function Total(q: { slip: PayslipView; traceId: string; label: string;
  value: PayslipView["netFils"]; strong?: boolean }) {
  const ex = useExplained(q.slip, q.traceId, q.label);
  return (
    <div className={s.total} data-strong={q.strong === true}>
      <dt>{q.label}</dt>
      <dd>
        <Explainable explanation={ex}>
          <Money value={q.value} size={q.strong === true ? "lg" : "md"}
            tween={false} />
        </Explainable>
      </dd>
    </div>
  );
}

function Slip(q: { slip: PayslipView }) {
  const { lang, t } = useLocale();
  const slip = q.slip;
  const earnings = slip.lines.filter((l) => l.group === "earning");
  const deductions = slip.lines.filter((l) => l.group === "deduction");
  return (
    <article className={s.slip} aria-label={t("people.pay")}>
      <p className={s.hint}>{t("people.explainHint")}</p>
      <section aria-labelledby="slip-earn">
        <h2 id="slip-earn" className={s.groupTitle}>
          {t("people.earnings")}
        </h2>
        <dl className={s.lines}>
          {earnings.map((l) => <Line key={l.traceId} slip={slip} line={l} />)}
          <Total slip={slip} traceId={slip.grossTraceId}
            label={t("people.gross")} value={slip.grossFils} />
        </dl>
      </section>
      <section aria-labelledby="slip-ded">
        <h2 id="slip-ded" className={s.groupTitle}>
          {t("people.deductions")}
        </h2>
        <dl className={s.lines}>
          {deductions.map((l) => (
            <Line key={l.traceId} slip={slip} line={l} />
          ))}
          {slip.pension !== null && (
            <Pension slip={slip} traceId={slip.pension.traceId} />
          )}
          {deductions.length === 0 && slip.pension === null && (
            <p className={s.none}>{t("people.noDeductions")}</p>
          )}
          <Total slip={slip} traceId={slip.deductionsTraceId}
            label={t("people.totalDeductions")}
            value={slip.deductionsFils} />
        </dl>
        {slip.pension !== null && (
          <p className={s.pension}>{slip.pension.text[lang]}</p>
        )}
      </section>
      <dl className={s.netBlock}>
        <Total slip={slip} traceId={slip.netTraceId}
          label={t("people.net")} value={slip.netFils} strong />
      </dl>
      {slip.held !== null && (
        <p className={s.held}><strong>{t("people.held")}. </strong>
          {slip.held}</p>
      )}
      <p className={s.scope}>{slip.rulesScope[lang]}</p>
    </article>
  );
}
