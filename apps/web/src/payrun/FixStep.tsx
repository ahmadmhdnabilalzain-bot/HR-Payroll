import { fils, type Fils } from "@payroll/engine";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ExplainLink } from "../components/explain";
import type { Issue } from "../demo/data/types";
import { confirmations, isBlocking } from "../demo/derive";
import { beforeApproval } from "../reports/dash/model";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { IbanForm } from "../home/IbanForm";
import { formatSignedMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import b from "../ui/button.module.css";
import { fly } from "../ui/flight";
import { RollDigits } from "../ui/RollDigits";
import { RollMoney, shortFade } from "./Roll";
import { useListFlip } from "../ui/templates/listEnter";
import m from "../ui/templates/motion.module.css";
import s from "./PayRun.module.css";

/** Which explanation an issue points at, when there is one. */
function explainIdOf(i: Issue): string | null {
  if (i.employeeId === null) return null;
  if (i.code === "OVERTIME_DAILY_CAP_EXCEEDED") {
    return `overtime:${i.employeeId}`;
  }
  if (i.code === "DEDUCTION_DEFERRED") return `loan:${i.employeeId}`;
  if (i.code === "SETTLEMENT_PARTIAL") return `gratuity:${i.employeeId}`;
  return null;
}

/**
 * Source wording ("secondary-sourced, as we read it") belongs in the
 * explain panel only; the list keeps the plain sentence.
 */
export function plainOnly(text: string): string {
  return text.replace(/\s*\([^)]*(secondary|as we read)[^)]*\)/gi, "");
}

/**
 * The held amount flying into the file total. When an IBAN passes and
 * held pay drops, a "+AED 25,300.00" chip leaves the fixed row (its
 * rect is taken before the save) and lands on the total (420 ms
 * spring, ui/flight); only then do the total roll digit by digit and
 * "held out" change. Any other change settles at once. Reduced
 * motion: no flight, the figures change with a short fade.
 */
function useHeldFlight(total: Fils, held: Fils, people: number,
  target: RefObject<HTMLElement | null>): {
  total: Fils; held: Fils; people: number;
  from: RefObject<DOMRect | null> } {
  const { lang } = useLocale();
  const { state } = useDemo();
  const [shown, setShown] = useState({ total, held, people });
  const from = useRef<DOMRect | null>(null);
  const was = useRef(held);
  useEffect(() => {
    const before = was.current;
    was.current = held;
    const settle = (): void => setShown({ total, held, people });
    const start = from.current;
    from.current = null;
    if (held >= before || start === null || target.current === null) {
      settle();
      return undefined;
    }
    const chip = document.createElement("span");
    chip.textContent = state.hideAmounts ? "+AED ••••••"
      : formatSignedMoney(fils(before - held), lang);
    return fly({ from: start, to: target.current, content: chip,
      className: s.chip ?? "", align: "end", onLand: settle });
  }, [total, held, people]);
  return { ...shown, from };
}

type Kind = "stops" | "check" | "confirm" | "fixed";

const KIND_WORD = {
  stops: "payrun.kindStops", check: "payrun.kindCheck",
  confirm: "payrun.kindConfirm", fixed: "payrun.kindFixed",
} as const;

/** The row's kind: an 8 px dot that carries the colour, and a word. */
function KindTag(p: { kind: Kind }) {
  const { t } = useLocale();
  return (
    <span className={s.kind}>
      {p.kind === "fixed"
        ? <span className={s.kindIcon}><Icon name="check" size={14} /></span>
        : <span className={s.dot8} aria-hidden="true" data-tone={
          p.kind === "stops" ? "bad" : p.kind === "check" ? "warn"
            : "info"} />}
      {t(KIND_WORD[p.kind])}
    </span>
  );
}

/**
 * Step 2: one grouped list. What stops pay comes first (bank details:
 * entering an IBAN re-runs the real salary file check and the held pay
 * flows into the file), then what to check, then setup to confirm.
 * Each row says its kind once, as a dot and a word.
 */
export function FixStep() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const h = data.headline();
  const issues = data.issues().filter((i) => i.kind === "issue");
  const blockers = issues.filter(isBlocking);
  const checks = issues.filter((i) => !isBlocking(i));
  const setup = confirmations(data);
  const fixed = Object.keys(state.ibans);
  const isHr = state.role === "hr";
  const figure = useRef<HTMLSpanElement>(null);
  const shown = useHeldFlight(h.sifTotalFils, h.heldNetFils,
    h.sifPeople, figure);
  const heldBox = useRef<HTMLSpanElement>(null);
  const noneHeld = shown.held === 0n;
  useEffect(() => shortFade(heldBox.current), [noneHeld]);
  // The counts every surface shows: one source for "N stop pay, N to
  // check" (Home, the dashboards, the brief and this step).
  const count = beforeApproval(data, state);
  const open = count.checks;
  const list = useRef<HTMLDivElement>(null);
  useListFlip(list, [...blockers.map((i) => i.id),
    ...fixed.map((id) => `fixed-${id}`),
    ...(blockers.length === 0 && fixed.length === 0 ? ["none"] : []),
    ...checks.map((i) => i.id), ...setup.map((i) => i.id)]);
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>{t("payrun.fixTitle")}</h2>
      <p className={s.stepSub}>
        {isHr ? t("payrun.fixSub") : t("payrun.gmFixNote")}
      </p>

      <div className={s.fileNow} aria-live="polite">
        <span className={s.fileNowLabel}>{t("payrun.fileNow")}</span>
        <span className={s.fileNowFigure} ref={figure}>
          <RollDigits value={shown.total} size="lg" />
        </span>
        <span className={s.fileNowMeta} ref={heldBox}>
          {t("payrun.fileLine", { count: shown.people })},{" "}
          {noneHeld ? t("payrun.noneHeld") : <>
            <RollMoney value={shown.held} size="sm" />{" "}
            {t("payrun.heldNow")}</>}
        </span>
      </div>

      <section aria-labelledby="tofix-title" className={s.block}>
        <h3 id="tofix-title" className={s.groupTitle}>
          {t("payrun.fixListTitle")}
          <span className={s.groupCount}>
            {count.stops === 0 ? t("payrun.fixNoStops")
              : t("payrun.fixStops", { count: count.stops })},{" "}
            {open === 0 ? t("payrun.fixNoChecks")
              : t("payrun.fixChecks", { count: open })}
          </span>
        </h3>
        {/* A fixed row fades where it stood while the rows below slide
          * up over it (listEnter.ts). */}
        <div className={m.host} ref={list}>
        <ul className={s.group}>
          {blockers.map((i) => (
            <BlockerRow key={i.id} issue={i} canFix={isHr}
              from={shown.from} />
          ))}
          {fixed.map((id) => (
            <li key={`fixed-${id}`} className={s.row} data-done="true"
              data-key={`fixed-${id}`}>
              <span className={s.rowMain}>
                <KindTag kind="fixed" />
                <span className={s.name}>{t("payrun.fixedTitle")}
                  <span className={s.who}> · {data.employee(id)
                    .name[lang]}</span></span>
                <span className={s.reason}>{t("payrun.fixedIban",
                  { name: data.employee(id).name[lang] })}</span>
              </span>
            </li>
          ))}
          {blockers.length === 0 && fixed.length === 0 && (
            <li className={s.row} data-key="none">
              <span className={s.rowMain}>
                <span className={s.reason}>{t("payrun.nothingToFix")}</span>
              </span>
            </li>
          )}
          {checks.map((i, n) => (
            <CheckRow key={i.id} issue={i} canAct={isHr} index={n} />
          ))}
          {setup.map((i) => (
            <li key={i.id} className={s.row} data-key={i.id}>
              <span className={s.rowMain}>
                <KindTag kind="confirm" />
                <span className={s.name}>{i.title[lang]}</span>
                <span className={s.reason}>{i.reason[lang]}</span>
              </span>
            </li>
          ))}
        </ul>
        </div>
      </section>
    </section>
  );
}

function BlockerRow(p: { issue: Issue; canFix: boolean;
  from: RefObject<DOMRect | null> }) {
  const { lang, t } = useLocale();
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  const i = p.issue;
  const name = i.employeeId === null ? ""
    : data.employee(i.employeeId).name[lang];
  return (
    <li ref={row} className={s.row} id={`fix-${i.id}`} data-open={open}
      data-key={i.id}>
      <span className={s.rowMain}>
        <KindTag kind="stops" />
        <span className={s.name}>{i.title[lang]}
          <span className={s.who}> · {name}</span></span>
        <span className={s.reasonMain}>{plainOnly(i.reason[lang])}</span>
        <span className={s.reason}>{i.suggestedFix[lang]}</span>
      </span>
      {p.canFix && i.employeeId !== null && !open && (
        <span className={s.rowAction}>
          <button type="button"
            className={`${b.btn} ${b.secondary} ${s.act}`}
            onClick={() => setOpen(true)}>{t("payrun.enterIban")}</button>
        </span>
      )}
      {p.canFix && i.employeeId !== null && open && (
        <span className={s.rowForm}>
          <IbanForm employeeId={i.employeeId} name={name}
            onCancel={() => setOpen(false)}
            onSave={(value) => {
              // Where the held amount leaves from, before the row goes.
              p.from.current = row.current?.getBoundingClientRect() ?? null;
              dispatch({ type: "iban", employeeId: i.employeeId!, value });
              toast.show(t("payrun.fixedIban", { name }), () =>
                dispatch({ type: "unset-iban",
                  employeeId: i.employeeId! }));
            }} />
        </span>
      )}
    </li>
  );
}

function CheckRow(p: { issue: Issue; canAct: boolean; index: number }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const d = useRunDetail();
  const i = p.issue;
  const done = state.resolved[i.id];
  const ex = explainIdOf(i);
  const name = i.employeeId === null ? ""
    : data.employee(i.employeeId).name[lang];
  return (
    <li className={s.row} data-done={done !== undefined} data-key={i.id}
      style={{ "--i": Math.min(p.index, 8) } as object}>
      <span className={s.rowMain}>
        <KindTag kind={done !== undefined ? "fixed" : "check"} />
        <span className={s.name}>{i.title[lang]}
          {name !== "" && <span className={s.who}> · {name}</span>}</span>
        <span className={s.reasonMain}>{plainOnly(i.reason[lang])}</span>
        {/* One action per row (the button at its end); the working
            is a quiet link inside the advice, not a second action. */}
        <span className={s.reason}>{i.suggestedFix[lang]}
          {ex !== null && <>{" "}
            <ExplainLink explanation={d.explain[ex]} className={s.rowLink}>
              {t("payrun.howWorked")}
            </ExplainLink></>}
        </span>
      </span>
      <span className={s.rowAction}>
        {done !== undefined ? (
          <>
            <span className={s.doneWord}>
              {done === "renewal" ? t("payrun.renewalStarted")
                : t("payrun.reviewed")}
            </span>
            {p.canAct && (
              <button type="button" className={`${b.btn} ${b.quiet} ${s.act}`}
                onClick={() => dispatch({ type: "reopen", id: i.id })}>
                {t("payrun.reopen")}
              </button>
            )}
          </>
        ) : p.canAct && (
          <button type="button"
            className={`${b.btn} ${b.secondary} ${s.act}`}
            onClick={() => dispatch({ type: "resolve", id: i.id,
              how: i.fixKind === "renew-document" ? "renewal"
                : "reviewed" })}>
            {i.fixKind === "renew-document" ? t("payrun.startRenewal")
              : t("payrun.markReviewed")}
          </button>
        )}
      </span>
    </li>
  );
}
