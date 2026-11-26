import { useState } from "react";
import { askRows, waitingFor, type AskNow, type AskRow }
  from "../../demo/files-state";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { Status } from "../../people/team/common";
import { useActor, useNames } from "../../people/files/common";
import f from "../../people/files/files.module.css";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { M } from "./words";

const W = M.fix;

interface Line { id: string; employeeId: string; dayIso: string;
  day: string; was: string; now: "to-check" | AskNow;
  ask: AskRow | null; worth: bigint | null }

/** T11: attendance corrections, proposed by HR and signed off by the GM. */
export function Corrections() {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const me = useActor();
  const names = useNames();
  const [open, setOpen] = useState(false);
  const [pre, setPre] = useState<{ who: string; day: string } | null>(null);
  const asks = askRows([], state, "correction");
  const days = data.files.clock.checkDays();
  const asked = new Set(asks.map((a) => `${a.values["employeeId"]}|${
    a.values["day"]}`));
  const lines: Line[] = [
    ...asks.map((a): Line => ({ id: a.id, employeeId: a.employeeId,
      dayIso: a.values["day"] ?? "", day: names.day(a.values["day"] ?? ""),
      was: a.values["to"] ?? "", now: a.now, ask: a, worth: null })),
    ...days.filter((d) => !asked.has(d.id)).map((d): Line => ({ id: d.id,
      employeeId: d.employeeId, dayIso: d.date.iso, day: d.date.display,
      was: `${d.was}. ${d.clock}`, now: "to-check", ask: null,
      worth: d.dayValue })),
  ];
  const hr = data.people.personas().hrId;
  const gm = data.people.personas().gmId;
  const people = data.people.people().filter((x) => x.status !== "left" &&
    x.status !== "joining");
  const step = (a: AskRow, verdict: "signed-off" | "declined"): void => {
    dispatch({ type: "files", op: { op: "ask-step", id: a.id,
      step: { ...me.who, stage: "gm", verdict } } });
    toast.show(verdict === "declined" ? W.no : W.done, () => dispatch({
      type: "files", op: { op: "ask-unstep", id: a.id } }));
  };
  const word = (l: Line): [string, "ok" | "warn" | "open" | "plain"] =>
    l.now === "to-check" ? [W.toCheck, "warn"]
      : l.now === "signed-off" ? [W.signedOff, "ok"]
        : l.now === "declined" ? [W.declined, "plain"] : [W.waiting, "open"];
  return (
    <>
      <FilterList title={W.title} lede={`${W.lede} ${W.hint}`} rows={lines}
        rowKey={(l) => l.id} searchText={(l) => names.name(l.employeeId)}
        segments={[
          { id: "all", label: W.all, match: () => true },
          { id: "check", label: W.check, match: (l) => l.now === "to-check" },
          { id: "asked", label: W.asked, match: (l) => l.ask !== null },
        ]}
        columns={[
          { key: "p", label: W.person, render: (l) => (
            <span className={f.stack}><span>{names.name(l.employeeId)}</span>
              <small>{l.day}</small></span>) },
          { key: "w", label: W.was, render: (l) => l.was },
          { key: "v", label: W.worth, end: true, render: (l) =>
            l.worth === null ? "" : <Money value={data.files.leave.rate(
              l.employeeId)} size="sm" /> },
          { key: "s", label: W.status, render: (l) => {
            const [text, tone] = word(l);
            return <Status tone={tone}>{text}</Status>;
          } },
          { key: "a", label: "Action", render: (l) => l.ask !== null
            ? (waitingFor([l.ask], state.role) > 0 ? (
              <span className={f.row}>
                <button type="button" className={`${b.btn} ${b.primary}`}
                  onClick={() => step(l.ask!, "signed-off")}>
                  {W.signOff}</button>
                <button type="button" className={`${b.btn} ${b.quiet}`}
                  onClick={() => step(l.ask!, "declined")}>
                  {W.decline}</button>
              </span>) : l.now === "waiting-gm" || l.now === "waiting-hr"
                ? <span className={f.row}>{`Waiting for ${names.name(
                  l.now === "waiting-gm" ? gm : hr)}`}</span> : null)
            : state.role === "hr" ? (
              <button type="button" className={`${b.btn} ${b.secondary}`}
                onClick={() => { setPre({ who: l.employeeId,
                  day: l.dayIso }); setOpen(true); }}>{W.correct}</button>)
              : null },
        ]}
        empty={W.empty}
        actions={state.role === "hr" ? (
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => { setPre(null); setOpen(true); }}>
            {W.button}</button>) : undefined} />
      <ApprovalForm key={`${pre?.who}${pre?.day}${state.nextFile}`}
        open={open} title={W.button} maker={names.name(hr)}
        checker={names.name(gm)} submitLabel={W.submit}
        onClose={() => setOpen(false)}
        fields={[
          { key: "who", label: W.person, kind: "select", required: true,
            options: people.map((x) => ({ value: x.id,
              label: x.name[lang] })),
            initial: pre?.who ?? people[0]?.id ?? "" },
          { key: "day", label: W.day, kind: "date", required: true,
            initial: pre?.day ?? "" },
          { key: "to", label: W.newState, kind: "select", required: true,
            options: data.files.clock.statuses.map((x) => ({ value: x,
              label: x })), initial: data.files.clock.statuses[0] ?? "" },
          { key: "in", label: W.clockIn, kind: "text", initial: "08:00" },
          { key: "out", label: W.clockOut, kind: "text",
            initial: "17:00" },
          { key: "why", label: W.reason, kind: "textarea", required: true },
        ]}
        onSubmit={(v) => {
          const day = v["day"] ?? "";
          if (!day.startsWith("2026-10")) return W.notOct;
          const who = v["who"] ?? "";
          dispatch({ type: "files", op: { op: "ask-new", draft: { ...me.who,
            kind: "correction", employeeId: who, values: { day,
              to: v["to"] ?? "", in: v["in"] ?? "", out: v["out"] ?? "",
              why: v["why"] ?? "" } } } });
          dispatch({ type: "files", op: { op: "ask-step",
            id: `ask-new-${state.nextFile}`, step: { ...me.who,
              stage: "hr", verdict: "signed-off" } } });
          toast.show(W.sent);
          return null;
        }} />
    </>
  );
}
