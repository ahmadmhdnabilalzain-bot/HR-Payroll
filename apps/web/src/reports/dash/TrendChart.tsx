import { gsap } from "gsap";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useDemo } from "../../demo/state";
import { compact } from "../../ui/templates";
import s from "./dash.module.css";

const HIDDEN = "••";

/** The element's content width, kept up to date. */
export function useBoxWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return undefined;
    const read = (): void => setW(el.clientWidth);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** 1, 2, 2.5 or 5 times a power of ten, so the ticks read cleanly. */
export function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** Zero-based axis ticks covering the largest value, in four steps. */
export function axisTicks(max: number): number[] {
  const step = niceStep(max / 4);
  const n = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: n + 1 }, (_, i) => i * step);
}

const GUTTER = 52;
const slotOf = (w: number, n: number): number =>
  (w - GUTTER) / Math.max(n, 1);

export interface TrendBar {
  key: string;
  /** "Sep": the month under the bar. */
  label: string;
  value: bigint;
  /** "Paid", "To approve": the word under a marked month. */
  mark?: string;
  /** The month in focus (ink); a marked month that is not is dark grey. */
  focus?: boolean;
}

/**
 * Payroll by month as bars from zero, with a visible axis (AED ticks)
 * and every month named. The marked months (last paid, this run) carry
 * a word and their figure; the run in focus is ink, the month before
 * dark grey, the rest light grey. Bars rise in once with GSAP; under
 * reduced motion they are simply there. Figures follow hide-amounts.
 */
export function TrendChart(p: { bars: TrendBar[]; label: string;
  height?: number }) {
  const { state } = useDemo();
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const w = useBoxWidth(box);
  const hide = state.hideAmounts;
  const h = p.height ?? 300;
  const narrow = slotOf(w, p.bars.length) < 64;
  const top = 36;
  const bottom = narrow ? 30 : 48;
  const gutter = GUTTER;
  const plot = h - top - bottom;
  const max = p.bars.reduce((m, b) => Math.max(m, Number(b.value)), 0);
  const ticks = axisTicks(max);
  const scaleMax = ticks.at(-1) ?? 1;
  const y = (v: number): number => top + plot - (v / scaleMax) * plot;
  const slot = slotOf(w, p.bars.length);
  const bar = Math.max(10, Math.min(48, slot * 0.58));
  const key = p.bars.map((b) => b.key).join();
  useLayoutEffect(() => {
    const el = svg.current;
    if (el === null || w === 0) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(el.querySelectorAll("[data-bar]"), { scaleY: 0,
        transformOrigin: "50% 100%", duration: 0.6, ease: "power3.out",
        stagger: 0.04, delay: 0.1 });
      gsap.from(el.querySelectorAll("[data-flag]"), { opacity: 0,
        y: 4, duration: 0.3, delay: 0.55, stagger: 0.06 });
    });
    return () => mm.revert();
  }, [key, w > 0]);
  const marked = p.bars.filter((b) => b.mark !== undefined).reverse();
  return (
    <div className={s.trendBox} ref={box}>
      {marked.length > 0 && (
        <ul className={s.legend} aria-hidden="true">
          {marked.map((b) => (
            <li key={b.key}>
              <span className={s.swatch} data-focus={b.focus === true} />
              {`${b.label}, ${b.mark?.toLowerCase() ?? ""}`}
            </li>
          ))}
        </ul>
      )}
      {w > 0 && (
        <svg ref={svg} width={w} height={h} role="img" direction="ltr"
          aria-label={p.label} className={s.svg}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={gutter} x2={w} y1={y(t)} y2={y(t)}
                className={t === 0 ? s.axisZero : s.grid} />
              <text x={gutter - 10} y={y(t) + 4} textAnchor="end"
                className={s.tick}>
                {t === 0 ? "0" : hide ? HIDDEN : compact(BigInt(t))}</text>
            </g>
          ))}
          <text x={0} y={12} className={s.tick}>AED</text>
          {p.bars.map((b, i) => {
            const v = Number(b.value);
            const x = gutter + i * slot + (slot - bar) / 2;
            const bh = Math.max(1, y(0) - y(v));
            const cls = b.focus === true ? s.barInk
              : b.mark !== undefined ? s.barDark : s.barLight;
            return (
              <g key={b.key}>
                <rect data-bar="" x={x} y={y(0) - bh} width={bar}
                  height={bh} rx={4} className={cls} />
                {b.mark !== undefined && (!narrow || b.focus === true) && (
                  <text data-flag="" x={x + bar / 2} y={y(v) - 10}
                    textAnchor="middle" className={b.focus === true
                      ? s.valueInk : s.value}>
                    {hide ? HIDDEN : compact(b.value)}</text>
                )}
                <text x={x + bar / 2} y={y(0) + 20} textAnchor="middle"
                  className={b.mark !== undefined ? s.tickInk : s.tick}>
                  {b.label}</text>
                {b.mark !== undefined && slot >= 64 && (
                  <text x={x + bar / 2} y={y(0) + 38} textAnchor="middle"
                    className={s.flag}>{b.mark}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
