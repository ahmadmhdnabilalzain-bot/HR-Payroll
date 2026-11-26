import { useRef } from "react";
import { useDemo } from "../../demo/state";
import { MINUS } from "../../i18n/format";
import { useChartMotion } from "../../ui/chartMotion";
import { compact } from "../../ui/templates";
import type { MonthRow } from "../types";
import { useBoxWidth } from "./TrendChart";
import s from "./dash.module.css";

const HIDDEN = "••";
const H = 220;
const TOP = 28;
const BOTTOM = 30;

/** "+22k" or "−14k": a change, with a real minus. */
const signedCompact = (v: bigint): string =>
  v === 0n ? "0" : `${v > 0n ? "+" : ""}${compact(v)}`;

/**
 * Gross pay month on month: each bar is the change against the month
 * before, up above a zero line and down below it, so the size of the
 * move shows (a bar from zero would make ten months look alike). The
 * month in focus is ink, the rest grey; figures follow hide-amounts.
 */
export function ChangeBars(p: { months: MonthRow[]; label: string }) {
  const { state } = useDemo();
  const box = useRef<HTMLDivElement>(null);
  const w = useBoxWidth(box);
  const svg = useRef<SVGSVGElement>(null);
  const hide = state.hideAmounts;
  const rows = p.months.slice(1).map((m, i) => ({ key: m.month,
    label: m.label.slice(0, 3),
    change: m.gross - p.months[i]!.gross }));
  const mag = (v: bigint): number => Number(v < 0n ? -v : v);
  const maxUp = rows.reduce((m, r) => Math.max(m, r.change > 0n
    ? mag(r.change) : 0), 0);
  const maxDown = rows.reduce((m, r) => Math.max(m, r.change < 0n
    ? mag(r.change) : 0), 0);
  // One scale for both sides; the zero line sits where the two reaches
  // split the plot (kept off the edges), room left for the labels.
  const plot = H - TOP - BOTTOM - 52;
  const split = maxUp / Math.max(maxUp + maxDown, 1);
  const zero = TOP + 18 + plot * Math.min(0.8, Math.max(0.2, split));
  const per = plot / Math.max(maxUp + maxDown, 1);
  const slot = (w - 8) / Math.max(rows.length, 1);
  const bar = Math.max(10, Math.min(44, slot * 0.58));
  // Each bar grows out of the zero line (up or down), on the tiles'
  // 600 ms timeline, and tweens when the months change.
  useChartMotion(svg, rows.map((r) => `${r.key}${r.change}`).join(),
    w > 0, { duration: 600 });
  return (
    <div className={s.trendBox} ref={box}>
      {w > 0 && (
        <svg ref={svg} width={w} height={H} role="img" direction="ltr"
          aria-label={p.label} className={s.svg}>
          <line x1={0} x2={w} y1={zero} y2={zero} className={s.axisZero} />
          <text x={0} y={12} className={s.tick}>
            {`AED, change on the month before`}</text>
          {rows.map((r, i) => {
            const v = Number(r.change);
            const neg = r.change < 0n;
            const h = Math.max(2, Math.abs(v) * per);
            const x = 8 + i * slot + (slot - bar) / 2;
            const focus = i === rows.length - 1;
            return (
              <g key={r.key}>
                <rect data-mark="" data-key={r.key}
                  data-origin={neg ? "50% 0%" : "50% 100%"}
                  x={x} y={neg ? zero : zero - h} width={bar}
                  height={h} rx={3}
                  className={focus ? s.barInk : s.barLight} />
                {(focus || slot >= 56) && (
                  <text data-label="" x={x + bar / 2}
                    y={neg ? zero + h + 14 : zero - h - 6}
                    textAnchor="middle"
                    className={focus ? s.valueInk : s.value}>
                    {hide ? HIDDEN : signedCompact(r.change).replace("-",
                      MINUS)}</text>
                )}
                <text x={x + bar / 2} y={H - 8} textAnchor="middle"
                  className={focus ? s.tickInk : s.tick}>{r.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
