import b from "../button.module.css";
import s from "./templates.module.css";

export interface RowChoice {
  label: string;
  run(): void;
}

/**
 * The decision on a list row (FilterList's `rowActions`). Only the
 * person who may decide sees the buttons, using the same rule as the
 * record; everyone else reads who it waits for. After a decision the
 * row offers a quiet Undo to the one who made it. The callers run the
 * store's own actions, which record who, their role and the date, and
 * show the toast with its undo.
 */
export function RowDecision(p: {
  /** Still waiting for a decision. */
  open: boolean;
  /** The viewer may decide (the record's own rule). */
  mine: boolean;
  /** Who it waits for, shown when the viewer may not decide. */
  waitingFor?: string | undefined;
  /** The positive step (Agree, Give the role, Sign and issue). */
  yes: RowChoice;
  /** The other answer (Decline), when there is one. */
  no?: RowChoice | undefined;
  /** Take the viewer's decision back. */
  undo?: (() => void) | undefined;
}) {
  if (p.open && p.mine) {
    return (
      <span className={s.decide}>
        {p.no !== undefined && (
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={p.no.run}>{p.no.label}</button>
        )}
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={p.yes.run}>{p.yes.label}</button>
      </span>
    );
  }
  if (p.open && p.waitingFor !== undefined) {
    return <span className={s.waitFor}>{`Waiting for ${p.waitingFor}`}</span>;
  }
  if (!p.open && p.undo !== undefined) {
    return (
      <button type="button" className={`${b.btn} ${b.quiet}`}
        onClick={p.undo}>Undo</button>
    );
  }
  return null;
}
