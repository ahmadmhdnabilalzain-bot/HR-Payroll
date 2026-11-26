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
 * The held amount flying into the file total, in order: the IBAN
 * passes, a "+AED 25,300.00" chip leaves the row and lands on the
 * total's end edge (420 ms spring, ui/flight); only as it lands is the
 * IBAN saved, so the total starts its roll in the same frame as the
 * chip hands over (120 ms), "held out" changes, and the row moves to
 * "Fixed" after the flight, never before it. Reduced motion: no
 * flight, the save is at once and the figures change with a short
 * fade.
 */
function useFixFlight(target: RefObject<HTMLElement | null>)
  : (o: { from: Element | null; id: string; value: string;
    save(): void }) => void {
  const { lang } = useLocale();
  const { source, data, state } = useDemo();
  return (o) => {
    const before = data.headline().heldNetFils;
    const after = source.at({ ...state.ibans, [o.id]: o.value })
      .headline().heldNetFils;
    const from = o.from?.getBoundingClientRect();
    if (after >= before || from === undefined || target.current === null) {
      o.save();
      return;
    }
    const chip = document.createElement("span");
    chip.textContent = state.hideAmounts ? "+AED ••••••"
      : formatSignedMoney(fils(before - after), lang);
    fly({ from, to: target.current, content: chip,
      className: s.chip ?? "", align: "end", onLand: o.save });
  };
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
  const shown = { total: h.sifTotalFils, held: h.heldNetFils,
    people: h.sifPeople };
  // One chip in flight at a time: until it lands (and the IBAN is
  // saved), no other row opens, so no row is edited while the list
  // under it is about to change.
  const [busy, setBusy] = useState(false);
  const heldBox = useRef<HTMLSpanElement>(null);
  const noneHeld = shown.held === 0n;
  useEffect(() => shortFade(heldBox.current), [noneHeld]);
  // The counts every surface shows: one source for "N stop pay, N to
  // check" (Home, the dashboards, the brief and this step).
  const count = beforeApproval(data, state);
  const open = count.checks;
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
        <ul className={s.group}>
          {blockers.map((i) => (
            <BlockerRow key={i.id} issue={i} canFix={isHr}
              target={figure} busy={busy} setBusy={setBusy} />
          ))}
          {fixed.map((id) => (
            <li key={`fixed-${id}`} className={s.row} data-done="true">
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
            <li className={s.row}>
              <span className={s.rowMain}>
                <span className={s.reason}>{t("payrun.nothingToFix")}</span>
              </span>
            </li>
          )}
          {checks.map((i, n) => (
            <CheckRow key={i.id} issue={i} canAct={isHr} index={n} />
          ))}
          {setup.map((i) => (
            <li key={i.id} className={s.row}>
              <span className={s.rowMain}>
                <KindTag kind="confirm" />
                <span className={s.name}>{i.title[lang]}</span>
                <span className={s.reason}>{i.reason[lang]}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

function BlockerRow(p: { issue: Issue; canFix: boolean;
  target: RefObject<HTMLElement | null>; busy: boolean;
  setBusy(b: boolean): void }) {
  const { lang, t } = useLocale();
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const flight = useFixFlight(p.target);
  // Saved and in flight: the form closes and no action shows, so the
  // row cannot be saved twice while the chip travels.
  const [flying, setFlying] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  const i = p.issue;
  const name = i.employeeId === null ? ""
    : data.employee(i.employeeId).name[lang];
  return (
    <li ref={row} className={s.row} id={`fix-${i.id}`} data-open={open}>
      <span className={s.rowMain}>
        <KindTag kind="stops" />
        <span className={s.name}>{i.title[lang]}
          <span className={s.who}> · {name}</span></span>
        <span className={s.reasonMain}>{plainOnly(i.reason[lang])}</span>
        <span className={s.reason}>{i.suggestedFix[lang]}</span>
      </span>
      {p.canFix && i.employeeId !== null && !open && !flying && (
        <span className={s.rowAction}>
          <button type="button"
            className={`${b.btn} ${b.secondary} ${s.act}`}
            disabled={p.busy}
            onClick={() => setOpen(true)}>{t("payrun.enterIban")}</button>
        </span>
      )}
      {p.canFix && i.employeeId !== null && open && (
        <span className={s.rowForm}>
          <IbanForm employeeId={i.employeeId} name={name}
            onCancel={() => setOpen(false)}
            onSave={(value) => {
              const id = i.employeeId!;
              const from = row.current?.querySelector("input") ?? null;
              setFlying(true);
              setOpen(false);
              p.setBusy(true);
              // The chip flies first; the row turns "Fixed" as it lands.
              flight({ from, id, value, save: () => {
                  p.setBusy(false);
                  dispatch({ type: "iban", employeeId: id, value });
                  toast.show(t("payrun.fixedIban", { name }), () =>
                    dispatch({ type: "unset-iban", employeeId: id }));
                } });
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
    <li className={s.row} data-done={done !== undefined}
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
