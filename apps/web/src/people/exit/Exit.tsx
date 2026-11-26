import { useState } from "react";
import type { ExitInterview } from "../../demo/data/files-types";
import { hrefOf } from "../../demo/route";
import { useDemo, type DemoState } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import t from "../../ui/templates/templates.module.css";
import { Outside, Status } from "../team/common";
import { Field, SheetForm, useActor, useNames } from "../files/common";
import f from "../files/files.module.css";
import { X } from "./words";

const LIST = hrefOf("people", "exit");

/** One interview as the screens read it: the sample's or a planned one. */
export interface ExitRow { id: string; employeeId: string; on: string;
  held: boolean; planned: boolean; reasonId: string | null;
  lastDay: string | null; note: string; answersKept: boolean }

export function exitRows(interviews: ExitInterview[], s: DemoState)
  : ExitRow[] {
  const plans = s.exitPlans.map((p): ExitRow => ({ id: p.id,
    employeeId: p.employeeId, on: p.plannedOn,
    held: s.exitForms[p.id] !== undefined, planned: true,
    reasonId: s.exitForms[p.id]?.reasonId ?? null, lastDay: null,
    note: "", answersKept: s.exitForms[p.id] !== undefined }));
  const base = interviews.map((i): ExitRow => ({ id: i.id,
    employeeId: i.employeeId, on: i.on.iso, held: i.held, planned: false,
    reasonId: i.reasonId, lastDay: i.lastWorkingDay.iso,
    note: i.reasonNote, answersKept: i.answersKept }));
  return [...plans, ...base];
}

/** P17: exit interviews, planned and held, and why people leave. */
export function Exit(p: { rest: string[] }) {
  const { data, state } = useDemo();
  const names = useNames();
  const rows = exitRows(data.files.exit.interviews(), state);
  if (p.rest[0] !== undefined) {
    const row = rows.find((r) => r.id === p.rest[0]);
    return row === undefined ? <Outside /> : <ExitRecord row={row} />;
  }
  const reasonOf = (id: string | null): string =>
    data.files.exit.reasons.find((r) => r.id === id)?.label ?? "";
  const held = rows.filter((r) => r.held);
  const counts = data.files.exit.reasons.map((r) => ({ r,
    n: held.filter((x) => x.reasonId === r.id).length }))
    .filter((x) => x.n > 0);
  return (
    <>
      <FilterList title={X.title} lede={X.lede} rows={rows}
        rowKey={(r) => r.id} searchText={(r) => names.name(r.employeeId)}
        rowHref={(r) => hrefOf("people", "exit", r.id)}
        segments={[
          { id: "all", label: X.all, match: () => true },
          { id: "planned", label: X.planned, match: (r) => !r.held },
          { id: "held", label: X.held, match: (r) => r.held },
        ]}
        columns={[
          { key: "p", label: X.person, render: (r) => (
            <span className={f.stack}>
              <span>{names.name(r.employeeId)}</span>
              <small>{names.title(r.employeeId)}</small>
            </span>) },
          { key: "d", label: X.interview, render: (r) =>
            `${r.held ? X.heldOn : X.plannedOn} ${names.day(r.on)}` },
          { key: "r", label: X.reason, render: (r) =>
            reasonOf(r.reasonId) || X.notYet },
          { key: "s", label: X.status, render: (r) => (
            <Status tone={r.held ? "ok" : "open"}>
              {r.held ? X.held : X.planned}</Status>) },
        ]}
        empty={X.empty}
        actions={state.role === "hr" ? <Schedule /> : undefined} />
      <section className={f.after} aria-label={X.summary}>
        <h2 className={f.title}>{X.summary}</h2>
        {counts.length === 0 ? <p className={f.hint}>{X.noSummary}</p> : (
          <ul className={f.group}>
            {counts.map((x) => (
              <li key={x.r.id}><span>{x.r.label}</span>
                <span className={f.value}>{x.n}</span></li>))}
          </ul>)}
        <p className={f.hint}>{X.basis(held.length)}</p>
      </section>
    </>
  );
}

function Schedule() {
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const me = useActor();
  const names = useNames();
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState("");
  const [on, setOn] = useState("");
  const people = data.files.exit.candidates();
  return (
    <>
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={() => { setWho(people[0]?.id ?? ""); setOn(data.files.asOf);
          setOpen(true); }}>{X.schedule}</button>
      <SheetForm open={open} title={X.schedule} submitLabel={X.scheduleGo}
        onClose={() => setOpen(false)} note={X.scheduleNote}
        onSubmit={() => {
          if (who === "" || on === "") return X.needBoth;
          if (on < data.files.asOf) return X.notPast;
          dispatch({ type: "files", op: { op: "exit-plan", employeeId: who,
            plannedOn: on, who: me.who } });
          toast.show(X.scheduled(names.name(who)));
          return null;
        }}>
        <Field label={X.person}>
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            {people.map((x) => (
              <option key={x.id} value={x.id}>{x.name}, {x.title}</option>))}
          </select>
        </Field>
        <Field label={X.when}>
          <input type="date" value={on} min={data.files.asOf}
            onChange={(e) => setOn(e.target.value)} />
        </Field>
      </SheetForm>
    </>
  );
}

function ExitRecord(p: { row: ExitRow }) {
  const { data, state, dispatch } = useDemo();
  const names = useNames();
  const toast = useToast();
  const me = useActor();
  const { row } = p;
  const x = data.files.exit;
  const form = state.exitForms[row.id];
  const reasonId = form?.reasonId ?? row.reasonId;
  const reason = x.reasons.find((r) => r.id === reasonId)?.label ?? X.notYet;
  const [pick, setPick] = useState(x.reasons[0]?.id ?? "");
  const [rate, setRate] = useState<Record<string, number>>(
    Object.fromEntries(x.questions.map((q) => [q.id, 3])));
  const [comment, setComment] = useState("");
  const mayFill = state.role === "hr" && !row.held;
  const save = (): void => {
    dispatch({ type: "files", op: { op: "exit-record", id: row.id,
      form: { ...me.who, reasonId: pick, ratings: rate, comment } } });
    toast.show(X.saved, () => dispatch({ type: "files",
      op: { op: "exit-unrecord", id: row.id } }));
  };
  return (
    <RecordTabs title={names.name(row.employeeId)}
      back={{ label: X.title, href: LIST }}
      lede={names.title(row.employeeId)}
      stats={[
        { label: X.interview, value: `${row.held ? X.heldOn : X.plannedOn}
          ${names.day(row.on)}` },
        { label: X.status, value: row.held ? X.held : X.planned },
        { label: X.reason, value: reason }]}
      actions={form !== undefined && row.planned && state.role === "hr" ? (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => dispatch({ type: "files",
            op: { op: "exit-unrecord", id: row.id } })}>{X.reopen}</button>
      ) : undefined}
      tabs={[
        { id: "form", label: X.form, render: () => form !== undefined ? (
          <div className={f.panel}>
            <KeyValues items={[
              { label: X.mainReason, value: reason },
              ...x.questions.map((q) => ({ label: q.label,
                value: `${form.ratings[q.id] ?? 0} of 5` })),
              { label: X.comment, value: form.comment === "" ? X.none
                : form.comment },
              { label: X.heldBy, value: names.by(form.by, form.on) }]} />
          </div>
        ) : row.held ? (
          <div className={f.panel}>
            <KeyValues items={[
              { label: X.mainReason, value: reason },
              { label: X.fromRecord, value: row.note },
              { label: X.heldBy, value: names.by(
                data.people.personas().hrId, row.on) }]} />
            <p className={f.hint}>{X.sampleKept}</p>
          </div>
        ) : mayFill ? (
          <form className={`${t.form} ${f.panel}`} onSubmit={(e) => {
            e.preventDefault(); save(); }}>
            <Field label={X.mainReason}>
              <select value={pick} onChange={(e) => setPick(e.target.value)}>
                {x.reasons.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>))}
              </select>
            </Field>
            {x.questions.map((q) => (
              <Field key={q.id} label={q.label} help={x.scale}>
                <select value={rate[q.id]} onChange={(e) => setRate({ ...rate,
                  [q.id]: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>))}
                </select>
              </Field>))}
            <Field label={X.comment}>
              <textarea rows={3} value={comment}
                onChange={(e) => setComment(e.target.value)} />
            </Field>
            <div className={t.formActions}>
              <button type="submit" className={`${b.btn} ${b.primary}`}>
                {X.save}</button>
            </div>
          </form>
        ) : <p className={f.hint}>{X.onlyHr}</p> },
        { id: "about", label: X.about, render: () => (
          <KeyValues items={[
            { label: X.person, value: <a href={hrefOf("people",
              row.employeeId)}>{names.name(row.employeeId)}</a> },
            { label: X.lastDay, value: row.lastDay === null ? X.notSet
              : names.day(row.lastDay) },
            { label: X.interviewer, value: names.name(
              data.people.personas().hrId) }]} />) },
      ]} />
  );
}
