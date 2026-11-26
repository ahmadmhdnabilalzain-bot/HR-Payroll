import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { reducedMotion } from "../demo/motion";
import s from "./Money.module.css";
import {
  dimKeyframes,
  planRoll,
  ROLL_MS,
  slideKeyframes,
  SWAP_MS,
  type Slot,
} from "./roll";

/** What a figure shows: an optional sign and currency, then digits. */
export interface Face {
  sign?: string;
  cur?: string;
  /** "1,234.50" or "12": the characters that can roll. */
  digits: string;
  /** Characters from here on are set as fils (smaller). */
  fracAt?: number;
}

type Run =
  | { id: number; kind: "roll"; slots: Slot[]; up: boolean }
  | { id: number; kind: "swap"; old: Face };

const keyOf = (f: Face): string =>
  `${f.sign ?? ""}|${f.cur ?? ""}|${f.digits}`;

let runs = 0;

/**
 * A figure that changes in place. Unchanged digits stay still; the
 * digits that changed roll (ui/roll.ts has the timeline and why it
 * never reads as a wrong amount). A change of shape (a sign, a digit
 * more or less) is a whole-figure swap: old out, then new in. No roll
 * on mount, under reduced motion or with `animate` false. Everything
 * runs on WAAPI, so document.getAnimations() can pause and step it;
 * the DOM settles back to the plain figure when the animations end.
 */
export function RollFace(p: { face: Face; value: number | bigint;
  animate: boolean;
  /** Settled, draw the digits as bare text (a count reads as "12"),
   * with the final value for screen readers only while it rolls. */
  plain?: boolean }) {
  const was = useRef<{ face: Face; value: number | bigint }>(
    { face: p.face, value: p.value });
  const [run, setRun] = useState<Run | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const key = keyOf(p.face);
  useLayoutEffect(() => {
    const old = was.current;
    was.current = { face: p.face, value: p.value };
    if (keyOf(old.face) === key) return;
    if (!p.animate || reducedMotion()) {
      setRun(null);
      return;
    }
    runs += 1;
    const plan = (old.face.sign ?? "") === (p.face.sign ?? "") &&
      old.face.cur === p.face.cur && old.face.fracAt === p.face.fracAt
      ? planRoll(old.face.digits, p.face.digits) : { kind: "swap" as const };
    if (plan.kind === "roll") {
      setRun({ id: runs, kind: "roll", slots: plan.slots,
        up: p.value > old.value });
    } else if (plan.kind === "swap") {
      setRun({ id: runs, kind: "swap", old: old.face });
    }
  }, [key]);
  useLayoutEffect(() => {
    const el = root.current?.parentElement;
    if (run === null || el == null) return undefined;
    const anims = run.kind === "roll" ? startRoll(el, run.up)
      : startSwap(el);
    let live = true;
    void Promise.all(anims.map((a) => a.finished)).then(() => {
      if (live) setRun((r) => (r?.id === run.id ? null : r));
    }, () => undefined);
    return () => {
      live = false;
      for (const a of anims) a.cancel();
    };
  }, [run]);
  const now = run?.kind === "roll" ? run.slots : null;
  if (p.plain === true && run === null) {
    return <><span ref={root} hidden />{p.face.digits}</>;
  }
  return (
    <>
      <span ref={root} hidden />
      {p.plain === true && (
        <span className="visually-hidden">{p.face.digits}</span>
      )}
      {run?.kind === "swap" && (
        <span className={s.ghostFace} data-roll-old="" aria-hidden="true">
          <FaceView face={run.old} slots={null} />
        </span>
      )}
      <FaceView face={p.face} slots={now} up={run?.kind === "roll" &&
        run.up} fresh={run?.kind === "swap"} />
    </>
  );
}

function startRoll(el: Element, up: boolean): Animation[] {
  const out: Animation[] = [];
  const timing = { duration: ROLL_MS, fill: "both" as const };
  for (const c of el.querySelectorAll<HTMLElement>("[data-roll-col]")) {
    const rank = Number(c.dataset["rank"] ?? 0);
    out.push(c.animate(slideKeyframes(rank, up), timing));
    const slot = c.parentElement;
    if (slot !== null) out.push(slot.animate(dimKeyframes(), timing));
  }
  return out;
}

function startSwap(el: Element): Animation[] {
  const out: Animation[] = [];
  for (const g of el.querySelectorAll<HTMLElement>("[data-roll-old]")) {
    out.push(g.animate([{ opacity: 1 }, { opacity: 0 }],
      { duration: SWAP_MS, easing: "linear", fill: "both" }));
  }
  for (const n of el.querySelectorAll<HTMLElement>("[data-roll-new]")) {
    out.push(n.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: SWAP_MS, delay: SWAP_MS, easing: "linear",
        fill: "both" }));
  }
  return out;
}

/** The sign and currency, then the digits (fils smaller). */
function FaceView(p: { face: Face; slots: Slot[] | null; up?: boolean;
  fresh?: boolean }) {
  const f = p.face;
  const at = f.fracAt ?? f.digits.length;
  const chars = p.slots ?? [...f.digits].map((c) => ({ to: c }));
  const draw = (list: Slot[], from: number): ReactNode =>
    p.slots === null ? f.digits.slice(from, from + list.length)
      : list.map((x, i) => <Char key={from + i} slot={x}
        up={p.up === true} />);
  const mark = p.fresh === true ? { "data-roll-new": "" } : {};
  const lead = f.sign !== undefined || f.cur !== undefined;
  return (
    <>
      {lead && (
        <span aria-hidden="true" className={s.lead} {...mark}>
          {f.sign !== undefined && f.sign !== "" && (
            <span className={s.sign}>{f.sign}</span>
          )}
          {f.cur !== undefined && <span className={s.cur}>{f.cur}</span>}
        </span>
      )}
      <span className={s.stack} aria-hidden="true" {...mark}>
        <span className={s.settled}>
          {draw(chars.slice(0, at), 0)}
          {at < chars.length && (
            <span className={s.frac}>{draw(chars.slice(at), at)}</span>
          )}
        </span>
      </span>
    </>
  );
}

/**
 * One character; a changed digit is a two-glyph column in a clip:
 * old over new for a rise (it slides up), new over old for a fall.
 */
function Char(p: { slot: Slot; up: boolean }) {
  const x = p.slot;
  if (x.from === undefined) return <>{x.to}</>;
  return (
    <span className={s.slot}>
      <span className={s.spacer}>{x.to}</span>
      <span className={s.col} data-roll-col="" data-rank={x.rank ?? 0}>
        <span data-glyph={p.up ? "old" : "new"}>
          {p.up ? x.from : x.to}</span>
        <span data-glyph={p.up ? "new" : "old"}>
          {p.up ? x.to : x.from}</span>
      </span>
    </span>
  );
}
