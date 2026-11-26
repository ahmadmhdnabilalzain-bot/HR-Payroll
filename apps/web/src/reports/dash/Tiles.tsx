import { formatNumber, MINUS } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { Money } from "../../ui/Money";
import type { Change, Figure, TileModel } from "./model";
import { Sparkline } from "./Sparkline";
import s from "./dash.module.css";

/** A tile's figure at 34 px: money through <Money/>, counts as text. */
export function FigureView(p: { f: Figure }) {
  const { lang } = useLocale();
  return (
    <span className={s.tileFigure}>
      {p.f.kind === "money"
        ? <Money value={p.f.fils} tween={false} />
        : <span className="tabular">{formatNumber(p.f.n, lang)}</span>}
      {p.f.kind === "count" && p.f.unit !== undefined && p.f.unit !== "" && (
        <span className={s.tileUnit}>{p.f.unit}</span>
      )}
    </span>
  );
}

/** "+AED 5.00 against Sep", "+1 day against Sep", "Same as Sep". */
export function ChangeView(p: { c: Change }) {
  const { lang } = useLocale();
  const c = p.c;
  if (c === null) return null;
  if (c.kind === "money") {
    return (
      <span className={s.tileChange}>
        {c.fils === 0n ? `Same as ${c.against}` : (
          <><Money value={c.fils} size="sm" signed tween={false} />
            {` against ${c.against}`}</>
        )}
      </span>
    );
  }
  if (c.n === 0) {
    return <span className={s.tileChange}>{`Same as ${c.against}`}</span>;
  }
  const abs = Math.abs(c.n);
  const unit = c.unit === undefined ? ""
    : ` ${abs === 1 ? c.unit.replace(/s$/, "") : c.unit}`;
  return (
    <span className={s.tileChange}>
      <span className="tabular">
        {`${c.n < 0 ? MINUS : "+"}${formatNumber(abs, lang)}${unit}`}
      </span>
      {` against ${c.against}`}
    </span>
  );
}

function Meter(p: { part: number; whole: number }) {
  const share = Math.min(1, p.part / Math.max(p.whole, 1));
  return (
    <span className={s.meter} aria-hidden="true">
      <span className={s.meterFill} style={{ inlineSize:
        `${(share * 100).toFixed(1)}%` }} />
    </span>
  );
}

function Body(p: { t: TileModel }) {
  const t = p.t;
  return (
    <>
      <span className={s.tileLabel}>{t.label}</span>
      <FigureView f={t.figure} />
      {t.sub !== undefined && <span className={s.tileSub}>{t.sub}</span>}
      <ChangeView c={t.change} />
      <span className={s.tileArt}>
        {t.series !== undefined && t.series.length > 1 && (
          <Sparkline series={t.series} {...(t.compare === undefined ? {}
            : { compare: t.compare })} />
        )}
        {t.meter !== undefined && <Meter {...t.meter} />}
      </span>
    </>
  );
}

/**
 * Four to six tiles above a dashboard's table: a 13 px label, a 34 px
 * figure, the change against last month, and a sparkline (or a meter
 * where there is no history). A tile with a destination is a link.
 */
export function Tiles(p: { tiles: TileModel[]; label: string }) {
  return (
    <ul className={s.tiles} aria-label={p.label}>
      {p.tiles.map((t, i) => (
        <li key={t.id} className={s.tile} data-tile={t.id}
          data-money={t.figure.kind === "money"}
          style={{ "--i": i } as object}>
          {t.href === undefined ? <div className={s.tileIn}>
            <Body t={t} /></div> : (
            <a className={s.tileIn} href={t.href}><Body t={t} /></a>
          )}
        </li>
      ))}
    </ul>
  );
}
