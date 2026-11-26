import { fils, type Fils } from "@payroll/engine";
import { gsap } from "gsap";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { reducedMotion } from "../demo/motion";
import { hrefOf } from "../demo/route";
import { useLocale } from "../i18n/LocaleProvider";
import { usePay } from "../pay/load";
import type { PastRunView } from "../pay/types";
import { Money } from "../ui/Money";
import { Avatar } from "../ui/Avatar";
import s from "./NetTrend.module.css";

/** Chart box in SVG units; the SVG scales to its column. */
const W = 400;
const H = 80;
const PAD_X = 10;
const PAD_Y = 28;
/** People named beside the change: the biggest movers by net. */
const DRIVERS = 3;

const abs = (v: bigint): bigint => (v < 0n ? -v : v);

interface Pt {
  x: number;
  y: number;
}

/**
 * Where each month sits. The scale spans the months' own range with
 * headroom (net pay moves about 2% a month), so the line shows the
 * shape; the real figures sit on the first and last points.
 */
function pointsOf(runs: PastRunView[]): Pt[] {
  const nets = runs.map((r) => Number(r.net));
  const lo = Math.min(...nets);
  const hi = Math.max(...nets);
  const span = Math.max(hi - lo, 1);
  const top = hi + span * 0.25;
  const bottom = lo - span * 1.25;
  const step = (W - PAD_X * 2) / Math.max(runs.length - 1, 1);
  return nets.map((n, i) => ({ x: PAD_X + step * i,
    y: PAD_Y + ((top - n) / (top - bottom)) * (H - PAD_Y * 2) }));
}

const line = (pts: Pt[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ` +
    `${p.y.toFixed(1)}`).join(" ");

/**
 * Net pay June to October as a small area chart, drawn from the pay
 * package's trend (the same runs as Pay, past runs), with the change
 * against September and the people who moved it most, from the same
 * run's per-person changes (they add up to the change exactly).
 * October is drawn dashed and hollow: prepared, not paid yet.
 */
export function NetTrend() {
  const { t } = useLocale();
  const pay = usePay();
  const runs = pay.runs;
  const box = useRef<SVGSVGElement>(null);
  const pts = pointsOf(runs);
  const paid = runs.filter((r) => r.paid).length;
  const last = runs.at(-1);
  const first = runs[0];
  useDraw(box);
  if (last === undefined || first === undefined) return null;
  const change = last.change ?? 0n;
  const before = runs.at(-2);
  const drivers = [...last.changes].sort((a, b) =>
    Number(abs(b.change) - abs(a.change))).slice(0, DRIVERS);
  const solid = pts.slice(0, Math.max(paid, 1));
  const tail = pts.slice(Math.max(paid - 1, 0));
  const area = `${line(pts)} L${pts.at(-1)!.x.toFixed(1)} ${H} ` +
    `L${pts[0]!.x.toFixed(1)} ${H} Z`;
  return (
    <section className={s.trend} aria-labelledby="trend-title">
      <div className={s.head}>
        <h2 id="trend-title" className={s.title}>
          {t("home.trendTitle", { from: first.label.split(" ")[0] ?? "",
            to: last.label.split(" ")[0] ?? "" })}
        </h2>
        <p className={s.note}>{t("home.trendNote")}</p>
      </div>
      <figure className={s.figure}>
        <svg ref={box} className={s.chart} viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true" focusable="false">
          <path className={s.area} d={area} data-draw="area" />
          <path className={s.line} d={line(solid)} pathLength={1}
            data-draw="line" />
          {tail.length > 1 && (
            <path className={s.tail} d={line(tail)} data-draw="tail" />
          )}
        </svg>
        <ol className={s.points}>
          {runs.map((r, i) => (
            <li key={r.id} style={{ insetInlineStart:
              `${(pts[i]!.x / W) * 100}%`, insetBlockStart:
              `${(pts[i]!.y / H) * 100}%` }} data-paid={r.paid}
              data-draw="dot">
              <span className="visually-hidden">
                {r.label}{r.paid ? "" : `, ${t("home.trendPrepared")}`}
                {": "}<Money value={r.net} tween={false} />
              </span>
              {i >= runs.length - 2 && (
                <span className={s.tag} aria-hidden="true"
                  data-end={i === runs.length - 1}>
                  <Money value={r.net} size="sm" tween={false} />
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className={s.months} aria-hidden="true">
          {runs.map((r) => (
            <span key={r.id}>{r.label.slice(0, 3)}</span>
          ))}
        </div>
      </figure>
      <p className={s.change}>
        <span className={s.delta}>
          <span className="visually-hidden">
            {change < 0n ? t("home.trendDown") : t("home.trendUp")}
          </span>
          <Money value={fils(change)} size="sm" signed tween={false} />
        </span>
        <span className={s.against}>
          {t("home.trendAgainst", { month:
            before?.label.split(" ")[0] ?? "" })}
        </span>
      </p>
      <ul className={s.drivers} aria-label={t("home.trendDrivers")}>
        {drivers.map((d) => (
          <li key={d.employeeId}>
            <a className={s.driver} href={hrefOf("people", d.employeeId)}>
              <Avatar id={d.employeeId} name={d.name} />
              <span className={s.who}>
                <span className={s.name}>{d.name}</span>
                <span className={s.why}>{reasonText(d.reasons)}</span>
              </span>
              <Signed value={d.change} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "left", "joined, sick day unpaid": the package's own words. */
function reasonText(r: string[]): string {
  const s = r.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Signed(p: { value: bigint }) {
  const { t } = useLocale();
  return (
    <span className={`${s.amount} tabular`}>
      <span className="visually-hidden">
        {p.value < 0n ? t("home.trendDown") : t("home.trendUp")}
      </span>
      <Money value={fils(p.value) as Fils} size="sm" signed
        tween={false} />
    </span>
  );
}

/**
 * The opening pass: the line draws left to right (path length 1, so
 * the page zoom cannot skew it), the area and the October tail fade
 * in under it, then the points. Reduced motion shows the end state.
 */
function useDraw(box: RefObject<SVGSVGElement | null>): void {
  useLayoutEffect(() => {
    const svg = box.current;
    if (svg === null || reducedMotion()) return undefined;
    const root = svg.parentElement;
    const q = (k: string) => root?.querySelectorAll(`[data-draw="${k}"]`)
      ?? [];
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.fromTo(q("line"), { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" })
      .fromTo(q("area"), { opacity: 0 }, { opacity: 1, duration: 0.5 },
        0.35)
      .fromTo(q("tail"), { opacity: 0 }, { opacity: 1, duration: 0.3 },
        0.85)
      .fromTo(q("dot"), { opacity: 0 }, { opacity: 1, duration: 0.25,
        stagger: 0.06 }, 0.5);
    return () => {
      tl.progress(1).kill();
    };
  }, [box]);
}
