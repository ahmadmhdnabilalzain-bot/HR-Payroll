import type { Fils } from "@payroll/engine";
import { gsap } from "gsap";
import { useLayoutEffect, useRef } from "react";
import { formatNumber } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { Money } from "../../ui/Money";
import type { Slice } from "./model";
import s from "./dash.module.css";

/** Grow the marks in once along one axis, unless motion is reduced. */
function useGrow(sel: string, key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(el.querySelectorAll(sel), { scaleX: 0,
        transformOrigin: "0% 50%", duration: 0.6, ease: "power3.out",
        stagger: 0.04, delay: 0.15 });
    });
    return () => mm.revert();
  }, [sel, key]);
  return ref;
}

export interface HBar {
  key: string;
  label: string;
  /** Money in fils (follows hide-amounts) or a count. */
  value: { fils: Fils } | { n: number };
  /** Under the label: "8 people". */
  meta?: string;
}

const size = (v: HBar["value"]): number =>
  "fils" in v ? Number(v.fils) : v.n;

/**
 * Horizontal bars, largest first: the name and a meta line, a grey bar
 * from zero (the largest in ink), and the figure at the end. Plain
 * HTML so the figures are <Money/> and read in order.
 */
export function HBars(p: { rows: HBar[]; label: string }) {
  const { lang } = useLocale();
  const max = p.rows.reduce((m, r) => Math.max(m, size(r.value)), 0);
  const ref = useGrow("[data-hbar]", p.rows.map((r) => r.key).join());
  return (
    <div ref={ref}>
      <ul className={s.hbars} aria-label={p.label}>
        {p.rows.map((r, i) => (
          <li key={r.key} className={s.hbar}>
            <span className={s.hbarText}>
              <span className={s.hbarName}>{r.label}</span>
              {r.meta !== undefined && (
                <span className={s.hbarMeta}>{r.meta}</span>
              )}
            </span>
            <span className={s.hbarTrack} aria-hidden="true">
              <span data-hbar="" className={s.hbarFill}
                data-first={i === 0}
                style={{ inlineSize: `${max === 0 ? 0
                  : (size(r.value) / max * 100).toFixed(1)}%` }} />
            </span>
            <span className={s.hbarValue}>
              {"fils" in r.value
                ? <Money value={r.value.fils} size="sm" tween={false} />
                : <span className="tabular">
                  {formatNumber(r.value.n, lang)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One bar split into the largest groups, in steps of grey from ink,
 * with a key underneath: each group's name, count and share.
 */
export function SplitBar(p: { slices: Slice[]; label: string;
  unit: [string, string] }) {
  const { lang } = useLocale();
  const total = p.slices.reduce((n, x) => n + x.count, 0);
  const ref = useGrow("[data-split]", p.slices.map((x) => x.label).join());
  const pct = (n: number): string => total === 0 ? "0%"
    : `${Math.round(n * 100 / total)}%`;
  return (
    <div ref={ref} className={s.split}>
      <div className={s.splitBar} aria-hidden="true" data-split="">
        {p.slices.map((x, i) => (
          <span key={x.label} className={`${s.splitPart} ${s.tone}`}
            data-tone={Math.min(i, 5)}
            style={{ flexGrow: x.count }} />
        ))}
      </div>
      <ul className={s.splitKey} aria-label={p.label}>
        {p.slices.map((x, i) => (
          <li key={x.label}>
            <span className={`${s.swatch} ${s.tone}`} data-tone={Math.min(i, 5)}
              aria-hidden="true" />
            <span className={s.splitName}>{x.label}</span>
            <span className={`${s.splitCount} tabular`}>
              {`${formatNumber(x.count, lang)} ${x.count === 1
                ? p.unit[0] : p.unit[1]}, ${pct(x.count)}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
