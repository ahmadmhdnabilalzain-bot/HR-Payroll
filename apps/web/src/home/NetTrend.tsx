import { fils, type Fils } from "@payroll/engine";
import { useRef } from "react";
import { hrefOf } from "../demo/route";
import { useLocale } from "../i18n/LocaleProvider";
import { usePay } from "../pay/load";
import type { PastRunView } from "../pay/types";
import { Money } from "../ui/Money";
import { Avatar } from "../ui/Avatar";
import { useChartMotion } from "../ui/chartMotion";
import s from "./NetTrend.module.css";

/** Chart box in SVG units; the SVG scales to its column. */
const W = 400;
const H = 80;
const PAD_X = 10;
const PAD_Y = 22;
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
  const top = hi + span * 0.1;
  const bottom = lo - span * 0.1;
  const step = (W - PAD_X * 2) / Math.max(runs.length - 1, 1);
  return nets.map((n, i) => ({ x: PAD_X + step * i,
    y: PAD_Y + ((top - n) / (top - bottom)) * (H - PAD_Y * 2) }));
}

const line = (pts: Pt[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ` +
    `${p.y.toFixed(1)}`).join(" ");

/**
 * Net pay June to October as a small line chart, drawn from the pay
 * package's trend (the same runs as Pay, past runs), with the change
 * against September and the people who moved it most, from the same
 * run's per-person changes (they add up to the change exactly).
 * October is drawn dashed and hollow: prepared, not paid yet.
 */
export function NetTrend() {
  const { t } = useLocale();
  const pay = usePay();
  const runs = pay.runs;
  const fig = useRef<HTMLElement>(null);
  const pts = pointsOf(runs);
  const paid = runs.filter((r) => r.paid).length;
  const last = runs.at(-1);
  const first = runs[0];
  // The line draws left to right once in view (480 ms), then the
  // October tail and the points fade in; a new net morphs the line.
  // Drawn once per session: a role switch or a return to Home shows
  // the finished chart rather than replaying the draw.
  useChartMotion(fig, runs.map((r) => `${r.id}${r.net}`).join(), true,
    { session: "home.netTrend" });
  if (last === undefined || first === undefined) return null;
  const change = last.change ?? 0n;
  const before = runs.at(-2);
  const drivers = [...last.changes].sort((a, b) =>
    Number(abs(b.change) - abs(a.change))).slice(0, DRIVERS);
  const solid = pts.slice(0, Math.max(paid, 1));
  const tail = pts.slice(Math.max(paid - 1, 0));
  return (
    <section className={s.trend} aria-labelledby="trend-title">
      <div className={s.head}>
        <h2 id="trend-title" className={s.title}>
          {t("home.trendTitle", { from: first.label.split(" ")[0] ?? "",
            to: last.label.split(" ")[0] ?? "" })}
        </h2>
        <p className={s.note}>{t("home.trendNote")}</p>
      </div>
      <figure className={s.figure} ref={fig}>
        <svg className={s.chart} viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true" focusable="false">
          <path className={s.line} d={line(solid)} pathLength={1}
            data-line="" data-key="line" />
          {tail.length > 1 && (
            <path className={s.tail} d={line(tail)} data-label="" />
          )}
        </svg>
        <ol className={s.points}>
          {runs.map((r, i) => (
            <li key={r.id} style={{ insetInlineStart:
              `${(pts[i]!.x / W) * 100}%`, insetBlockStart:
              `${(pts[i]!.y / H) * 100}%` }} data-paid={r.paid}
              data-label="">
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
