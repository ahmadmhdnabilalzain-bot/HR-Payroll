import { useState } from "react";
import type { CoverRow } from "../../demo/data/more-types";
import type { CoverReq } from "../../demo/more-state";
import { useDemo } from "../../demo/state";
import { useMaskText } from "../../ui/mask";
import { personFor } from "../../demo/time-off";
import { Outside } from "../../shell/Outside";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { rangeText } from "../../people/words";
import { Status, type Tone } from "../../people/team/common";
import s from "../../people/team/team.module.css";
import { fill, X } from "./words";

const W = X.cover;

type Now = "none" | "waiting" | "in-place" | "declined";
const TONE: Record<Now, Tone> = { none: "plain", waiting: "warn",
  "in-place": "ok", declined: "plain" };

/**
 * H10, Approval cover: who decides leave and claims while an approver
 * is away. A cover is asked for by the approver (or by HR or the
 * General manager) and agreed by the one of those two who did not ask.
 * HR and the General manager see everyone; a manager sees their own.
 */
export function Cover() {
  const { data, state, dispatch } = useDemo();
  const mask = useMaskText();
  const toast = useToast();
  const [target, setTarget] = useState<CoverRow | null>(null);
  const role = state.role;
  const me = personFor(data, role);
  const hrId = data.people.personas().hrId;
  const gmId = data.people.personas().gmId;
  if (role !== "hr" && role !== "gm" && role !== "manager") {
    return <Outside />;
  }
  const rows = data.more.cover().filter((r) => role !== "manager" ||
    r.approverId === me);
  const nameOf = (id: string): string => data.people.person(id)?.name.en
    ?? id;
  const reqOf = (id: string): CoverReq | undefined => state.covers
    .find((x) => x.approverId === id && !x.withdrawn);
  const nowOf = (r: CoverReq | undefined): Now => {
    if (r === undefined) return "none";
    const v = state.decided[r.approvalId];
    return v === undefined ? "waiting" : v === "approve" ? "in-place"
      : "declined";
  };
  const decide = (r: CoverReq, v: "approve" | "decline"): void => {
    dispatch({ type: "decide", id: r.approvalId, verdict: v });
    toast.show(v === "approve" ? fill(W.agreed, { cover: nameOf(r.coverId),
      name: nameOf(r.approverId) }) : fill(W.declinedToast,
      { name: nameOf(r.approverId) }),
    () => dispatch({ type: "undecide", id: r.approvalId }));
  };
  const takeBack = (r: CoverReq): void => {
    dispatch({ type: "more-cover-withdraw", id: r.id });
    toast.show(W.taken, () => dispatch({ type: "more-cover-restore",
      id: r.id }));
  };
  const checkerFor = (): string => role === "hr" ? gmId : hrId;
  return (
    <>
      <FilterList title={W.title} lede={W.lede} rows={rows}
        rowKey={(r) => r.approverId}
        searchText={(r) => `${r.name} ${r.title}`}
        segments={[
          { id: "all", label: W.all, match: () => true },
          { id: "open", label: W.open, match: (r) =>
            nowOf(reqOf(r.approverId)) === "waiting" },
          { id: "on", label: W.active, match: (r) =>
            nowOf(reqOf(r.approverId)) === "in-place" },
        ]}
        columns={[
          { key: "a", label: W.approver, render: (r) => (
            <span className={s.name}>
              <span>{r.name}</span>
              <span className={s.sub}>{mask(r.decides)}</span>
              {r.away !== null && (
                <span className={s.sub}>{fill(W.away, { range: rangeText(
                  r.away.from.iso, r.away.to.iso, "en") })}</span>)}
            </span>) },
          { key: "c", label: W.cover, render: (r) => {
            const q = reqOf(r.approverId);
            const now = nowOf(q);
            return q === undefined ? (
              <span className={s.name}>
                <span>{W.none}</span>
                <span className={s.sub}>{fill(W.suggested,
                  { name: r.suggested.name })}</span>
              </span>) : (
              <span className={s.name}>
                <span>{nameOf(q.coverId)}, {rangeText(q.from, q.to,
                  "en")}</span>
                <Status tone={TONE[now]}>{now === "waiting"
                  ? fill(W.waiting, { who: nameOf(q.checkerId) })
                  : now === "in-place" ? W.inPlace : W.declined}</Status>
                <span className={s.sub}>{fill(W.by, { who: nameOf(
                  q.makerId), date: rangeText(q.requestedOn,
                  q.requestedOn, "en") })}</span>
              </span>);
          } },
          { key: "x", label: "", end: true, render: (r) => {
            const q = reqOf(r.approverId);
            const now = nowOf(q);
            const set = (label: string) => (
              <button type="button"
                className={`${b.btn} ${b.secondary} ${s.tall}`}
                aria-label={`${label}: ${r.name}`}
                onClick={() => setTarget(r)}>{label}</button>);
            if (q === undefined || now === "declined") return set(W.set);
            if (now === "waiting") {
              return q.checkerId === me ? (
                <span className={s.btnRow}>
                  <button type="button"
                    className={`${b.btn} ${b.secondary} ${s.tall}`}
                    aria-label={`${W.agree}: ${r.name}`}
                    onClick={() => decide(q, "approve")}>{W.agree}
                  </button>
                  <button type="button"
                    className={`${b.btn} ${b.quiet} ${s.tall}`}
                    aria-label={`${W.decline}: ${r.name}`}
                    onClick={() => decide(q, "decline")}>{W.decline}
                  </button>
                </span>) : (
                <button type="button"
                  className={`${b.btn} ${b.quiet} ${s.tall}`}
                  aria-label={`${W.takeBack}: ${r.name}`}
                  onClick={() => takeBack(q)}>{W.takeBack}</button>);
            }
            return q.checkerId === me ? (
              <button type="button"
                className={`${b.btn} ${b.quiet} ${s.tall}`}
                aria-label={`${W.undo}: ${r.name}`}
                onClick={() => dispatch({ type: "undecide",
                  id: q.approvalId })}>{W.undo}</button>) : set(W.change);
          } },
        ]}
        empty={W.empty} />
      <section className={s.after}>
        <p className={s.note}>{data.more.coverPayRunNote}</p>
      </section>
      {target !== null && (
        <ApprovalForm open title={fill(W.form, { name: target.name })}
          maker={nameOf(me)} checker={nameOf(checkerFor())}
          submitLabel={W.submit} onClose={() => setTarget(null)}
          fields={[
            { key: "cover", label: W.coverField, kind: "select",
              required: true, initial: target.suggested.id,
              options: target.candidates.map((c) => ({ value: c.id,
                label: `${c.name}, ${c.title}` })) },
            { key: "from", label: W.from, kind: "date", required: true,
              initial: target.away?.from.iso ?? "" },
            { key: "to", label: W.to, kind: "date", required: true,
              initial: target.away?.to.iso ?? "" },
          ]}
          onSubmit={(v) => {
            const [cv, from, to] = [v["cover"] ?? "", v["from"] ?? "",
              v["to"] ?? ""];
            const err = data.more.checkCover(target.approverId, cv, from, to);
            if (err !== null) return err;
            if (state.covers.some((x) => x.approverId === target.approverId &&
              !x.withdrawn && state.decided[x.approvalId] !== "decline" &&
              x.from <= to && from <= x.to)) return W.overlap;
            dispatch({ type: "more-cover", draft: { approverId:
              target.approverId, coverId: cv, from, to, makerId: me,
            checkerId: checkerFor(), requestedOn: data.people.asOf } });
            toast.show(fill(W.sent, { name: nameOf(checkerFor()) }));
            return null;
          }} />)}
    </>
  );
}
