import { fils } from "@payroll/engine";
import { gsap } from "gsap";
import { useRef } from "react";
import type { Issue } from "../demo/data/types";
import { reducedMotion } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { IbanForm } from "./IbanForm";
import { useSaveIban } from "./useSaveIban";
import s from "./PayRunHero.module.css";

/** The fold and the flight, per the motion spec. */
const FOLD_MS = 240;
const FOLD_EASE = "cubic-bezier(0.2, 0, 0, 1)";
const FLY_S = 0.42;

/**
 * Bank details entered in the top card itself, so nothing scrolls.
 * On save the form folds away (240 ms) while the amount the IBAN adds
 * to the salary file flies to the file total (420 ms, a spring), and
 * only then is the IBAN saved: the totals roll as the amount lands.
 * Nothing flies when the file total does not change (a corrected
 * IBAN whose pay was already counted). Reduced motion saves at once.
 */
export function CardIban(p: { issue: Issue; onDone(): void }) {
  const { lang } = useLocale();
  const { source, data, state } = useDemo();
  const save = useSaveIban();
  const box = useRef<HTMLDivElement>(null);
  const id = p.issue.employeeId ?? "";
  const name = data.employee(id).name[lang];
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
    const to = card.querySelector("[data-fly-target]")
      ?.getBoundingClientRect();
    el.animate([{ blockSize: `${el.offsetHeight}px`, opacity: 1 },
      { blockSize: "0px", opacity: 0 }],
    { duration: FOLD_MS, easing: FOLD_EASE, fill: "forwards" });
    if (delta <= 0n || from === undefined || to === undefined ||
      state.hideAmounts) {
      setTimeout(finish, FOLD_MS);
      return;
    }
    // Distances in the card's own pixels (the page may be zoomed).
    const k = card.offsetWidth / card.getBoundingClientRect().width;
    const pill = document.createElement("span");
    pill.className = s.flyer ?? "";
    pill.setAttribute("aria-hidden", "true");
    pill.textContent = `+${formatMoney(fils(delta), lang)}`;
    card.append(pill);
    // Measured from where the pill sits, so RTL needs no mirror.
    const o = pill.getBoundingClientRect();
    gsap.fromTo(pill, { x: (from.left - o.left) * k,
      y: (from.top - o.top) * k, opacity: 0, scale: 0.9 },
    { x: (to.left - o.left) * k, y: (to.top - o.top) * k, opacity: 1,
      scale: 1, duration: FLY_S, ease: "back.out(1.4)",
      onComplete: () => {
        gsap.to(pill, { opacity: 0, duration: 0.15,
          onComplete: () => pill.remove() });
        finish();
      } });
  };
  return (
    <div ref={box} className={s.cardIban}>
      <IbanForm employeeId={id} name={name} onSave={onSave}
        onCancel={p.onDone} />
    </div>
  );
}
