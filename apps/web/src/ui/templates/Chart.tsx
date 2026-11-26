import type { Fils } from "@payroll/engine";
import { gsap } from "gsap";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useDemo } from "../../demo/state";
import { formatMoney, formatSignedMoney, MINUS }
  from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import s from "./templates.module.css";

/**
 * Report charts (RP): plain SVG, no library, ink and grey only. Bars
 * draw in with GSAP (power3.out, 40 ms apart) and are simply there
 * under reduced motion. Amount labels follow hide-amounts; the bars
 * stay, without figures.
 */

const HIDDEN = "••";

/** "953k", "1.2m", "−22k": an axis or bar label. */
export function compact(f: Fils | bigint): string {
  const n = Number(f) / 100;
  const a = Math.abs(n);
  const sign = n < 0 ? MINUS : "";
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}m`;
  if (a >= 1e3) return `${sign}${Math.round(a / 1e3)}k`;
  return `${sign}${Math.round(a)}`;
}

/** The element's width, kept up to date. */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return undefined;
    // The content box: the figure's padding is not ours to draw in.
    const inner = (): number => {
      const cs = getComputedStyle(el);
      return el.clientWidth - parseFloat(cs.paddingLeft) -
        parseFloat(cs.paddingRight);
    };
    setW(inner());
    const ro = new ResizeObserver(() => setW(inner()));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** Draw the marks in once, unless the viewer asked for less motion. */
function useDrawIn(ref: RefObject<SVGSVGElement | null>, axis: "x" | "y",
  ready: boolean, key: string): void {
  useLayoutEffect(() => {
    const svg = ref.current;
    if (svg === null || !ready) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const marks = svg.querySelectorAll<SVGElement>("[data-mark]");
      gsap.from(marks, {
        [axis === "y" ? "scaleY" : "scaleX"]: 0,
        transformOrigin: (_: number, el: SVGElement) =>
          el.dataset.origin ?? (axis === "y" ? "50% 100%" : "0% 50%"),
        duration: 0.6, ease: "power3.out", stagger: 0.04, delay: 0.1,
      });
      gsap.from(svg.querySelectorAll("[data-label]"), {
        opacity: 0, duration: 0.3, delay: 0.4, stagger: 0.03 });
    });
    return () => mm.revert();
  }, [ref, axis, ready, key]);
}

export interface BarDatum {
  label: string;
  value: Fils;
  /** The one bar in ink (the month in focus); the rest are grey. */
  focus?: boolean;
}

/**
 * Vertical bars from zero, one per period: the focus bar in ink, the
 * others in the comparison grey, a compact figure over each.
 */
export function BarChart(p: { data: BarDatum[]; label: string;
  height?: number }) {
  const { state } = useDemo();
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const w = useWidth(box);
  const h = p.height ?? 240;
  const top = 24;
  const bottom = 28;
  const plot = h - top - bottom;
  const max = p.data.reduce((m, d) => d.value > m ? d.value : m, 0n);
  const n = p.data.length;
  const slot = n === 0 ? 0 : w / n;
  const bar = Math.max(8, Math.min(56, slot * 0.56));
  const y = (v: bigint): number => max === 0n ? 0
    : Number((v * 10000n) / max) / 10000 * plot;
  useDrawIn(svg, "y", w > 0, p.data.map((d) => d.label).join());
  const hide = state.hideAmounts;
  return (
    <figure className={s.chart} ref={box}>
      <figcaption className="visually-hidden">{p.label}</figcaption>
      {w > 0 && (
        <svg ref={svg} width={w} height={h} role="img" direction="ltr"
          aria-label={p.label} className={s.chartSvg}>
          <line x1={0} x2={w} y1={top + plot} y2={top + plot}
            className={s.axis} />
          {p.data.map((d, i) => {
            const bh = Math.max(1, y(d.value));
            const x = i * slot + (slot - bar) / 2;
            return (
              <g key={d.label}>
                <rect data-mark="" x={x} y={top + plot - bh} width={bar}
                  height={bh} rx={4}
                  className={d.focus === true ? s.markInk : s.markGrey} />
                {!hide && (
                  <text data-label="" x={x + bar / 2}
                    y={top + plot - bh - 8} textAnchor="middle"
                    className={d.focus === true ? s.valueInk : s.value}>
                    {compact(d.value)}</text>
                )}
                <text x={x + bar / 2} y={h - 8} textAnchor="middle"
                  className={d.focus === true ? s.tickInk : s.tick}>
                  {d.label}</text>
              </g>
            );
          })}
          {hide && (
            <text x={w} y={14} textAnchor="end" className={s.tick}>
              {HIDDEN}</text>
          )}
        </svg>
      )}
    </figure>
  );
}

export interface WaterfallStep {
  label: string;
  /** A total (the start and the end) or a change between them. */
  kind: "total" | "change";
  value: Fils;
}

const nice = (v: number, step: number, up: boolean): number =>
  (up ? Math.ceil(v / step) : Math.floor(v / step)) * step;

/**
 * A waterfall, laid on its side so long cause names read on a phone:
 * the start total, each cause as a step from the running total, and
 * the end total. The steps are the same bigints as the table, so they
 * add up exactly. The axis does not start at zero (the changes would
 * not show), and says where it starts.
 */
export function Waterfall(p: { steps: WaterfallStep[]; label: string }) {
  const { lang, t } = useLocale();
  const { state } = useDemo();
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const w = useWidth(box);
  const row = 36;
  const gap = 8;
  const h = p.steps.length * (row + gap) + 28;
  // Running totals, in fils (exact).
  let run = 0n;
  const spans = p.steps.map((st) => {
    const from = st.kind === "total" ? 0n : run;
    const to = st.kind === "total" ? st.value : run + st.value;
    run = to;
    return { ...st, from, to };
  });
  const ends = spans.flatMap((x) => x.kind === "total" ? [x.to]
    : [x.from, x.to]);
  const lo = Number(ends.reduce((m, v) => v < m ? v : m, ends[0] ?? 0n));
  const hi = Number(ends.reduce((m, v) => v > m ? v : m, ends[0] ?? 0n));
  const step = 10 ** Math.max(2, Math.floor(Math.log10(
    Math.max(1, hi - lo))));
  const min = Math.max(0, nice(lo - (hi - lo) * 0.35, step, false));
  const max = nice(hi + (hi - lo) * 0.05, step, true);
  const narrow = w < 560;
  const labelW = narrow ? Math.min(140, w * 0.38) : 200;
  const valueW = narrow ? 84 : 128;
  const plotW = Math.max(40, w - labelW - valueW - 16);
  const x = (v: bigint): number => labelW + 8 +
    (Number(v) - min) / (max - min || 1) * plotW;
  useDrawIn(svg, "x", w > 0, p.steps.map((d) => `${d.label}${d.value}`)
    .join());
  const hide = state.hideAmounts;
  return (
    <figure className={s.chart} ref={box}>
      <figcaption className="visually-hidden">{p.label}</figcaption>
      {w > 0 && (
        <svg ref={svg} width={w} height={h} role="img" direction="ltr"
          aria-label={p.label} className={s.chartSvg}>
          {spans.map((st, i) => {
            const yy = i * (row + gap);
            const total = st.kind === "total";
            const a = total ? x(BigInt(min)) : x(st.from);
            const b = x(st.to);
            const left = Math.min(a, b);
            const width = Math.max(2, Math.abs(b - a));
            const down = !total && st.value < 0n;
            const next = spans[i + 1];
            return (
              <g key={`${st.label}${i}`}>
                <text x={0} y={yy + row / 2 + 5}
                  className={total ? s.tickInk : s.tick}>
                  {st.label.length > (narrow ? 18 : 30)
                    ? `${st.label.slice(0, narrow ? 17 : 29)}…`
                    : st.label}</text>
                <rect data-mark="" x={left} y={yy + 6} width={width}
                  height={row - 12} rx={3}
                  data-origin={down ? "100% 50%" : "0% 50%"}
                  className={total ? s.markInk : down ? s.markHollow
                    : s.markGrey} />
                {total && (
                  <path d={`M${a + 7} ${yy + row - 4} l6 -${row - 8} ` +
                    `M${a + 12} ${yy + row - 4} l6 -${row - 8}`}
                    className={s.axisBreak} />
                )}
                {next !== undefined && (
                  <line x1={b} x2={b} y1={yy + row - 6}
                    y2={yy + row + gap + 6} className={s.connector} />
                )}
                <text data-label="" x={w} y={yy + row / 2 + 5}
                  textAnchor="end" className={total ? s.valueInk : s.value}>
                  {hide ? HIDDEN : narrow
                    ? (!total && st.value > 0n ? "+" : "") + compact(st.value)
                    : total ? formatMoney(st.value, lang)
                      : formatSignedMoney(st.value, lang)}</text>
              </g>
            );
          })}
          <text x={labelW + 8} y={h - 6} className={s.tick}>
            {t("tpl.axisFrom", { v: hide ? HIDDEN
              : `AED ${compact(BigInt(Math.round(min)))}` })}</text>
        </svg>
      )}
    </figure>
  );
}
