import { useDemo } from "../demo/state";
import type { TimeData } from "../demo/data/time-types";
import { dayText, rangeText } from "../people/words";
import b from "../ui/button.module.css";
import { useToast } from "../ui/Toast";
import { FilterList, PageHead, StatusPill } from "../ui/templates";
import tpl from "../ui/templates/templates.module.css";
import { Status, useTimeData, useWho } from "./shared";
import s from "./time.module.css";
import { plural } from "./words";
import { Footnote } from "../components/explain";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const dow = (iso: string): number => new Date(`${iso}T00:00:00Z`)
  .getUTCDay();

/** Short letters for the shifts: initials, longer only when two clash. */
function lettersOf(shifts: { id: string; label: string }[]):
  Map<string, string> {
  const out = new Map<string, string>();
  const used = new Set<string>();
  for (const x of shifts) {
    const words = x.label.split(/\s+/).filter(Boolean);
    const tries = [words[0]?.[0] ?? "?",
      words.map((w) => w[0]).join("").slice(0, 2),
      x.label.slice(0, 2), x.id.slice(-2)].map((w) => w.toUpperCase());
    const pick = tries.find((w) => !used.has(w)) ?? x.id;
    used.add(pick);
    out.set(x.id, pick);
  }
  return out;
}

/**
 * T20, Shifts and rosters: the two planned weeks by person. Names down
 * the side (they stay put while the days scroll), 14 day columns under
 * each week's state (published or draft, as Planning decides it), a
 * shift as its short letter (the key under the lede), rest days shaded
 * and leave as a hatched cell with the word. The demo's day is marked
 * when it falls in the plan.
 */
export function Roster() {
  const t = useTimeData();
  const who = useWho();
  const { state } = useDemo();
  const rows = t.roster.filter((r) => who.visible.has(r.employeeId));
  const shift = (id: string | null) => t.shifts.find((x) => x.id === id);
  const letters = lettersOf(t.shifts);
  const first = t.rosterDays[0]?.iso ?? "";
  const last = t.rosterDays.at(-1)?.iso ?? "";
  const weeks = weeksOf(t).map((w) => ({ ...w,
    published: !w.draft || state.timeDecided[w.id] !== undefined }));
  const weekOf = (iso: string) => weeks.find((w) => w.from <= iso &&
    iso <= w.to);
  const today = t.asOf >= first && t.asOf <= last ? t.asOf : null;
  return (
    <div className={tpl.page}>
      <PageHead title="Shifts and rosters"
        lede={`${rangeText(first, last, who.lang)}. Leave is shown so ` +
          "no one is planned on it."}
        meta={(
          <ul className={s.key} aria-label="Key">
            {t.shifts.map((x) => (
              <li key={x.id}><span className={s.keyCell}>
                {letters.get(x.id)}</span>{x.label}, {x.hours}</li>
            ))}
            <li><span className={s.keyCell} data-tone="rest" />Rest day
            </li>
            <li><span className={s.keyCell} data-tone="booked">Leave
            </span>Leave, booked</li>
            <li><span className={s.keyCell} data-tone="waiting">Waiting
            </span>Leave, waiting</li>
          </ul>
        )} />
      <div className={s.gridScroll} tabIndex={0} role="region"
        aria-label="Roster, scrolls sideways">
        <table className={s.grid}>
          <colgroup>
            <col className={s.nameCol} />
            {t.rosterDays.map((d) => <col key={d.iso} />)}
          </colgroup>
          <thead>
            <tr className={s.weekRow}>
              <td />
              {weeks.map((w) => (
                <th key={w.id} scope="colgroup" colSpan={7}
                  data-draft={!w.published}>
                  <span className={s.weekText}>
                    {rangeText(w.from, w.to, who.lang)}</span>
                  {w.published ? <StatusPill tone="ok">Published</StatusPill>
                    : <StatusPill tone="warn">Draft</StatusPill>}
                </th>
              ))}
            </tr>
            <tr>
              <th scope="col"><span className="visually-hidden">Who
              </span></th>
              {t.rosterDays.map((d) => (
                <th key={d.iso} scope="col"
                  data-draft={weekOf(d.iso)?.published === false}
                  data-today={d.iso === today}
                  data-weekend={[0, 6].includes(dow(d.iso))}>
                  <span aria-hidden="true">{DOW[dow(d.iso)]}</span>
                  {Number(d.iso.slice(8))}
                  {d.iso === today && (
                    <span className="visually-hidden">, today</span>
                  )}
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
                  const shown = c.kind === "shift"
                    ? letters.get(c.shiftId ?? "") ?? ""
                    : c.kind === "leave" ? c.pending ? "Waiting" : "Leave"
                      : "";
                  return (
                    <td key={c.date} data-tone={tone} title={label}
                      data-today={c.date === today}>
                      <span aria-hidden="true">{shown}</span>
                      <span className="visually-hidden">{label}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className={s.block} aria-labelledby="shifts-title">
        <h2 id="shifts-title" className={s.sectionTitle}>Shifts</h2>
        <ul className={s.shiftGrid}>
          {t.shifts.map((x) => (
            <li key={x.id} className={s.shiftCard}>
              <strong><span className={s.keyCell}>{letters.get(x.id)}
              </span>{x.label}</strong>
              <span>{x.hours}</span>
              <span className={s.muted}>Break: {x.breakText}</span>
            </li>
          ))}
        </ul>
      </section>
      <Footnote />
    </div>
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
