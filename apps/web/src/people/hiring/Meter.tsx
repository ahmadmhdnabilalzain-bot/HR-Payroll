import type { Fils } from "@payroll/engine";
import h from "./hiring.module.css";

const pct = (a: bigint, of: bigint): number =>
  of <= 0n ? 0 : Number((a * 10000n) / of) / 100;
const word = (n: number): string => `${Math.round(n)}%`;

/**
 * A position's budget as one segmented track: committed (ink), offered
 * (grey) and left (the track). Widths are fixed; the segments grow in
 * with a transform only, from the start edge, and stand still under
 * reduced motion. Over budget fills the track and says so in words.
 * Read out as shares, never amounts, so hidden amounts stay hidden.
 */
export function BudgetMeter(p: { firstYear: Fils; committed: Fils;
  offered: Fils; size?: "sm" | "md"; label?: string }) {
  const spent = p.committed + p.offered;
  const whole = spent > p.firstYear ? spent : p.firstYear;
  const c = pct(p.committed, whole);
  const o = pct(p.offered, whole);
  const over = spent > p.firstYear;
  const left = over ? 0 : Math.max(0, 100 - c - o);
  const text = `${p.label ?? "Budget"}: committed ${word(c)}, offered ` +
    `${word(o)}, ${over ? "over budget" : `left ${word(left)}`}`;
  return (
    <span className={h.meter} data-size={p.size ?? "sm"} role="img"
      aria-label={text} data-over={over}>
      {c > 0 && <span className={h.meterCommitted}
        style={{ inlineSize: `${c}%` }} />}
      {o > 0 && <span className={h.meterOffered}
        style={{ inlineSize: `${o}%` }} />}
    </span>
  );
}

/** The three words beside a large meter: a key, not colour alone. */
export function MeterKey() {
  return (
    <span className={h.meterKey} aria-hidden="true">
      <span><i data-k="c" />Committed</span>
      <span><i data-k="o" />Offered</span>
      <span><i data-k="l" />Left</span>
    </span>
  );
}
