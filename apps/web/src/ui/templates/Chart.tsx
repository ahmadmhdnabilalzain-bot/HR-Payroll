import type { Fils } from "@payroll/engine";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useDemo } from "../../demo/state";
import { motion, useChartMotion } from "../chartMotion";
import { formatMoney, formatSignedMoney, MINUS }
  from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import s from "./templates.module.css";
import { safeAnimate } from "../safeAnimate";

/**
 * Report charts (RP): plain SVG, no library, ink and grey only. Bars
 * grow from zero once in view and tween on a data change
 * (ui/chartMotion, WAAPI); under reduced motion they are simply there.
 * Amount labels follow hide-amounts; the bars stay, without figures.
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
  useChartMotion(svg, p.data.map((d) => `${d.label}${d.value}`).join(),
    w > 0);
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
                <rect data-mark="" data-key={d.label} x={x}
                  y={top + plot - bh} width={bar}
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

const WF_RISE = 300;
const WF_UNFOLD = 600;
const WF_Z = 0.001;

/**
 * The waterfall's entrance, one clock, so it adds up in every frame.
 * First the start total grows from the axis (300 ms; the end total
 * grows with it to the same length). Then the causes unfold out of
 * the start total's end (600 ms): every step scales about that one
 * point by the same factor, so each step starts exactly where the
 * one before it ends at every frame, and the end total's edge rides
 * with the last step. Then connectors and figures fade in.
 */
function waterfallIn(root: Element): Animation[] {
  const total = WF_RISE + WF_UNFOLD;
  const at = WF_RISE / total;
  const ease = motion.ease;
  const out: Animation[] = [];
  for (const el of root.querySelectorAll<SVGElement>("[data-wf]")) {
    const kind = el.dataset["wf"];
    const k0 = Number(el.dataset["k0"] ?? 0);
    el.style.transformBox = "view-box";
    el.style.transformOrigin = `${el.dataset["ox"] ?? 0}px 0px`;
    const s = (k: number): string => `scaleX(${Math.max(k, WF_Z)})`;
    const frames: Keyframe[] = kind === "start" ? [
      { offset: 0, transform: s(0), easing: ease },
      { offset: at, transform: s(1) }, { offset: 1, transform: s(1) }]
      : kind === "end" ? [
        { offset: 0, transform: s(0), easing: ease },
        { offset: at, transform: s(k0), easing: ease },
        { offset: 1, transform: s(1) }]
        : [{ offset: 0, transform: s(0) },
          { offset: at, transform: s(0), easing: ease },
          { offset: 1, transform: s(1) }];
    out.push(safeAnimate(el, frames, { duration: total, fill: "backwards" }));
  }
  root.querySelectorAll<SVGElement>("[data-label]").forEach((el, i) => {
    out.push(safeAnimate(el, [{ opacity: 0 }, { opacity: 1 }],
      { duration: motion.base, delay: total - 80 + i * 12,
        easing: "linear", fill: "backwards" }));
  });
  return out;
}

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
  useChartMotion(svg, p.steps.map((d) => `${d.label}${d.value}`).join(),
    w > 0, { entrance: waterfallIn });
  const x0 = x(BigInt(min));
  const xS = x(spans[0]?.to ?? 0n);
  const xE = x(spans.at(-1)?.to ?? 0n);
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
                <rect data-mark="" data-grow="x"
                  data-key={total ? (i === 0 ? "start" : "end") : st.label}
                  data-wf={total ? (i === 0 ? "start" : "end") : "change"}
                  data-ox={total ? x0 : xS}
                  data-k0={total && i > 0 && xE !== x0
                    ? (xS - x0) / (xE - x0) : 0}
                  x={left} y={yy + 6} width={width}
                  height={row - 12} rx={3}
                  data-origin={down ? "100% 50%" : "0% 50%"}
                  className={total ? s.markInk : down ? s.markHollow
                    : s.markGrey} />
                {total && (
                  <path data-label=""
                    d={`M${a + 7} ${yy + row - 4} l6 -${row - 8} ` +
                    `M${a + 12} ${yy + row - 4} l6 -${row - 8}`}
                    className={s.axisBreak} />
                )}
                {next !== undefined && (
                  <line data-label="" x1={b} x2={b} y1={yy + row - 6}
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
