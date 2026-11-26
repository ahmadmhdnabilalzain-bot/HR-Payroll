import { useState } from "react";
import type { UnmatchedRow } from "../demo/data/time-types";
import { useDemo } from "../demo/state";
import { dayText } from "../people/words";
import b from "../ui/button.module.css";
import { useToast } from "../ui/Toast";
import { FilterList, Sheet } from "../ui/templates";
import { Status, useTimeData, useWho } from "./shared";
import s from "./time.module.css";

/** T13, Device punches no person matches: match each to someone (LF). */
export function Punches() {
  const t = useTimeData();
  const { data, state, dispatch } = useDemo();
  const who = useWho();
  const toast = useToast();
  const [open, setOpen] = useState<UnmatchedRow | null>(null);
  const [pick, setPick] = useState("");
  const people = data.people.people().filter((x) => x.status !== "left");
  const last4 = (x: UnmatchedRow): string => x.badge.slice(-4);
  const guess = (x: UnmatchedRow): string =>
    people.find((q) => q.number.endsWith(last4(x)))?.id ?? "";
  const show = (x: UnmatchedRow): void => {
    setPick(guess(x));
    setOpen(x);
  };
  const match = (): void => {
    if (open === null || pick === "") return;
    const id = open.id;
    dispatch({ type: "punch-match", id, employeeId: pick });
    toast.show(`Punch matched to ${who.name(pick)}.`,
      () => dispatch({ type: "punch-unmatch", id }));
    setOpen(null);
  };
  const done = (x: UnmatchedRow): boolean => state.punchMatched[x.id] !==
    undefined;
  return (
    <>
      <FilterList title="Clock-ins to match"
        lede="Reader punches that no person or in and out pair explains."
        rows={t.unmatched} rowKey={(x) => x.id}
        searchText={(x) => `${x.badge} ${x.reader} ${x.reason}`}
        segments={[
          { id: "to", label: "To match", match: (x) => !done(x) },
          { id: "done", label: "Matched", match: done },
          { id: "all", label: "All", match: () => true },
        ]}
        columns={[
          { key: "b", label: "Badge", render: (x) => x.badge },
          { key: "w", label: "When", render: (x) => (
            <span className={s.wrap}>{dayText(x.date, who.lang)}, {x.time}
            </span>) },
          { key: "r", label: "Reader", render: (x) => (
            <span className={s.wrap}>{x.reader}</span>) },
          { key: "y", label: "What happened", render: (x) => (
            <span className={s.wrap}>{x.reason}</span>) },
          { key: "a", label: "Action", end: true, render: (x) => {
            const m = state.punchMatched[x.id];
            return m === undefined ? (
              <button type="button" className={`${b.btn} ${b.secondary} `
                + s.rowBtn} onClick={() => show(x)}>Match</button>
            ) : (
              <span className={s.inline}>
                <Status tone="done">{`Matched to ${who.name(m)}`}</Status>
                <button type="button" className={`${b.btn} ${b.quiet} `
                  + s.rowBtn} onClick={() => dispatch({ type:
                    "punch-unmatch", id: x.id })}>Undo</button>
              </span>
            );
          } },
        ]}
        empty="Every punch is matched. New ones from the readers show here."
      />
      <Sheet open={open !== null} title="Match this punch"
        onClose={() => setOpen(null)}>
        {open !== null && (
          <div className={s.picker}>
            <p>{open.badge} at {dayText(open.date, who.lang)}, {open.time}.
              {" "}{open.reason}</p>
            <label>
              <span className={s.note}>Who is it?</span>
              <select value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Choose a person</option>
                {people.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name[who.lang]} ({q.number})
                  </option>
                ))}
              </select>
            </label>
            {guess(open) !== "" && (
              <p className={s.note}>
                Suggested: {who.name(guess(open))}. The staff number ends
                in {last4(open)}, like the badge.
              </p>
            )}
            <div className={s.inline}>
              <button type="button" className={`${b.btn} ${b.primary} `
                + s.rowBtn} disabled={pick === ""}
                onClick={match}>Match punch</button>
              <button type="button" className={`${b.btn} ${b.quiet} `
                + s.rowBtn} onClick={() => setOpen(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
