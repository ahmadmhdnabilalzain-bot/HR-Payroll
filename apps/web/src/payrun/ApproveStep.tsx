import { useRunApproval, useSwitchRole } from "../demo/actions";
import { isBlocking, openIssues, runApprovalId } from "../demo/derive";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDate, formatTime } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import b from "../ui/button.module.css";
import {
  decisionTime,
  forgetDecision,
  recordDecision,
} from "./model";
import type { Go } from "./PayRun";
import s from "./PayRun.module.css";

/** A list of names in a sentence: "A", "A and B", "A, B and C". */
function names(xs: string[]): string {
  if (xs.length < 2) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/**
 * Step 3: maker and checker. The HR manager prepared the run; only the
 * General Manager approves, and only once no payslip lacks a valid
 * bank account (the shared useRunApproval, as on Home).
 */
export function ApproveStep(p: { go: Go }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const a = useRunApproval();
  const detail = useRunDetail();
  const switchRole = useSwitchRole();
  const h = data.headline();
  const cal = data.payCalendar();
  const people = data.runPeople();
  const maker = data.employee(people.makerId);
  const checker = data.employee(people.checkerId);
  const id = runApprovalId(data);
  const verdict = id === null ? undefined : state.decided[id];
  const at = id === null ? null : decisionTime(id);
  const open = openIssues(data, state).filter((i) => !isBlocking(i))
    .length;
  const blockedNames = a.blockedBy.map((x) => data.employee(x).name[lang]);
  const decide = (v: "approve" | "decline"): void => {
    if (id !== null) recordDecision(id);
    a.decide(v);
  };
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>
        {t("payrun.approveTitle")}
      </h2>
      <p className={s.stepSub}>{t("payrun.approveSub")}</p>

      <ol className={s.chain}>
        <li className={s.chainItem} data-state="done">
          <span className={s.chainNode} aria-hidden="true">
            <Icon name="check" size={14} />
          </span>
          <div>
            <p className={s.chainLabel}>{t("payrun.prepared")}</p>
            <p className={s.chainWho}>
              {t("payrun.preparedBy", { name: maker.name[lang],
                role: maker.role[lang] })}
            </p>
            <p className={s.chainWhen}>
              {t("payrun.preparedWhen", { date: formatDate(
                detail.preparedOn, lang), time: detail.preparedAt })}
            </p>
          </div>
        </li>
        <li className={s.chainItem}
          data-state={verdict === "approve" ? "done"
            : verdict === "decline" ? "bad" : "now"}>
          <span className={s.chainNode} aria-hidden="true">
            {verdict === "approve" ? <Icon name="check" size={14} />
              : verdict === "decline" ? <Icon name="x" size={14} /> : null}
          </span>
          <div>
            <p className={s.chainLabel}>{t("payrun.approval")}</p>
            <p className={s.chainWho}>
              {verdict === "approve" ? t("payrun.recorded",
                { name: checker.name[lang], role: checker.role[lang] })
                : verdict === "decline" ? t("payrun.declined",
                  { name: checker.name[lang], role: checker.role[lang] })
                  : t("payrun.waitingFor", { name: checker.name[lang],
                    role: checker.role[lang] })}
            </p>
            {verdict !== undefined && (
              <p className={s.chainWhen}>
                {at === null ? t("payrun.recordedDay",
                  { date: formatDate(cal.asOf, lang) })
                  : t("payrun.recordedWhen", { date: formatDate(cal.asOf,
                    lang), time: formatTime(new Date(at).toISOString(),
                    lang) })}
              </p>
            )}
          </div>
        </li>
      </ol>

      <div className={s.approveBox}>
        <h3 className={s.blockTitle}>{t("payrun.whatYouApprove")}</h3>
        <dl className={s.approveFigures}>
          <div>
            <dt>{t("payrun.netTo", { count: h.headcount })}</dt>
            <dd><Money value={h.netTotalFils} size="lg" /></dd>
          </div>
          <div>
            <dt>{t("payrun.fileTo", { count: h.sifPeople })}</dt>
            <dd><Money value={h.sifTotalFils} size="lg" /></dd>
          </div>
        </dl>

        {verdict === undefined && a.blockedBy.length > 0 && (
          <div className={s.reasonBox} role="status">
            <Icon name="alert" size={18} />
            <div>
              <p>{t("payrun.blocked", { count: blockedNames.length,
                names: names(blockedNames) })}</p>
              <a href="#/pay-run/fix" className={s.inlineLink}
                onClick={(e) => {
                  e.preventDefault();
                  p.go("fix");
                }}>{t("payrun.goFix")}</a>
            </div>
          </div>
        )}
        {verdict === undefined && a.blockedBy.length === 0 &&
          !a.isChecker && (
          <div className={s.reasonBox} data-tone="info" role="status">
            <Icon name="info" size={18} />
            <div>
              <p>{t("payrun.onlyGm", { name: checker.name[lang] })}</p>
              <button type="button"
                className={`${b.btn} ${b.secondary} ${s.act}`}
                onClick={() => switchRole("gm")}>
                {t("payrun.viewAsGm")}
              </button>
            </div>
          </div>
        )}

        <p className={s.checksLine}>
          {open === 0 ? t("payrun.allChecked")
            : t("payrun.openChecks", { count: open })}
        </p>

        <div className={s.approveActions}>
          {verdict === undefined ? (
            <>
              <button type="button"
                className={`${b.btn} ${b.primary} ${b.large} ${s.act}`}
                disabled={!a.canDecide}
                onClick={() => decide("approve")}>
                {t("payrun.approveBtn")}
              </button>
              {a.isChecker && (
                <button type="button"
                  className={`${b.btn} ${b.quiet} ${b.large} ${s.act}`}
                  disabled={!a.canDecide}
                  onClick={() => decide("decline")}>
                  {t("payrun.declineBtn")}
                </button>
              )}
            </>
          ) : (
            <>
              {verdict === "approve" && (
                <a href="#/pay-run/pay"
                  className={`${b.btn} ${b.primary} ${b.large} ${s.act}`}
                  onClick={(e) => {
                    e.preventDefault();
                    p.go("pay");
                  }}>{t("payrun.continueTo", { step: t("payrun.pay") })}
                  <Icon name="arrowEnd" /></a>
              )}
              {a.isChecker && id !== null && (
                <button type="button"
                  className={`${b.btn} ${b.quiet} ${b.large} ${s.act}`}
                  onClick={() => {
                    forgetDecision(id);
                    dispatch({ type: "undecide", id });
                  }}>{t("payrun.undo")}</button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
