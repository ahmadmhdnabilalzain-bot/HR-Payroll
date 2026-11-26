import type { MoveChecklistItem } from "../../demo/data/moves-types";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { Dot } from "./Dot";
import { checkKey, itemsNow, stepWho, useActor, type ItemState,
  type Tone } from "./view";
import s from "./moves.module.css";

const WORD: Record<ItemState, string> = { done: "Done", open: "To do",
  overdue: "Overdue" };
const TONE: Record<ItemState, Tone> = { done: "ok", open: "neutral",
  overdue: "warn" };

/**
 * A joiner's or leaver's checklist: an inset grouped list. "Mark done"
 * records who, their role and the demo's date; the toast and the row
 * both undo it. Items done before the demo carry the data's own date.
 */
export function Checklist(p: { listId: string; items: MoveChecklistItem[];
  subject: string }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const rows = itemsNow(p.listId, p.items, state);
  const key = (k: string): string => checkKey(p.listId, k);
  return (
    <ul className={s.group} aria-label={`Checklist for ${p.subject}`}>
      {rows.map(({ item, state: st, step }) => (
        <li key={item.key}>
          <div className={s.item}>
            <div className={s.itemMain}>
              <span className={s.itemTitle}>{item.label}</span>
              <span className={s.itemMeta}>
                <span>{item.ownerText}</span>
                <span>
                  {step !== null
                    ? `Done by ${stepWho(data, step)}` : item.dueText}
                </span>
                {item.note !== null && <span>{item.note}</span>}
              </span>
            </div>
            <div className={s.itemAct}>
              <Dot tone={TONE[st]}>{WORD[st]}</Dot>
              {st !== "done" ? (
                <button type="button" className={`${b.btn} ${b.secondary}`}
                  onClick={() => {
                    dispatch({ type: "move-step", key: key(item.key),
                      step: { value: "done", from: st, by: actor.id,
                        role: actor.role, on: actor.on } });
                    toast.show(`${item.label}: marked done`, () =>
                      dispatch({ type: "move-undo", key: key(item.key) }));
                  }}>
                  Mark done
                  <span className="visually-hidden">: {item.label}</span>
                </button>
              ) : step !== null && (
                <button type="button" className={`${b.btn} ${b.quiet}`}
                  onClick={() => dispatch({ type: "move-undo",
                    key: key(item.key) })}>
                  Undo
                  <span className="visually-hidden">: {item.label}</span>
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
