import { fils } from "@payroll/engine";
import { useLayoutEffect, useRef } from "react";
import type { Issue } from "../demo/data/types";
import { reducedMotion } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { IbanForm } from "./IbanForm";
import { fly, LAND_FADE_MS } from "../ui/flight";
import { useSaveIban } from "./useSaveIban";
import s from "./PayRunHero.module.css";

/** The form fades out while the amount travels. */
const FADE_MS = 160;

/**
 * Whether the target's centre is on screen and not under anything (the
 * phone's tab bar): a chip landing out of sight would tell nothing.
 */
function inView(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2,
    r.top + r.height / 2);
  return hit !== null && el.contains(hit);
}

/**
 * Bank details entered in the top card itself, so nothing scrolls.
 * On save the form fades while the amount the IBAN adds to the salary
 * file leaves the IBAN row and travels to the file total (the shared
 * flight: 420 ms on a spring), lands on the figure and fades as the
 * figure rolls. Nothing travels to a total that is out of sight (on a
 * phone it sits below the fold). The slot keeps its height
 * (PayRunHero), so nothing below moves. Nothing travels when the file
 * total does not change (a corrected IBAN whose pay was already
 * counted). Reduced motion saves at once.
 */
export function CardIban(p: { issue: Issue; onDone(): void }) {
  const { lang } = useLocale();
  const { source, data, state } = useDemo();
  const save = useSaveIban();
  const box = useRef<HTMLDivElement>(null);
  const id = p.issue.employeeId ?? "";
  const name = data.employee(id).name[lang];
  // The slot reserves the form's own height, so the swap back to the
  // action never moves the tiles below.
  useLayoutEffect(() => {
    const el = box.current;
    const slot = el?.parentElement;
    if (el === null || slot === null || slot === undefined) return;
    const h = el.offsetHeight;
    const was = parseFloat(slot.style.getPropertyValue("--slot-h"));
    if (!(was >= h)) slot.style.setProperty("--slot-h", `${h}px`);
  }, []);
  const onSave = (value: string): void => {
    const finish = (): void => {
      save(id, value);
      p.onDone();
    };
    const el = box.current;
    const card = el?.closest<HTMLElement>("[data-card]") ?? null;
    if (el === null || card === null || reducedMotion()) return finish();
    const delta = source.at({ ...state.ibans, [id]: value }).headline()
      .sifTotalFils - data.headline().sifTotalFils;
    const from = el.querySelector("input")?.getBoundingClientRect();
    const to = card.querySelector("[data-fly-target] dd") ?? undefined;
    el.animate([{ opacity: 1 }, { opacity: 0 }],
      { duration: FADE_MS, easing: "ease-out", fill: "forwards" });
    if (delta <= 0n || from === undefined || to === undefined ||
      state.hideAmounts || !inView(to)) {
      setTimeout(finish, FADE_MS);
      return;
    }
    // The chip leaves the IBAN row and lands on the file total
    // (ui/flight: 420 ms spring), fades into it (160 ms), and only then
    // is the IBAN saved and the total rolls: the save's re-check runs
    // once the chip has gone, so a busy main thread can never hold the
    // chip over the figure.
    const chip = document.createElement("span");
    chip.className = s.flyer ?? "";
    chip.textContent = `+${formatMoney(fils(delta), lang)}`;
    fly({ from, to, content: chip,
      onLand: () => setTimeout(finish, LAND_FADE_MS) });
  };
  return (
    <div ref={box} className={s.cardIban}>
      <IbanForm employeeId={id} name={name} onSave={onSave}
        onCancel={p.onDone} />
    </div>
  );
}
