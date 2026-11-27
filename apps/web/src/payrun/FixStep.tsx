import { fils, type Fils } from "@payroll/engine";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ExplainLink } from "../components/explain";
import type { Issue } from "../demo/data/types";
import { confirmations, isBlocking, runPhase } from "../demo/derive";
import { beforeApproval } from "../reports/dash/model";
import { reducedMotion } from "../demo/motion";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatSignedMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { useMaskText } from "../ui/mask";
import { useToast } from "../ui/Toast";
import b from "../ui/button.module.css";
import { fly } from "../ui/flight";
import { RollDigits } from "../ui/RollDigits";
import { RollMoney, shortFade } from "./Roll";
import { RowIban } from "./RowIban";
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
 * The held amount flying into the file total, in order: the IBAN
 * passes, a "+AED 25,300.00" chip leaves the row and lands on the
 * total's end edge (420 ms spring, ui/flight) and fades there (120
 * ms); only then is the IBAN saved, so the total starts its roll once
 * the chip is gone, "held out" changes, and the row moves to "Fixed"
 * after the flight, never before it. Reduced motion: no
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

/** A done row's mark before its title (the words say "done" too). */
function DoneMark() {
  const { t } = useLocale();
  return (
    <span className={s.doneMark}>
      <Icon name="check" size={14} />
      <span className="visually-hidden">{t("payrun.kindFixed")}: </span>
    </span>
  );
}

/**
 * A section header inside the one list ("Stops pay", "To check"): a
 * keyed row of its own, so it slides with the rows when one above it
 * folds away (listEnter.ts), with the colour dot and a count.
 */
function SectionRow(p: { k: string; tone: "bad" | "warn"; title: string;
  count: string }) {
  return (
    <li className={s.sectionRow} data-key={p.k}>
      <h4 className={s.sectionHead}>
        <span className={s.dot8} aria-hidden="true" data-tone={p.tone} />
        {p.title}
        <span className={s.sectionCount}>{p.count}</span>
      </h4>
    </li>
  );
}

/**
 * Step 2: one grouped list under two headers. What stops pay comes
 * first (bank details: entering an IBAN re-runs the real salary file
 * check and the held pay flows into the file), then what to check.
 * Each row is two lines: the title with the name, then one sentence.
 * Setup to confirm (the pension fund) is a note under the list.
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
  const signed = runPhase(data, state) === "file";
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
  const list = useRef<HTMLDivElement>(null);
  useListFlip(list, ["h-stops", ...blockers.map((i) => i.id),
    ...fixed.map((id) => `fixed-${id}`),
    ...(blockers.length === 0 && fixed.length === 0 ? ["none"] : []),
    ...(checks.length > 0 ? ["h-check"] : []),
    ...checks.map((i) => i.id)]);
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>
        {signed ? t("payrun.fixDoneTitle") : t("payrun.fixTitle")}</h2>
      <p className={s.stepSub}>
        {signed ? t("payrun.fixDoneSub")
          : isHr ? t("payrun.fixSub") : t("payrun.gmFixNote")}
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
        </h3>
        {/* A fixed row fades where it stood while the rows below slide
          * up over it (listEnter.ts). */}
        <div className={m.host} ref={list}>
        <ul className={s.group}>
          <SectionRow k="h-stops" tone="bad" title={t("payrun.stopsHead")}
            count={count.stops === 0 ? t("payrun.noneNow")
              : String(count.stops)} />
          {blockers.map((i) => (
            <BlockerRow key={i.id} issue={i} canFix={isHr}
              target={figure} busy={busy} setBusy={setBusy} />
          ))}
          {fixed.map((id) => (
            <li key={`fixed-${id}`} className={s.row} data-done="true"
              data-key={`fixed-${id}`}>
              <span className={s.rowMain}>
                <span className={s.name}><DoneMark />
                  {t("payrun.fixedTitle")}
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
          {checks.length > 0 && (
            <SectionRow k="h-check" tone="warn" title={t("payrun.checkHead")}
              count={open === 0 ? t("payrun.noneNow") : String(open)} />
          )}
          {checks.map((i, n) => (
            <CheckRow key={i.id} issue={i} canAct={isHr} index={n} />
          ))}
        </ul>
        </div>
        {setup.map((i) => (
          <p key={i.id} className={s.setupNote}>
            {t("payrun.setupNote", { title: i.title[lang] })}{" "}
            <a href={hrefOf("people", "papers", "pension")}
              className={s.inlineLink}>{t("payrun.setupLink")}</a>
          </p>
        ))}
      </section>
    </section>
  );
}

function BlockerRow(p: { issue: Issue; canFix: boolean;
  target: RefObject<HTMLElement | null>; busy: boolean;
  setBusy(b: boolean): void }) {
  const { lang, t } = useLocale();
  const mask = useMaskText();
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const flight = useFixFlight(p.target);
  // Saved and in flight: the form closes and no action shows, so the
  // row cannot be saved twice while the chip travels.
  const [flying, setFlying] = useState(false);
  // Saved: the form stays drawn, inert, while its height collapses
  // (PayRun.module.css .rowForm), so the rows under it rise with it
  // rather than jumping up as it goes.
  const [closing, setClosing] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  const i = p.issue;
  const name = i.employeeId === null ? ""
    : data.employee(i.employeeId).name[lang];
  return (
    <li ref={row} className={s.row} id={`fix-${i.id}`} data-open={open}
      data-key={i.id}>
      <span className={s.rowMain}>
        <span className={s.name}>{i.title[lang]}
          <span className={s.who}> · {name}</span></span>
        <span className={s.reason}>{mask(plainOnly(i.reason[lang]))}</span>
      </span>
      {p.canFix && i.employeeId !== null && !open && !flying && !closing && (
        <span className={s.rowAction}>
          <button type="button"
            className={`${b.btn} ${b.secondary} ${s.act}`}
            disabled={p.busy}
            onClick={() => setOpen(true)}>{t("payrun.enterIban")}</button>
        </span>
      )}
      {p.canFix && i.employeeId !== null && (open || closing) && (
        <span className={s.rowForm} data-closing={closing}
          data-cancel={closing && !flying} inert={closing}
          onTransitionEnd={(e) => {
            // Cancelled: once the fold ends, the form is gone.
            if (e.target === e.currentTarget && !flying &&
              e.propertyName === "grid-template-rows") setClosing(false);
          }}>
          <RowIban employeeId={i.employeeId} name={name}
            onCancel={() => {
              // Folds away as a save does (reduced motion: at once).
              setClosing(!reducedMotion());
              setOpen(false);
            }}
            onSave={(value) => {
              const id = i.employeeId!;
              const from = row.current?.querySelector("input") ?? null;
              setFlying(true);
              setClosing(true);
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
  const mask = useMaskText();
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
        <span className={s.name}>
          {done !== undefined && <DoneMark />}{i.title[lang]}
          {name !== "" && <span className={s.who}> · {name}</span>}</span>
        {/* One action per row (the button at its end); the working
            is a quiet link at the end of the sentence, not a second
            action. */}
        <span className={s.reason}>{mask(plainOnly(i.reason[lang]))}
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
