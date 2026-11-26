import { useLayoutEffect, useRef } from "react";
import type { Issue } from "../demo/data/types";
import { reducedMotion } from "../demo/motion";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { IbanForm } from "./IbanForm";
import { useIbanFlight } from "./useIbanFlight";
import { useSaveIban } from "./useSaveIban";
import s from "./PayRunHero.module.css";

/** The form fades out while the amount travels. */
const FADE_MS = 160;

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
  const { data } = useDemo();
  const save = useSaveIban();
  const flight = useIbanFlight();
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
    if (el === null || reducedMotion()) return finish();
    el.animate([{ opacity: 1 }, { opacity: 0 }],
      { duration: FADE_MS, easing: "ease-out", fill: "forwards" });
    // Saved: the fading form takes no more input while the chip flies.
    el.inert = true;
    flight({ from: el.querySelector("input"), id, value, finish,
      wait: FADE_MS });
  };
  return (
    <div ref={box} className={s.cardIban}>
      <IbanForm employeeId={id} name={name} onSave={onSave}
        onCancel={p.onDone} />
    </div>
  );
}
