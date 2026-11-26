import { steps, type StepId } from "../demo/derive";
import { useDemo } from "../demo/state";
import { formatDayMonth } from "../i18n/format";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import s from "./StepTracker.module.css";

const LABEL: Record<StepId, MessageKey> = {
  inputs: "home.stepInputs",
  bank: "home.stepBank",
  approve: "home.stepApprove",
  sif: "home.stepSif",
  pay: "home.stepPay",
};

/**
 * The pay month as five dated steps. The filled track runs to the
 * current step and moves on when the last open issue is settled.
 */
export function StepTracker() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const list = steps(data, state);
  const at = list.findIndex((x) => x.state === "now");
  const fill = list.length > 1 ? at / (list.length - 1) : 0;
  return (
    <div className={s.wrap}>
      <h3 className="visually-hidden">{t("home.progress")}</h3>
      <ol className={s.steps} style={{ "--fill": fill } as object}>
        <li className={s.track} aria-hidden="true">
          <span className={s.trackFill} />
        </li>
        {list.map((x) => (
          <li key={x.id} className={s.step} data-state={x.state}
            aria-current={x.state === "now" ? "step" : undefined}>
            <span className={s.node} aria-hidden="true">
              {x.state === "done" && <Icon name="check" size={12} />}
            </span>
            <span className={s.label}>{t(LABEL[x.id])}</span>
            <span className={s.meta}>
              <span className="tabular">{formatDayMonth(x.date, lang)}</span>
              {x.state !== "next" && (
                <span className={s.tag}>
                  {x.state === "done" ? t("home.stepDone")
                    : t("home.stepNow")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
