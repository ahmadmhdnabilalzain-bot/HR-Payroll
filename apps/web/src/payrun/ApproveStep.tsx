import { useRunApproval, useSwitchRole } from "../demo/actions";
import { isBlocking, openIssues, runApprovalId } from "../demo/derive";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDate, formatTime } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { ScriptSignature, SignStamp } from "../ui/SignStamp";
import { ReleaseStatus } from "./ReleaseStatus";
import b from "../ui/button.module.css";
import {
  decisionTime,
  demoClockIso,
  forgetDecision,
  nowMs,
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
  const waiting = verdict === undefined;
  const fresh = at !== null && nowMs() - at < 2000;
  const blocked = a.blockedBy.length > 0;
  // Why Approve, or Continue to Pay, cannot be pressed yet, in words.
  const reason = !waiting ? null
    : blocked ? t("payrun.blocked", { count: blockedNames.length,
      names: names(blockedNames) })
      : !a.isChecker ? t("payrun.onlyGm", { name: checker.name[lang] })
        : t("payrun.payAfter", { name: checker.name[lang] });
  const decidedAt = at === null ? formatDate(cal.asOf, lang)
    : t("payrun.recordedWhen", { date: formatDate(cal.asOf, lang),
      time: formatTime(demoClockIso(at, detail.preparedOn,
        detail.preparedAt), lang) });
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>
        {t("payrun.approveTitle")}
      </h2>
      <p className={s.stepSub}>{t("payrun.approveSub")}</p>

      <div className={s.approveGrid}>
        <ol className={s.chain} aria-label={t("payrun.chainLabel")}>
          <li className={s.chainItem} data-state="done">
            <span className={s.chainNode} aria-hidden="true">
              <Icon name="check" size={14} />
            </span>
            <div className={s.chainText}>
              <p className={s.chainLabel}>{t("payrun.prepared")}</p>
              <p className={s.chainWho}>{maker.name[lang]}</p>
              <p className={s.chainRole}>{maker.role[lang]}</p>
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
            {verdict === "approve" ? (
              <SignStamp className={s.stamp} seal={false}
                label={t("payrun.chainRecorded")}
                name={checker.name[lang]} role={checker.role[lang]}
                when={decidedAt} fresh={fresh}>
                <ScriptSignature name={checker.name[lang]} />
              </SignStamp>
            ) : (
              <div className={s.chainText}>
                <p className={s.chainLabel}>
                  {verdict === "decline" ? t("payrun.chainDeclined")
                    : t("payrun.chainWaiting")}
                </p>
                <p className={s.chainWho}>{checker.name[lang]}</p>
                <p className={s.chainRole}>{checker.role[lang]}</p>
                <p className={s.chainWhen}>
                  {waiting ? t("payrun.notYet") : decidedAt}
                </p>
              </div>
            )}
          </li>
        </ol>

        <div className={s.approveBox}>
          <div className={s.approveHead}>
            <h3 className={s.blockTitle}>{t("payrun.whatYouApprove")}</h3>
            <ReleaseStatus released={verdict === "approve"}
              fresh={verdict === "approve" && fresh} />
          </div>
          <dl className={s.approveFigures}>
            <div>
              <dt>{t("payrun.netTo", { count: h.headcount })}</dt>
              <dd className={s.approveLead}>
                <Money value={h.netTotalFils} size="hero" /></dd>
            </div>
            <div>
              <dt>{t("payrun.fileTo", { count: h.sifPeople })}</dt>
              <dd><Money value={h.sifTotalFils} size="lg" /></dd>
            </div>
          </dl>
          <p className={s.checksLine}>
            {open === 0 ? t("payrun.allChecked")
              : t("payrun.openChecks", { count: open })}
          </p>

          <div className={s.approveActions}>
            {waiting ? (
              a.isChecker && (
                <button type="button"
                  className={`${b.btn} ${b.quiet} ${b.large} ${s.act}`}
                  disabled={!a.canDecide}
                  onClick={() => decide("decline")}>
                  {t("payrun.declineBtn")}
                </button>
              )
            ) : (
              a.isChecker && id !== null && (
                <button type="button"
                  className={`${b.btn} ${b.quiet} ${b.large} ${s.act}`}
                  onClick={() => {
                    forgetDecision(id);
                    dispatch({ type: "undecide", id });
                  }}>{t("payrun.undo")}</button>
              )
            )}
          </div>

          {reason !== null && (
            <div className={s.why} data-tone={blocked ? "bad" : "info"}
              role="status">
              <span className={s.dot8} aria-hidden="true"
                data-tone={blocked ? "bad" : "info"} />
              <div className={s.whyText}>
                <p id="approve-why">{reason}</p>
                {blocked && (
                  <a href="#/pay-run/fix" className={s.inlineLink}
                    onClick={(e) => {
                      e.preventDefault();
                      p.go("fix");
                    }}>{t("payrun.goFix")}</a>
                )}
                {!blocked && !a.isChecker && (
                  <button type="button"
                    className={`${b.btn} ${b.secondary} ${s.act}`}
                    onClick={() => switchRole("gm")}>
                    {t("payrun.viewAsGm")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
