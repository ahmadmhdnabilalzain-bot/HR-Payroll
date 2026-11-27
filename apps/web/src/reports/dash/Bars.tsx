import type { Fils } from "@payroll/engine";
import { useRef } from "react";
import type { ReactNode } from "react";
import { formatMoney, formatNumber } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { useChartMotion } from "../../ui/chartMotion";
import { useMaskText } from "../../ui/mask";
import { Money } from "../../ui/Money";
import { RowLink } from "../../ui/RowLink";
import type { Slice } from "./model";
import s from "./dash.module.css";

/** Grow the marks in once in view; tween them when the rows change. */
function useGrow(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useChartMotion(ref, key);
  return ref;
}

export interface HBar {
  key: string;
  label: string;
  /** Money in fils (follows hide-amounts) or a count. */
  value: { fils: Fils } | { n: number };
  /** Under the label: "8 people". */
  meta?: string;
  /** Where the row opens (its name is the link). */
  href?: string;
}

const size = (v: HBar["value"]): number =>
  "fils" in v ? Number(v.fils) : v.n;

/**
 * Horizontal bars, largest first: the name and a meta line, a grey bar
 * from zero (the largest in ink), and the figure at the end. Plain
 * HTML so the figures are <Money/> and read in order. A row with an
 * `href` is one link, name, bar and figure, named in words (amounts
 * follow hide-amounts in the name as on screen).
 */
export function HBars(p: { rows: HBar[]; label: string }) {
  const { lang } = useLocale();
  const mask = useMaskText();
  const max = p.rows.reduce((m, r) => Math.max(m, size(r.value)), 0);
  const ref = useGrow(p.rows.map((r) => `${r.key}${size(r.value)}`)
    .join());
  const said = (r: HBar): string => mask([r.label, r.meta,
    "fils" in r.value ? formatMoney(r.value.fils, lang)
      : formatNumber(r.value.n, lang)].filter((x) => x !== undefined)
    .join(", "));
  return (
    <div ref={ref}>
      <ul className={s.hbars} aria-label={p.label}>
        {p.rows.map((r, i) => {
          const body: ReactNode = (
            <>
              <span className={s.hbarText}>
                <span className={r.href === undefined ? s.hbarName
                  : `${s.hbarName} ${s.rowLink}`}>{r.label}</span>
                {r.meta !== undefined && (
                  <span className={s.hbarMeta}>{r.meta}</span>
                )}
              </span>
              <span className={s.hbarTrack} aria-hidden="true">
                <span data-mark="" data-key={r.key} data-grow="x"
                  className={s.hbarFill}
                  data-first={i === 0}
                  style={{ inlineSize: `${max === 0 ? 0
                    : (size(r.value) / max * 100).toFixed(1)}%` }} />
              </span>
              <span className={s.hbarValue}>
                {"fils" in r.value
                  ? <Money value={r.value.fils} size="sm" tween={false} />
                  : <span className="tabular">
                    {formatNumber(r.value.n, lang)}</span>}
              </span>
            </>
          );
          return r.href === undefined
            ? <li key={r.key} className={s.hbar}>{body}</li>
            : (
              <li key={r.key}>
                <RowLink href={r.href} label={said(r)}
                  className={`${s.hbar} ${s.hbarLink}`}>{body}</RowLink>
              </li>
            );
        })}
      </ul>
    </div>
  );
}

/**
 * One bar split into the largest groups, in steps of grey from ink,
 * with a key underneath: each group's name, count and share.
 */
export function SplitBar(p: { slices: Slice[]; label: string;
  unit: [string, string];
  /** Where each group opens (the whole key row is the link). */
  href?: string }) {
  const { lang } = useLocale();
  const total = p.slices.reduce((n, x) => n + x.count, 0);
  const ref = useGrow(p.slices.map((x) => `${x.label}${x.count}`).join());
  const pct = (n: number): string => total === 0 ? "0%"
    : `${Math.round(n * 100 / total)}%`;
  return (
    <div ref={ref} className={s.split}>
      <div className={s.splitBar} aria-hidden="true" data-mark=""
        data-key="split" data-grow="x">
        {p.slices.map((x, i) => (
          <span key={x.label} className={`${s.splitPart} ${s.tone}`}
            data-tone={Math.min(i, 5)}
            style={{ flexGrow: x.count }} />
        ))}
      </div>
      <ul className={s.splitKey} aria-label={p.label}>
        {p.slices.map((x, i) => {
          const count = `${formatNumber(x.count, lang)} ${x.count === 1
            ? p.unit[0] : p.unit[1]}, ${pct(x.count)}`;
          const body: ReactNode = (
            <>
              <span className={`${s.swatch} ${s.tone}`}
                data-tone={Math.min(i, 5)} aria-hidden="true" />
              <span className={s.splitName}>{x.label}</span>
              <span className={`${s.splitCount} tabular`}>{count}</span>
            </>
          );
          return p.href === undefined
            ? <li key={x.label} className={s.splitRow}>{body}</li>
            : (
              <li key={x.label}>
                <RowLink href={p.href} label={`${x.label}, ${count}`}
                  className={`${s.splitRow} ${s.splitLink}`}>
                  {body}</RowLink>
              </li>
            );
        })}
      </ul>
    </div>
  );
}
