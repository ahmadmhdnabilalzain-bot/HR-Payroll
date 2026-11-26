import { useState } from "react";
import { hrefOf } from "../../demo/route";
import { askRows, waitingFor, type AskRow, type AskNow }
  from "../../demo/files-state";
import { useDemo } from "../../demo/state";
import { Outside, Status } from "../../people/team/common";
import { useActor, useNames } from "../../people/files/common";
import f from "../../people/files/files.module.css";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import {
  ApprovalForm,
  FilterList,
  KeyValues,
  RecordTabs,
} from "../../ui/templates";
import { M } from "./words";
import { signTab } from "../../people/esign/Sign";

const W = M.encash;
const LIST = hrefOf("time-off", "more", "encash");
const WORD: Record<AskNow, [string, "ok" | "warn" | "open" | "plain"]> = {
  "waiting-hr": [W.waitingHr, "warn"], "waiting-gm": [W.waitingGm, "open"],
  "signed-off": [W.signedOff, "ok"], declined: [W.declined, "plain"] };

/** Requests this role may see: all for HR and the GM, own for staff. */
function useRows(): AskRow[] {
  const { data, state } = useDemo();
  const me = useActor();
  const all = askRows(data.files.leave.seeds(), state, "encash");
  return state.role === "employee" ? all.filter((r) =>
    r.employeeId === me.id) : all;
}

/** T05: leave encashment: asked, signed off by HR, then the GM. */
export function Encash(p: { rest: string[] }) {
  const { data, state } = useDemo();
  const rows = useRows();
  const names = useNames();
  const [open, setOpen] = useState(false);
  if (p.rest[0] !== undefined) {
    const row = rows.find((r) => r.id === p.rest[0]);
    return row === undefined ? <Outside /> : <EncashRecord row={row} />;
  }
  const quote = (r: AskRow) => data.files.leave.quote(r.employeeId,
    Number(r.values["halves"]));
  return (
    <>
      <FilterList title={W.title} lede={W.lede} rows={rows}
        rowKey={(r) => r.id} searchText={(r) => names.name(r.employeeId)}
        rowHref={(r) => hrefOf("time-off", "more", "encash", r.id)}
        segments={[
          { id: "all", label: W.all, match: () => true },
          { id: "todo", label: W.toDo, match: (r) =>
            waitingFor([r], state.role) > 0 },
        ]}
        columns={[
          { key: "p", label: W.person, render: (r) => (
            <span className={f.stack}><span>{names.name(r.employeeId)}</span>
              <small>{names.day(r.raisedOn)}</small></span>) },
          { key: "d", label: W.days, end: true, render: (r) =>
            String(Number(r.values["halves"]) / 2) },
          { key: "a", label: W.amount, end: true, render: (r) => (
            <Money value={quote(r).amount} size="sm" />) },
          { key: "s", label: W.status, render: (r) => {
            const [word, tone] = WORD[r.now];
            return <Status tone={tone}>{word}</Status>;
          } },
        ]}
        empty={W.empty}
        actions={state.role === "gm" ? undefined : (
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>{W.button}</button>)} />
      <Ask key={state.nextFile} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Ask(p: { open: boolean; onClose(): void }) {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const me = useActor();
  const names = useNames();
  const can = data.files.leave.encashable().filter((x) =>
    state.role === "employee" ? x.employeeId === me.id : true);
  const hr = data.people.personas().hrId;
  const gm = data.people.personas().gmId;
  return (
    <ApprovalForm open={p.open} title={W.button} submitLabel={W.submit}
      maker={names.name(me.id)}
      checker={`${names.name(hr)}, then ${names.name(gm)}`}
      onClose={p.onClose}
      fields={[
        { key: "who", label: W.person, kind: "select", required: true,
          options: can.map((x) => ({ value: x.employeeId,
            label: `${x.name}, ${W.left(x.availableDays)}` })),
          initial: can[0]?.employeeId ?? "" },
        { key: "days", label: W.days, kind: "number", required: true,
          help: W.daysHelp, initial: "1" },
      ]}
      onSubmit={(v) => {
        const who = v["who"] ?? "";
        const halves = Math.round(Number(v["days"]) * 2);
        const q = data.files.leave.quote(who, halves);
        if (!q.ok) return q.message;
        const open = askRows(data.files.leave.seeds(), state, "encash")
          .filter((r) => r.employeeId === who && r.now !== "declined")
          .reduce((n, r) => n + Number(r.values["halves"]), 0);
        const left = data.files.leave.encashable().find((x) =>
          x.employeeId === who)?.availableHalves ?? 0;
        if (open + halves > left) return W.already(open / 2);
        dispatch({ type: "files", op: { op: "ask-new", draft: { ...me.who,
          kind: "encash", employeeId: who,
          values: { halves: String(halves) } } } });
        if (state.role === "hr") {
          dispatch({ type: "files", op: { op: "ask-step",
            id: `ask-new-${state.nextFile}`, step: { ...me.who,
              stage: "hr", verdict: "signed-off" } } });
        }
        toast.show(W.sent);
        return null;
      }} />
  );
}

function EncashRecord(p: { row: AskRow }) {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const me = useActor();
  const names = useNames();
  const { row } = p;
  const halves = Number(row.values["halves"]);
  const q = data.files.leave.quote(row.employeeId, halves);
  const person = data.files.leave.encashable().find((x) =>
    x.employeeId === row.employeeId);
  const [word, tone] = WORD[row.now];
  const mayAct = waitingFor([row], state.role) > 0;
  const step = (verdict: "signed-off" | "declined"): void => {
    dispatch({ type: "files", op: { op: "ask-step", id: row.id,
      step: { ...me.who, stage: state.role === "gm" ? "gm" : "hr",
        verdict } } });
    toast.show(verdict === "declined" ? W.no : W.done, () => dispatch({
      type: "files", op: { op: "ask-unstep", id: row.id } }));
  };
  const last = row.steps[row.steps.length - 1];
  const mayUndo = last !== undefined && last.role !== null &&
    last.by === me.id;
  return (
    <RecordTabs title={names.name(row.employeeId)}
      lede={names.title(row.employeeId)}
      back={{ label: W.back, href: LIST }}
      stats={[{ label: W.days, value: String(halves / 2) },
        { label: W.amount, value: <Money value={q.amount} /> },
        { label: W.status, value: word }]}
      actions={mayAct ? (
        <>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => step("signed-off")}>
            {state.role === "hr" ? W.signHr : W.signGm}</button>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => step("declined")}>{W.decline}</button>
        </>) : mayUndo ? (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => { dispatch({ type: "files", op: { op: "ask-unstep",
            id: row.id } }); toast.show(W.undone); }}>{W.undo}</button>
      ) : undefined}
      tabs={[
        { id: "steps", label: W.steps, render: () => {
          const hr = row.steps.find((x) => x.stage === "hr");
          const gm = row.steps.find((x) => x.stage === "gm");
          const line = (s: typeof hr): string => s === undefined ? W.notYet
            : `${s.verdict === "declined" ? W.declined : W.signedOff} by ${
              names.by(s.by, s.on)}`;
          return (
            <KeyValues items={[
              { label: W.requested, value: `${names.by(row.raisedBy,
                row.raisedOn)}` },
              { label: W.hrStep, value: line(hr) },
              { label: W.gmStep, value: line(gm) },
              { label: W.status, value: <Status tone={tone}>{word}</Status> },
            ]} />);
        } },
        { id: "working", label: W.workings, render: () => (
          <div className={f.panel}>
            <KeyValues items={[
              { label: W.perDay, value: <Money value={q.rate} /> },
              { label: W.days, value: String(halves / 2) },
              { label: W.amount, value: <Money value={q.amount} /> },
              { label: W.afterwards, value: person === undefined ? ""
                : String(person.availableDays - halves / 2) }]} />
            <p className={f.hint}>{data.files.leave.encashNote}</p>
          </div>) },
        signTab(`encash:${row.id}`),
      ]} />
  );
}
