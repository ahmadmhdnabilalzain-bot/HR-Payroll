import { steps, type StepId } from "../demo/derive";
import { useDemo } from "../demo/state";
import { formatDayMonth } from "../i18n/format";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import s from "./StepTracker.module.css";

const LABEL: Record<StepId, MessageKey> = {
  inputs: "home.stepInputs",
  bank: "home.stepBank",
  approve: "home.stepApprove",
  sif: "home.stepSif",
  pay: "home.stepPay",
};

/**
 * The pay month in one line: "Step 2 of 5 · Bank details", five small
 * dots, and what comes next with its date. Every part comes from the
 * shared steps(); the dots fill as the run moves on.
 */
export function StepTracker() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const list = steps(data, state);
  const at = Math.max(list.findIndex((x) => x.state === "now"), 0);
  const now = list[at];
  const next = list[at + 1];
  if (now === undefined) return null;
  return (
    <div className={s.wrap} role="group" aria-label={t("home.progress")}>
      <ol className={s.dots} aria-hidden="true">
        {list.map((x, i) => (
          <li key={x.id} data-state={x.state} title={t(LABEL[x.id])}
            style={{ "--n": i } as object} />
        ))}
      </ol>
      <p className={s.line}>
        <span className={s.now} aria-current="step">
          {t("home.stepOf", { n: at + 1, count: list.length })}
          {" · "}{t(LABEL[now.id])}
        </span>
        {next !== undefined && (
          <span className={s.next}>
            {t("home.stepNext", { step: t(LABEL[next.id]),
              date: formatDayMonth(next.date, lang) })}
          </span>
        )}
      </p>
    </div>
  );
}
