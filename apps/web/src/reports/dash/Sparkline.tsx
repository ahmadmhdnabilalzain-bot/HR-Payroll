import { gsap } from "gsap";
import { useLayoutEffect, useRef } from "react";
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
  const top = hi + span * 0.15;
  const bottom = lo - span * 0.15;
  const y = (v: number): number =>
    PAD + ((top - v) / (top - bottom)) * (H - PAD * 2);
  const step = (W - PAD * 2) / Math.max(series.length - 1, 1);
  return { y, pts: series.map((v, i) => ({ x: PAD + step * i, y: y(v) })) };
}

/**
 * A tile's sparkline: the year so far as one ink line, last month's
 * level as a dashed grey line, and a dot on this month. The line draws
 * in once (GSAP); under reduced motion it is simply there.
 */
export function Sparkline(p: { series: number[]; compare?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const { y, pts } = sparkScale(p.series, p.compare);
  const d = pts.map((q, i) => `${i === 0 ? "M" : "L"}${q.x.toFixed(1)} ` +
    `${q.y.toFixed(1)}`).join(" ");
  const end = pts.at(-1);
  useLayoutEffect(() => {
    const svg = ref.current;
    if (svg === null) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(svg.querySelector("[data-line]"), { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut",
          delay: 0.15 });
      gsap.from(svg.querySelectorAll("[data-fade]"), { opacity: 0,
        duration: 0.3, delay: 0.85 });
    });
    return () => mm.revert();
  }, []);
  return (
    <svg ref={ref} className={s.spark} viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true" focusable="false">
      {p.compare !== undefined && (
        <line x1={0} x2={W} y1={y(p.compare)} y2={y(p.compare)}
          className={s.sparkCompare} data-fade="" />
      )}
      <path d={d} pathLength={1} className={s.sparkLine}
        data-line="" />
      {end !== undefined && (
        <path d={`M${end.x} ${end.y} L${end.x} ${end.y}`}
          className={s.sparkDot} data-fade="" />
      )}
    </svg>
  );
}
