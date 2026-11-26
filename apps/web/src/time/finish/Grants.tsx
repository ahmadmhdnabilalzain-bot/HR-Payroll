import { useState } from "react";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { dayText } from "../../people/words";
import { Status, Stack } from "../../people/papers/Status";
import type { Tone } from "../../people/papers/words";
import s from "../../people/team/team.module.css";
import b from "../../ui/button.module.css";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { F, fill } from "./words";

const W = F.grants;

type Now = "waiting" | "signed" | "declined";
const TONE: Record<Now, Tone> = { waiting: "warn", signed: "ok",
  declined: "quiet" };

interface Row {
  id: string;
  name: string;
  title: string;
  days: number;
  reason: string;
  now: Now;
  by: string;
  /** Set for a grant made in this visit. */
  approvalId: string | null;
  grantId: string | null;
  makerId: string;
  checkerId: string;
}

/**
 * T07, Leave grants: one-off extra leave days given by the General
 * manager. HR sends a grant; the General manager signs it off or
 * declines it (also from Home's inbox). A grant is recorded here and
 * does not change the annual leave balance.
 */
export function Grants() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const me = personFor(data, state.role);
  const { hrId, gmId } = data.people.personas();
  const nameOf = (id: string): string => data.people.person(id)?.name.en
    ?? id;
  const titleOf = (id: string): string => data.people.person(id)?.role.en
    ?? "";
  const old: Row[] = data.finish.grants().map((g) => ({ id: g.id,
    name: g.name, title: g.title, days: g.days, reason: g.reason,
    now: "signed", by: g.display.by, approvalId: null, grantId: null,
    makerId: g.requestedById, checkerId: g.signedOffById }));
  const made: Row[] = state.grants.filter((g) => !g.withdrawn).map((g) => {
    const v = state.decided[g.approvalId];
    const now: Now = v === undefined ? "waiting"
      : v === "approve" ? "signed" : "declined";
    return { id: g.id, name: nameOf(g.employeeId),
      title: titleOf(g.employeeId), days: g.days, reason: g.reason, now,
      by: fill(W.by, { who: nameOf(g.makerId),
        date: dayText(g.requestedOn, "en") }), approvalId: g.approvalId,
      grantId: g.id, makerId: g.makerId, checkerId: g.checkerId };
  });
  const rows = [...made, ...old];
  const word = (r: Row): string => r.now === "waiting"
    ? fill(W.waitingFor, { name: nameOf(r.checkerId) })
    : r.now === "signed" ? W.signedOff : W.declined;
  const decide = (r: Row, v: "approve" | "decline"): void => {
    dispatch({ type: "decide", id: r.approvalId!, verdict: v });
    toast.show(fill(v === "approve" ? W.signedToast : W.declinedToast,
      { name: r.name }),
    () => dispatch({ type: "undecide", id: r.approvalId! }));
  };
  const takeBack = (r: Row): void => {
    dispatch({ type: "finish-grant-withdraw", id: r.grantId! });
    toast.show(W.taken, () => dispatch({ type: "finish-grant-restore",
      id: r.grantId! }));
  };
  const btn = (label: string, who: string, kind: "secondary" | "quiet",
    go: () => void) => (
    <button type="button" className={`${b.btn} ${b[kind]} ${s.tall}`}
      aria-label={`${label}: ${who}`} onClick={go}>{label}</button>);
  return (
    <>
      <FilterList title={W.title} lede={W.lede} rows={rows}
        rowKey={(r) => r.id} searchText={(r) => `${r.name} ${r.reason}`}
        segments={[
          { id: "all", label: W.all, match: () => true },
          { id: "wait", label: W.waiting, match: (r) => r.now === "waiting" },
          { id: "signed", label: W.signed, match: (r) => r.now === "signed" },
        ]}
        columns={[
          { key: "p", label: W.person, render: (r) => (
            <Stack main={r.name} sub={r.title} />) },
          { key: "d", label: W.days, render: (r) => String(r.days) },
          { key: "w", label: W.why, render: (r) => (
            <Stack main={r.reason} sub={r.by} />) },
          { key: "s", label: W.status, render: (r) => (
            <Status word={word(r)} tone={TONE[r.now]} />) },
          { key: "x", label: "", end: true, render: (r) => {
            if (r.approvalId === null) return null;
            if (r.now === "waiting") {
              return r.checkerId === me ? (
                <span className={s.btnRow}>
                  {btn(W.signOff, r.name, "secondary",
                    () => decide(r, "approve"))}
                  {btn(W.decline, r.name, "quiet",
                    () => decide(r, "decline"))}
                </span>) : r.makerId === me
                ? btn(W.takeBack, r.name, "quiet", () => takeBack(r))
                : null;
            }
            return r.checkerId === me
              ? btn(W.undo, r.name, "quiet", () => dispatch({
                type: "undecide", id: r.approvalId! })) : null;
          } },
        ]}
        empty={W.empty}
        actions={state.role !== "hr" ? undefined : (
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>{W.add}</button>)} />
      <section className={s.after}>
        <p className={s.note}>{data.finish.grantNote}</p>
      </section>
      <ApprovalForm key={state.nextFinish} open={open} title={W.form}
        maker={nameOf(hrId)} checker={nameOf(gmId)}
        submitLabel={W.submit} onClose={() => setOpen(false)}
        fields={[
          { key: "who", label: W.personField, kind: "select",
            required: true, options: data.finish.grantPeople().map((p) => ({
              value: p.id, label: `${p.name}, ${p.title}` })),
            initial: data.finish.grantPeople()[0]?.id ?? "" },
          { key: "days", label: W.daysField, kind: "number", required: true,
            initial: "1" },
          { key: "why", label: W.reasonField, kind: "textarea",
            required: true, help: W.reasonHelp },
        ]}
        onSubmit={(v) => {
          const [who, days, why] = [v["who"] ?? "", Number(v["days"] ?? 0),
            (v["why"] ?? "").trim()];
          const err = data.finish.checkGrant(who, days, why);
          if (err !== null) return err;
          dispatch({ type: "finish-grant", draft: { employeeId: who, days,
            reason: why, makerId: me, checkerId: gmId,
            requestedOn: data.people.asOf } });
          toast.show(fill(W.sent, { name: nameOf(gmId) }));
          return null;
        }} />
    </>
  );
}
