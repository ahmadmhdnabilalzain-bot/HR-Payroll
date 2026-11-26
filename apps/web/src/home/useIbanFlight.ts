import { fils } from "@payroll/engine";
import { reducedMotion } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { fly, LAND_FADE_MS } from "../ui/flight";
import s from "./PayRunHero.module.css";

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

/** The salary-file total on Home's hero (the one flight target). */
function fileTotal(): Element | null {
  return document.querySelector("[data-fly-target] dd");
}

/**
 * The bank moment on Home, for the top card and the issue list alike:
 * when an IBAN passes, the pay it releases leaves the IBAN field as a
 * chip and flies into the salary-file total (ui/flight: 420 ms on a
 * spring, then a 160 ms fade); only then is the IBAN saved, so the
 * total rolls as the chip melts into it and "held out" drops. Nothing
 * travels when the total would not change, while amounts are hidden,
 * or when the total is out of sight; then `finish` runs at once (or
 * after `wait` ms, for a form fading out). Reduced motion: at once.
 * Real time (timers), not one timeline: a capture frame-steps the
 * flight itself (its two Web Animations), then lets the save run.
 */
export function useIbanFlight(): (o: { from: Element | null;
  id: string; value: string; finish(): void; wait?: number }) => void {
  const { lang } = useLocale();
  const { source, data, state } = useDemo();
  return (o) => {
    const later = (): void => {
      if (o.wait === undefined) o.finish();
      else setTimeout(o.finish, o.wait);
    };
    if (reducedMotion()) return o.finish();
    const delta = source.at({ ...state.ibans, [o.id]: o.value })
      .headline().sifTotalFils - data.headline().sifTotalFils;
    const from = o.from?.getBoundingClientRect();
    const to = fileTotal();
    if (delta <= 0n || from === undefined || to === null ||
      state.hideAmounts || !inView(to)) return later();
    const chip = document.createElement("span");
    chip.className = s.flyer ?? "";
    chip.textContent = `+${formatMoney(fils(delta), lang)}`;
    fly({ from, to, content: chip,
      onLand: () => setTimeout(o.finish, LAND_FADE_MS) });
  };
}
