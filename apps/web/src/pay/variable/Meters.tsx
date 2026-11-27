import type { CSSProperties, ReactNode } from "react";
import type { VariableSource } from "./source";
import v from "./variable.module.css";

type Tier = VariableSource["commission"]["tiers"][number];

/** The scale's top, in percent of target, unless a result goes past. */
const SCALE_MIN = 140;

const css = (o: Record<string, string | number>): CSSProperties =>
  o as CSSProperties;

/**
 * Attainment against the tier bands: one segment a band (as wide as
 * the band), grey filled up to the result, and an ink marker at it.
 * Both move by transform only. `figure` is the result, which the
 * caller may make explainable.
 */
export function AttainmentMeter(p: { tiers: readonly Tier[];
  attainmentBps: bigint; figure: ReactNode; attainmentText: string }) {
  const at = Number(p.attainmentBps) / 100;
  const top = Math.max(SCALE_MIN, Math.ceil((at + 5) / 10) * 10);
  const hit = p.tiers.find((t) => p.attainmentBps >= t.fromBps &&
    (t.toBps === null || p.attainmentBps < t.toBps));
  const edge = (t: Tier): number => t.toBps === null ? top
    : Number(t.toBps) / 100;
  const ticks = p.tiers.filter((t) => t.fromBps > 0n)
    .map((t) => Number(t.fromBps) / 100);
  const said = `Attainment ${p.attainmentText} of target` + (hit === undefined
    ? "" : `, in the band ${hit.label}, paying ${hit.rateText}`);
  return (
    <section className={v.meter} aria-label="Attainment against the tiers">
      <div className={v.meterHead}>
        <span>Attainment against the tiers</span>
        <span className={v.meterValue}>{p.figure}</span>
      </div>
      <div className={v.track} role="img" aria-label={said}>
        {p.tiers.map((t) => {
          const from = Number(t.fromBps) / 100;
          const span = edge(t) - from;
          const f = Math.min(1, Math.max(0, (at - from) / span));
          return (
            <span key={t.id} className={v.seg}
              style={css({ "--span": span, "--f": f })}>
              <span className={v.fill} />
            </span>
          );
        })}
        <span className={v.rail}>
          <span className={v.marker}
            style={css({ "--at": `${(at / top) * 100}%` })} />
        </span>
      </div>
      <div className={v.ticks} aria-hidden="true">
        {ticks.map((n) => (
          <span key={n} style={css({ "--p": `${(n / top) * 100}%` })}>
            {n}%</span>
        ))}
      </div>
      <p className={v.meterNote}>
        {hit === undefined ? "" : `${hit.label} pays ${hit.rateText} on ` +
          "the sales in it."}</p>
    </section>
  );
}

/** What is selected for payout, against everyone eligible. */
export function PayoutMeter(p: { selected: bigint; eligible: bigint;
  figure: ReactNode; text: string }) {
  const f = p.eligible === 0n ? 0
    : Math.min(1, Number(p.selected) / Number(p.eligible));
  return (
    <section className={v.meter} aria-label="Payout against eligible">
      <div className={v.meterHead}>
        <span>Selected for payout</span>
        <span className={v.meterValue}>{p.figure}</span>
      </div>
      <div className={`${v.track} ${v.ink}`} role="img" aria-label={p.text}>
        <span className={v.seg} style={css({ "--span": 1, "--f": f })}>
          <span className={v.fill} />
        </span>
      </div>
      <p className={v.meterNote}>{p.text}</p>
    </section>
  );
}
