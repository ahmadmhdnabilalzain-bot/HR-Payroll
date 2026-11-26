import { Suspense, useEffect, useRef, useState } from "react";
import { useRunApproval } from "../demo/actions";
import { runApprovalId } from "../demo/derive";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDayMonth, formatMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { downloadText } from "../lib/download";
import { Icon } from "../ui/Icon";
import b from "../ui/button.module.css";
import {
  recordDecision,
  STEP_LABEL,
  STEPS,
  stepStates,
  type StepId,
  type StepState,
} from "./model";
import type { Go } from "./PayRun";
import s from "./RunBar.module.css";

const STATE_WORD: Record<StepState, "payrun.stateDone" | "payrun.stateNow" |
  "payrun.stateNext" | "payrun.stateWaiting" | null> = {
  done: "payrun.stateDone", now: "payrun.stateNow", next: "payrun.stateNext",
  waiting: "payrun.stateWaiting", tofix: null,
};

/**
 * Keeps the row under the shell's sticky top bar, whatever its height
 * (the bar is the shell's; this only reads it).
 */
function useBarOffset(ref: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    const bar = [...document.querySelectorAll<HTMLElement>("header")]
      .find((h) => getComputedStyle(h).position === "sticky");
    if (el === null || bar === undefined) return undefined;
    // On the parent, so the step's own pinned card can sit under it.
    const host = el.parentElement ?? el;
    const set = (): void => {
      host.style.setProperty("--run-top", `${bar.offsetHeight}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      host.style.removeProperty("--run-top");
    };
  }, [ref]);
}

/** True once the page has scrolled the row into its stuck place. */
function useStuck(sentinel: React.RefObject<HTMLElement | null>): boolean {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (el === null || typeof IntersectionObserver !== "function") {
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => {
      setStuck(e !== undefined && !e.isIntersecting);
    }, { rootMargin: "-160px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [sentinel]);
  return stuck;
}

/**
 * The pay run's one header: a 64 px row that stays under the top bar
 * while the step scrolls. The title and payday on the left; four dots
 * with the current step named (a 24 x 8 pill for the step on screen);
 * on the right, the step's one primary action. On a phone the same
 * row, with the four steps as a thin bar along its bottom edge.
 */
export function RunBar(p: { step: StepId; go: Go }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const a = useRunApproval();
  const row = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useBarOffset(row);
  const stuck = useStuck(sentinel);
  const h = data.headline();
  const cal = data.payCalendar();
  const states = stepStates(p.step, a);
  const at = STEPS.indexOf(p.step);
  const word = (id: StepId): string => {
    const w = STATE_WORD[states[id]];
    return w === null ? t("payrun.stateToFix", { count: a.blockedBy.length })
      : t(w);
  };
  return (
    <>
      <div ref={sentinel} className={s.sentinel} aria-hidden="true" />
      <div ref={row} className={s.bar} data-stuck={stuck}>
        <div className={s.inner}>
          <div className={s.titleBox}>
            <h1 className={s.title}>
              {t("payrun.title", { month: formatMonth(h.runMonth, lang) })}
            </h1>
            <p className={s.payday}>
              {t("payrun.sub", { date: formatDayMonth(cal.payday, lang) })}
            </p>
          </div>
          <nav className={s.steps} aria-label={t("payrun.steps")}>
            <ol className={s.dots}>
              {STEPS.map((id, i) => (
                <li key={id} className={s.dotItem}>
                  <a href={hrefOf("pay-run", id)} className={s.dotLink}
                    data-state={states[id]} data-current={id === p.step}
                    aria-current={id === p.step ? "step" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      if (id !== p.step) p.go(id);
                    }}>
                    <span className={s.dot} aria-hidden="true" />
                    <span className="visually-hidden">
                      {t("payrun.stepOf", { n: i + 1 })}:{" "}
                      {t(STEP_LABEL[id])}, {word(id)}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
            <p className={s.named} aria-hidden="true">
              <span className={s.namedStep}>{t(STEP_LABEL[p.step])}</span>
              <span className={s.namedState} data-state={states[p.step]}>
                {word(p.step)}
              </span>
            </p>
            <span className={s.thin} aria-hidden="true"
              style={{ "--at": at } as object}>
              {STEPS.map((id) => (
                <span key={id} data-state={states[id]}
                  data-current={id === p.step} />
              ))}
            </span>
          </nav>
          <div className={s.action}>
            <Primary step={p.step} go={p.go} />
          </div>
        </div>
      </div>
    </>
  );
}

/** A label with a shorter twin for the phone row. */
function Label(p: { full: string; short: string }) {
  return (
    <>
      <span className={s.full}>{p.full}</span>
      <span className={s.short} aria-hidden="true">{p.short}</span>
    </>
  );
}

const btn = `${b.btn} ${b.primary} ${s.act}`;

/** The step's one primary action. */
function Primary(p: { step: StepId; go: Go }) {
  const { t } = useLocale();
  if (p.step === "approve") return <ApproveAction go={p.go} />;
  if (p.step === "pay") {
    return (
      <Suspense fallback={<button type="button" className={btn} disabled>
        <Label full={t("payrun.download")} short={t("payrun.actDownload")} />
      </button>}>
        <DownloadAction />
      </Suspense>
    );
  }
  const next = STEPS[STEPS.indexOf(p.step) + 1] ?? "approve";
  const full = t("payrun.continueTo", { step: t(STEP_LABEL[next]) });
  return (
    <a href={hrefOf("pay-run", next)} className={btn} aria-label={full}
      onClick={(e) => {
        e.preventDefault();
        p.go(next);
      }}>
      <Label full={full} short={t("payrun.actContinue")} />
      <Icon name="arrowEnd" size={18} />
    </a>
  );
}

/**
 * Approve: only through the shared useRunApproval (as on Home). The
 * reason it is not open yet is said on the page, under the decision.
 */
function ApproveAction(p: { go: Go }) {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const a = useRunApproval();
  const id = runApprovalId(data);
  const verdict = id === null ? undefined : state.decided[id];
  if (verdict === "approve") {
    const full = t("payrun.continueTo", { step: t("payrun.pay") });
    return (
      <a href={hrefOf("pay-run", "pay")} className={btn} aria-label={full}
        onClick={(e) => {
          e.preventDefault();
          p.go("pay");
        }}>
        <Label full={full} short={t("payrun.actContinue")} />
        <Icon name="arrowEnd" size={18} />
      </a>
    );
  }
  if (verdict === "decline") return null;
  const full = t("payrun.approveBtn");
  return (
    <button type="button" className={btn} disabled={!a.canDecide}
      aria-label={full}
      aria-describedby={a.canDecide ? undefined : "approve-why"}
      onClick={() => {
        if (id !== null) recordDecision(id);
        a.decide("approve");
      }}>
      <Label full={full} short={t("payrun.actApprove")} />
    </button>
  );
}

/** Fired on window when the salary file is downloaded (Pay listens). */
export const FILE_DOWNLOADED = "mubinflow:file-downloaded";

/** Pay: the salary file, open only once the run is approved. */
function DownloadAction() {
  const { t } = useLocale();
  const a = useRunApproval();
  const f = useRunDetail().file;
  const full = t("payrun.download");
  return (
    <button type="button" className={btn} disabled={a.phase !== "file"}
      aria-label={full}
      onClick={() => {
        downloadText(f.fileName, f.text, "text/plain");
        dispatchEvent(new Event(FILE_DOWNLOADED));
      }}>
      <Label full={full} short={t("payrun.actDownload")} />
    </button>
  );
}
