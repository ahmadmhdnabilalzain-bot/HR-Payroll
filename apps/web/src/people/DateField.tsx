import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import s from "./DateField.module.css";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (n: number): string => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number): string =>
  `${y}-${pad(m)}-${pad(d)}`;
const parts = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.split("-").map(Number);
  return [y ?? 2000, m ?? 1, d ?? 1];
};
const daysIn = (y: number, m: number): number =>
  new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Monday first: 0 for Monday, 6 for Sunday. */
const weekday = (iso: string): number =>
  (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
const shift = (iso: string, n: number): string => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/** "1 April 2027": the month in words, so it never reads as 4 January. */
export function longDate(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1] ?? ""} ${y}`;
}

/**
 * A date field in the product's own style, beside Picker: a button that
 * says the date in words and a month grid in a popover (the same 160 ms
 * scale and fade). Arrow keys move by a day or a week, Page Up and Page
 * Down by a month, Enter picks, Escape closes and returns focus. Days
 * outside `min` and `max` cannot be picked. `today` is the demo day.
 */
export function DateField(p: { label: string; value: string; min: string;
  max: string; today: string; onChange(iso: string): void;
  describedBy?: string }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(p.value);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();
  /** Focus the picked day on opening; after that, only while the
   * focus is already in the grid (the month buttons keep theirs). */
  const opening = useRef(false);
  const [y, m] = parts(at);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e: Event): void => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener("pointerdown", off);
    return () => removeEventListener("pointerdown", off);
  }, [open]);
  useEffect(() => {
    const g = grid.current;
    if (!open || g === null) return;
    if (!opening.current && !g.contains(document.activeElement)) return;
    opening.current = false;
    g.querySelector<HTMLButtonElement>(`[data-iso="${at}"]`)
      ?.focus({ preventScroll: true });
  }, [open, at]);
  const clamp = (iso: string): string => iso < p.min ? p.min
    : iso > p.max ? p.max : iso;
  const pick = (iso: string): void => {
    p.onChange(iso);
    setOpen(false);
    btn.current?.focus({ preventScroll: true });
  };
  const month = (n: number): void => {
    const total = (m - 1) + n;
    const ny = y + Math.floor(total / 12);
    const nm = ((total % 12) + 12) % 12 + 1;
    const d = Math.min(parts(at)[2], daysIn(ny, nm));
    setAt(clamp(isoOf(ny, nm, d)));
  };
  const first = isoOf(y, m, 1);
  const lead = weekday(first);
  const cells = [...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysIn(y, m) }, (_, i) => isoOf(y, m, i + 1))];
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) },
    (_, w) => cells.slice(w * 7, w * 7 + 7));
  const canBack = isoOf(y, m, 1) > p.min;
  const canOn = isoOf(y, m, daysIn(y, m)) < p.max;
  return (
    <div className={s.box} ref={box}>
      <button ref={btn} type="button" className={s.button}
        aria-haspopup="dialog" aria-expanded={open}
        aria-label={`${p.label}: ${longDate(p.value)}`}
        aria-describedby={p.describedBy}
        onClick={() => {
          setAt(p.value);
          opening.current = !open;
          setOpen(!open);
        }}>
        <span className={s.value}>{longDate(p.value)}</span>
        <Icon name="calendar" size={16} />
      </button>
      {open && (
        <div className={s.pop} role="dialog" aria-modal="false"
          aria-labelledby={`${id}-m`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              btn.current?.focus();
            }
          }}>
          <div className={s.head}>
            <button type="button" className={s.step} disabled={!canBack}
              aria-label="Previous month" onClick={() => month(-1)}>
              <span className={s.back}><Icon name="chevronEnd" size={16} />
              </span></button>
            <h3 id={`${id}-m`} className={s.month} aria-live="polite">
              {`${MONTHS[m - 1]} ${y}`}</h3>
            <button type="button" className={s.step} disabled={!canOn}
              aria-label="Next month" onClick={() => month(1)}>
              <Icon name="chevronEnd" size={16} /></button>
          </div>
          <div ref={grid} role="grid" aria-labelledby={`${id}-m`}
            className={s.grid}
            onKeyDown={(e) => {
              const move: Record<string, number> = { ArrowLeft: -1,
                ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
              const rtl = getComputedStyle(e.currentTarget).direction ===
                "rtl" ? -1 : 1;
              const n = move[e.key];
              // The focused day may unmount (a new month): refocus.
              if (n !== undefined || e.key === "PageUp" ||
                e.key === "PageDown") opening.current = true;
              if (n !== undefined) {
                e.preventDefault();
                setAt(clamp(shift(at, Math.abs(n) === 1 ? n * rtl : n)));
              } else if (e.key === "PageUp" || e.key === "PageDown") {
                e.preventDefault();
                month(e.key === "PageUp" ? -1 : 1);
              }
            }}>
            <div role="row" className={s.week}>
              {DAYS.map((x) => <span key={x} role="columnheader"
                className={s.dow} aria-label={x}>{x.slice(0, 2)}</span>)}
            </div>
            {weeks.map((w, i) => (
              <div key={i} role="row" className={s.week}>
                {w.map((iso, j) => iso === null
                  ? <span key={`x${j}`} role="gridcell" />
                  : (
                    <span key={iso} role="gridcell"
                      aria-selected={iso === p.value}>
                      <button type="button" className={s.day}
                        data-iso={iso} tabIndex={iso === at ? 0 : -1}
                        data-picked={iso === p.value}
                        data-today={iso === p.today}
                        disabled={iso < p.min || iso > p.max}
                        aria-label={`${longDate(iso)}${iso === p.today
                          ? ", today" : ""}`}
                        onClick={() => pick(iso)}>
                        {Number(iso.slice(8, 10))}</button>
                    </span>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
