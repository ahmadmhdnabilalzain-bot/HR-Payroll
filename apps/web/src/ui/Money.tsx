import type { Fils } from "@payroll/engine";
import { useLayoutEffect, useRef, useState } from "react";
import { reducedMotion } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatMoney, moneyParts } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { amountsHidden } from "./mask";
import s from "./Money.module.css";

type Size = "hero" | "lg" | "md" | "sm";

const FADE_MS = 200;

const MASK = "•".repeat(6);

/**
 * Every amount on screen goes through here: one formatter
 * (formatMoney / moneyParts), tabular figures, left-to-right inside
 * Arabic, the fils set smaller, faded in when the value changes, and
 * masked when amounts are hidden. Screen readers get the plain text.
 * A changed figure crossfades (old out, new in), never counts up.
 */
export function Money(p: { value: Fils; size?: Size; tween?: boolean;
  /** A change: "+" on a rise (a fall always reads "−AED"). */
  signed?: boolean }) {
  const { lang, t } = useLocale();
  const { state } = useDemo();
  const v = p.value;
  const box = useRef<HTMLSpanElement>(null);
  const was = useRef(p.value);
  const [ghost, setGhost] = useState<Fils | null>(null);
  // A changed figure crossfades: the old amount fades out, the new one
  // fades in. Only the two true amounts are ever shown, never one in
  // between. Reduced motion: instant.
  useLayoutEffect(() => {
    if (was.current === p.value) return undefined;
    const old = was.current;
    was.current = p.value;
    if (p.tween === false || reducedMotion()) return undefined;
    box.current?.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: FADE_MS, easing: "ease-out" });
    setGhost(old);
    const h = setTimeout(() => setGhost(null), FADE_MS);
    return () => clearTimeout(h);
  }, [p.value, p.tween]);
  const size = p.size ?? "md";
  if (amountsHidden(state)) {
    return (
      <span className={`${s.money} ${s[size]} ${s.masked}`} dir="ltr">
        <span className="visually-hidden">{t("shell.amountsHidden")}</span>
        <span className={s.cur} aria-hidden="true">AED</span>
        <span aria-hidden="true">{MASK}</span>
      </span>
    );
  }
  const plus = p.signed === true;
  const m = moneyParts(v, plus);
  return (
    <span className={`${s.money} ${s[size]}`} dir="ltr">
      <span className="visually-hidden">
        {formatMoney(p.value, lang, { plus })}</span>
      <span aria-hidden="true" className={s.lead}>
        {m.sign !== "" && <span className={s.sign}>{m.sign}</span>}
        <span className={s.cur}>{m.currency}</span>
      </span>
      <span className={s.stack} aria-hidden="true">
        <span ref={box} className={s.settled}>
          {m.whole}<span className={s.frac}>.{m.frac}</span>
        </span>
        {ghost !== null && <Ghost value={ghost} />}
      </span>
    </span>
  );
}

/** The old amount, fading out over the new one in the same place. */
function Ghost(p: { value: Fils }) {
  const o = moneyParts(p.value);
  return (
    <span className={s.ghost}>
      {o.whole}<span className={s.frac}>.{o.frac}</span>
    </span>
  );
}
