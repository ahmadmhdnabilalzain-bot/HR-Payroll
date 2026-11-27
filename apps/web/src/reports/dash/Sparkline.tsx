import { useRef } from "react";
import { useChartMotion } from "../../ui/chartMotion";
import s from "./dash.module.css";

const W = 240;
const H = 40;
const PAD = 5;

/**
 * Where each point sits. The scale spans the series' own range (and
 * the comparison level) with headroom, so a line that moves 2% still
 * shows its shape; the figure beside it carries the real value.
 */
export function sparkScale(series: number[], compare?: number) {
  const all = compare === undefined ? series : [...series, compare];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || Math.max(Math.abs(hi), 1);
  const top = hi + span * 0.1;
  const bottom = lo - span * 0.1;
  const y = (v: number): number =>
    PAD + ((top - v) / (top - bottom)) * (H - PAD * 2);
  const step = (W - PAD * 2) / Math.max(series.length - 1, 1);
  return { y, pts: series.map((v, i) => ({ x: PAD + step * i, y: y(v) })) };
}

/**
 * A tile's sparkline: the year so far as one ink line, last month's
 * level as a dashed grey line, and a dot on this month. The line draws
 * in once in view, then the level and the dot fade in (ui/chartMotion);
 * under reduced motion it is simply there.
 */
export function Sparkline(p: { series: number[]; compare?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const { y, pts } = sparkScale(p.series, p.compare);
  const d = pts.map((q, i) => `${i === 0 ? "M" : "L"}${q.x.toFixed(1)} ` +
    `${q.y.toFixed(1)}`).join(" ");
  const end = pts.at(-1);
  useChartMotion(ref, d);
  return (
    <svg ref={ref} className={s.spark} viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true" focusable="false">
      {p.compare !== undefined && (
        <line x1={0} x2={W} y1={y(p.compare)} y2={y(p.compare)}
          className={s.sparkCompare} data-label="" />
      )}
      <path d={d} pathLength={1} className={s.sparkLine}
        data-line="" data-key="line" />
      {end !== undefined && (
        <path d={`M${end.x} ${end.y} L${end.x} ${end.y}`}
          className={s.sparkDot} data-label="" />
      )}
    </svg>
  );
}

/**
 * A count that barely moves (people paid, 30 to 31): one thin bar a
 * month from a zero baseline, so a step of one reads as a step of one,
 * never a spike. The bars grow in once in view (ui/chartMotion); this
 * month is ink, the rest grey.
 */
export function ZeroBars(p: { series: number[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const hi = Math.max(...p.series, 1);
  const n = p.series.length;
  const gap = 4;
  const w = (W - gap * (n - 1)) / n;
  useChartMotion(ref, p.series.join());
  return (
    <svg ref={ref} className={s.spark} viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true" focusable="false">
      {p.series.map((v, i) => {
        const h = Math.max((v / hi) * H, 1);
        return (
          <rect key={i} x={(w + gap) * i} y={H - h} width={w} height={h}
            rx={1} className={s.sparkBar} data-now={i === n - 1}
            data-mark="" data-key={`m${i}`} data-grow="y" />
        );
      })}
    </svg>
  );
}
