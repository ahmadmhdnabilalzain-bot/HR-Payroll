import { useDemo } from "../demo/state";
import type { TimeData } from "../demo/data/time-types";
import { dayText, rangeText } from "../people/words";
import b from "../ui/button.module.css";
import { useToast } from "../ui/Toast";
import { FilterList } from "../ui/templates";
import { Status, useTimeData, useWho } from "./shared";
import s from "./time.module.css";
import { plural } from "./words";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const dow = (iso: string): number => new Date(`${iso}T00:00:00Z`)
  .getUTCDay();

/**
 * T20, Shifts and rosters: the two planned weeks by person. The month
 * template starts on the 1st and the plan starts on the 9th, so this
 * grid shows just the planned days (published week, then draft week).
 */
export function Roster() {
  const t = useTimeData();
  const who = useWho();
  const rows = t.roster.filter((r) => who.visible.has(r.employeeId));
  const shift = (id: string | null) => t.shifts.find((x) => x.id === id);
  const first = t.rosterDays[0]?.iso ?? "";
  const last = t.rosterDays.at(-1)?.iso ?? "";
  return (
    <>
      <div className={s.rosterPage}>
        <header className={s.rosterHead}>
          <h1 className={s.rosterTitle}>Shifts and rosters</h1>
          <p className={s.muted}>
            {rangeText(first, last, who.lang)}. The first week is
            published, the second is a draft. Leave is shown so no one is
            planned on it.
          </p>
          <p className={s.legend} aria-label="Key">
            <span data-tone="shift">Shift</span>
            <span data-tone="booked">Leave</span>
            <span data-tone="waiting">Leave, waiting</span>
            <span data-tone="rest">Rest day</span>
          </p>
        </header>
        <div className={s.gridScroll} tabIndex={0} role="region"
          aria-label="Roster, scrolls sideways">
          <table className={s.grid}>
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Who
                </span></th>
                {t.rosterDays.map((d) => (
                  <th key={d.iso} scope="col" data-draft={d.status ===
                    "draft"}>
                    <span>{DOW[dow(d.iso)]}</span>
                    {Number(d.iso.slice(8))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <th scope="row">{who.name(r.employeeId)}</th>
                  {r.cells.map((c) => {
                    const sh = shift(c.shiftId);
                    const tone = c.kind === "shift" ? "shift"
                      : c.kind === "rest" ? "rest"
                        : c.pending ? "waiting" : "booked";
                    const label = c.kind === "shift" && sh !== undefined
                      ? `${sh.label}, ${sh.hours}` : c.kind === "rest"
                        ? "Rest day" : c.pending ? "Leave, waiting"
                          : "Leave";
                    return (
                      <td key={c.date} data-tone={tone} title={label}>
                        <span className="visually-hidden">{label}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={s.after}>
        <h2 className={s.sectionTitle}>Shifts</h2>
        <ul className={s.shiftGrid}>
          {t.shifts.map((x) => (
            <li key={x.id} className={s.shiftCard}>
              <strong>{x.label}</strong>
              <span>{x.hours}</span>
              <span className={s.muted}>Break: {x.breakText}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

interface Week {
  id: string;
  from: string;
  to: string;
  draft: boolean;
}

function weeksOf(t: TimeData): Week[] {
  const days = t.rosterDays;
  return [0, 7].filter((i) => days[i] !== undefined).map((i) => ({
    id: `roster-${days[i]?.iso ?? ""}`, from: days[i]?.iso ?? "",
    to: days[i + 6]?.iso ?? "", draft: days[i]?.status === "draft" }));
}

/** T21, Roster planning: week by week, with the engine's checks (LF). */
export function Plan() {
  const t = useTimeData();
  const { state, dispatch } = useDemo();
  const who = useWho();
  const toast = useToast();
  const inWeek = (w: Week, d: string): boolean => w.from <= d && d <= w.to;
  const publish = (w: Week) => (): void => {
    dispatch({ type: "time-decide", id: w.id, verdict: "accept",
      by: who.me });
    toast.show("Week published to the team.",
      () => dispatch({ type: "time-undo", id: w.id }));
  };
  return (
    <FilterList title="Roster planning"
      lede="Each week's roster, and what the checks found."
      rows={weeksOf(t)} rowKey={(w) => w.id}
      columns={[
        { key: "w", label: "Week", render: (w) =>
          rangeText(w.from, w.to, who.lang) },
        { key: "s", label: "Status", render: (w) => {
          const made = state.timeDecided[w.id];
          return made !== undefined ? (
            <Status tone="done">Published</Status>
          ) : w.draft ? <Status tone="warn">Draft</Status>
            : <Status tone="ok">Published</Status>;
        } },
        { key: "p", label: "On a shift", end: true, render: (w) =>
          plural(t.roster.filter((r) => r.cells.some((c) =>
            c.kind === "shift" && inWeek(w, c.date))).length, "person",
          "people") },
        { key: "l", label: "Leave days", end: true, render: (w) =>
          String(t.roster.reduce((n, r) => n + r.cells.filter((c) =>
            c.kind === "leave" && inWeek(w, c.date)).length, 0)) },
        { key: "c", label: "Checks", end: true, render: (w) => {
          const n = t.rosterChecks.filter((c) => c.dates.some((d) =>
            inWeek(w, d))).length;
          return n === 0 ? "Nothing to flag" : plural(n, "flag", "flags");
        } },
        { key: "a", label: "Action", end: true, render: (w) => {
          const made = state.timeDecided[w.id];
          if (made !== undefined) {
            return (
              <span className={s.inline}>
                <span className={`${s.muted} ${s.wrap}`}>
                  Published by {who.name(made.by)}, {who.jobOf(made.by)},
                  {" "}{dayText(t.asOf, who.lang)}
                </span>
                <button type="button" className={`${b.btn} ${b.quiet} `
                  + s.rowBtn} onClick={() => dispatch({ type: "time-undo",
                    id: w.id })}>Undo</button>
              </span>
            );
          }
          return w.draft ? (
            <button type="button" className={`${b.btn} ${b.primary} `
              + s.rowBtn} onClick={publish(w)}>Publish week</button>
          ) : null;
        } },
      ]}
      empty="No roster has been planned yet." />
  );
}
