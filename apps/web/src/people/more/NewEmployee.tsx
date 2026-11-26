import { useState } from "react";
import { fils } from "@payroll/engine";
import type { NewHireStart } from "../../demo/data/more-types";
import type { NewHire } from "../../demo/more-state";
import { useSwitchRole } from "../../demo/actions";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { parseAmountInput } from "../../i18n/amount-input";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { useActor } from "../moves/view";
import { Status, whoIs, type Tone } from "../team/common";
import s from "../team/team.module.css";
import { dayText } from "../words";
import { fill, M } from "./words";
import { PackLine } from "../esign/PackLine";
import { packKeyOf } from "../esign/model";

const W = M.hire;

type Now = "to-add" | "waiting" | "signed" | "declined";

interface Row {
  key: string;
  name: string;
  sub: string;
  startOn: string;
  now: Now;
  start: NewHireStart | null;
  hire: NewHire | null;
}

const TONE: Record<Now, Tone> = { "to-add": "open", waiting: "warn",
  signed: "ok", declined: "plain" };
const WORD: Record<Now, string> = { "to-add": W.toAdd, waiting: W.waiting,
  signed: W.signed, declined: W.declined };

/** P04, New employee: accepted offers and typed records, with sign-off. */
export function NewEmployee() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const actor = useActor();
  const switchRole = useSwitchRole();
  const [target, setTarget] = useState<{ start: NewHireStart | null } |
    null>(null);
  const opts = data.more.options();
  const plan = data.more.plan("");
  const gmName = data.people.person(plan.checkerId)?.name.en ?? "";
  const jobOf = (k: string): string => opts.jobs.find((j) =>
    j.jobKey === k)?.title ?? k;
  const deptOf = (id: string): string => opts.departments.find((d) =>
    d.id === id)?.text ?? id;
  const live = state.newHires.filter((h) => !h.withdrawn);
  const nowOf = (h: NewHire): Now => {
    const v = state.decided[h.approvalId];
    return v === undefined ? "waiting" : v === "approve" ? "signed"
      : "declined";
  };
  const rows: Row[] = [
    ...live.map((h): Row => ({ key: h.id, name: h.name, sub: `${jobOf(
      h.jobKey)}, ${deptOf(h.departmentId)}`, startOn: h.startOn,
    now: nowOf(h), start: null, hire: h })),
    ...data.more.starts().filter((x) => !live.some((h) =>
      h.offerId === x.offerId)).map((x): Row => ({ key: x.offerId,
      name: x.name, sub: `${x.title}, ${x.departmentText}`,
      startOn: x.startOn.iso, now: "to-add", start: x, hire: null })),
  ];
  const waiting = live.some((h) => nowOf(h) === "waiting");
  const decide = (h: NewHire, v: "approve" | "decline"): void => {
    dispatch({ type: "decide", id: h.approvalId, verdict: v });
    toast.show(fill(v === "approve" ? W.signedToast : W.declinedToast,
      { name: h.name }), () => dispatch({ type: "undecide",
      id: h.approvalId }));
  };
  const takeBack = (h: NewHire): void => {
    dispatch({ type: "more-hire-withdraw", id: h.id });
    toast.show(W.taken, () => dispatch({ type: "more-hire-restore",
      id: h.id }));
  };
  const who = (h: NewHire): string => fill(W.by, { who: whoIs(data,
    h.checkerId), date: dayText(data.people.asOf, "en") });
  return (
    <>
      <FilterList title={W.title} lede={W.lede} rows={rows}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.name} ${r.sub}`}
        segments={[
          { id: "all", label: W.all, match: () => true },
          { id: "todo", label: W.inProgress, match: (r) =>
            r.now === "to-add" || r.now === "waiting" },
          { id: "done", label: W.done, match: (r) =>
            r.now === "signed" || r.now === "declined" },
        ]}
        actions={state.role === "hr" ? (
          <span className={s.btnRow}>
            {waiting && (
              <button type="button"
                className={`${b.btn} ${b.secondary} ${s.tall}`}
                onClick={() => switchRole("gm")}>{W.asGm}</button>)}
            <button type="button"
              className={`${b.btn} ${b.primary} ${s.tall}`}
              onClick={() => setTarget({ start: null })}>{W.add}</button>
          </span>) : undefined}
        columns={[
          { key: "p", label: W.person, render: (r) => (
            <span className={s.name}>
              <span>{r.name}</span>
              <span className={s.sub}>{r.sub}</span>
            </span>) },
          { key: "d", label: W.start, render: (r) => dayText(r.startOn,
            "en") },
          { key: "s", label: W.status, render: (r) => (
            <span className={s.name}>
              <Status tone={TONE[r.now]}>{WORD[r.now]}</Status>
              {r.hire !== null && r.now !== "waiting" && (
                <span className={s.sub}>{who(r.hire)}</span>)}
              {r.hire !== null && r.now === "signed" && (
                <span className={s.sub}>{fill(W.joinsOn,
                  { date: dayText(r.hire.startOn, "en") })}</span>)}
              {r.start !== null && (
                <span className={s.sub}>{fill(W.fromOffer,
                  { no: r.start.offerId.replace("offer-", "") })}</span>)}
              <PackLine packKey={r.hire !== null ? packKeyOf(r.hire)
                : r.key} />
            </span>) },
          { key: "a", label: "", end: true, render: (r) => {
            if (r.start !== null) {
              return state.role !== "hr" ? null : (
                <button type="button"
                  className={`${b.btn} ${b.secondary} ${s.tall}`}
                  aria-label={`${W.addRecord}: ${r.name}`}
                  onClick={() => setTarget({ start: r.start })}>
                  {W.addRecord}</button>);
            }
            const h = r.hire!;
            if (r.now === "waiting" && state.role === "gm") {
              return (
                <span className={s.btnRow}>
                  <button type="button"
                    className={`${b.btn} ${b.secondary} ${s.tall}`}
                    aria-label={`${W.signOff}: ${h.name}`}
                    onClick={() => decide(h, "approve")}>{W.signOff}
                  </button>
                  <button type="button"
                    className={`${b.btn} ${b.quiet} ${s.tall}`}
                    aria-label={`${W.decline}: ${h.name}`}
                    onClick={() => decide(h, "decline")}>{W.decline}
                  </button>
                </span>);
            }
            if (r.now === "waiting") {
              return (
                <button type="button"
                  className={`${b.btn} ${b.quiet} ${s.tall}`}
                  aria-label={`${W.takeBack}: ${h.name}`}
                  onClick={() => takeBack(h)}>{W.takeBack}</button>);
            }
            return state.role === "gm" ? (
              <button type="button"
                className={`${b.btn} ${b.quiet} ${s.tall}`}
                aria-label={`${W.undo}: ${h.name}`}
                onClick={() => dispatch({ type: "undecide",
                  id: h.approvalId })}>{W.undo}</button>) : null;
          } },
        ]}
        empty={W.empty} />
      <section className={s.after} aria-labelledby="hire-next">
        <h2 id="hire-next" className={s.sectionTitle}>{W.nextTitle}</h2>
        <ul className={s.group}>
          {plan.steps.map((x) => (
            <li key={x}><span className={s.line}>
              <span className={s.lineMain}>{x}</span></span></li>))}
        </ul>
        {waiting && state.role === "hr" && (
          <p className={s.note}>{W.asGmHelp}</p>)}
        <p className={s.note}>
          <a className={`${b.btn} ${b.quiet} ${s.tall}`}
            href={hrefOf("people", "moves", "joiners")}>{W.checklist}</a>
        </p>
      </section>
      {target !== null && (
        <HireSheet start={target.start} made={live.length}
          maker={actor.name} checker={gmName}
          onClose={() => setTarget(null)} />)}
    </>
  );
}

function HireSheet(p: { start: NewHireStart | null; made: number;
  maker: string; checker: string; onClose(): void }) {
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const o = data.more.options();
  const st = p.start;
  const plan = data.more.plan(st?.nationality ?? "");
  const pick = (id: string, text: string) => ({ value: id, label: text });
  const choose = { value: "", label: W.choose };
  const band = (g: number): string => o.bands.find((x) =>
    x.grade === g)?.text ?? "";
  return (
    <ApprovalForm open title={st === null ? W.form : `${W.form}: ${st.name}`}
      maker={p.maker} checker={p.checker} submitLabel={W.submit}
      onClose={p.onClose}
      fields={[
        { key: "name", label: W.name, kind: "text", required: true,
          initial: st?.name ?? "" },
        { key: "uae", label: W.uae, kind: "select", initial:
          st?.nationality === "AE" ? "yes" : "no", options: [
            pick("no", W.no), pick("yes", W.yes)],
        help: st?.nationality === "AE" ? plan.pensionNote ?? "" :
          W.pensionNote },
        { key: "dept", label: W.department, kind: "select", required: true,
          initial: st?.departmentId ?? "", options: [choose,
            ...o.departments.map((d) => pick(d.id, d.text))] },
        { key: "job", label: W.job, kind: "select", required: true,
          initial: st?.jobKey ?? "", options: [choose,
            ...o.jobs.map((j) => pick(j.jobKey, j.title))] },
        { key: "grade", label: W.grade, kind: "select", required: true,
          initial: st === null ? "" : String(st.grade), options: [choose,
            ...o.bands.map((x) => pick(String(x.grade), `${x.grade}`))],
        ...(st === null ? {} : { help: fill(W.basicBand, { g: st.grade,
          band: band(st.grade) }) }) },
        { key: "place", label: W.place, kind: "select", required: true,
          initial: st?.location ?? "", options: [choose,
            ...o.places.map((x) => pick(x.id, x.text))] },
        { key: "basic", label: W.basic, kind: "text", required: true,
          initial: st === null ? "" : String(st.basic / 100n),
          help: W.basicHelp },
        { key: "start", label: W.startOn, kind: "date", required: true,
          initial: st?.startOn.iso ?? "" },
        { key: "prob", label: W.probation, kind: "number", required: true,
          initial: String(st?.probationMonths ?? o.probationMax) },
      ]}
      onSubmit={(v) => {
        let basic;
        try { basic = parseAmountInput(v["basic"] ?? ""); } catch {
          return W.notAmount;
        }
        const input = { name: (v["name"] ?? "").trim(),
          departmentId: v["dept"] ?? "", jobKey: v["job"] ?? "",
          grade: Number(v["grade"]), location: v["place"] ?? "",
          basic: fils(basic), startOn: v["start"] ?? "",
          probationMonths: Number(v["prob"]) };
        const err = data.more.checkHire(input);
        if (err !== null) return err;
        const nat = v["uae"] === "yes" ? "AE" : st?.nationality === "AE"
          ? "XX" : st?.nationality ?? "XX";
        dispatch({ type: "more-hire", draft: { offerId: st?.offerId ?? null,
          name: input.name, nationality: nat,
          departmentId: input.departmentId, jobKey: input.jobKey,
          grade: input.grade, location: input.location, basic: input.basic,
          startOn: input.startOn, probationMonths: input.probationMonths,
          number: st?.number ?? data.more.nextNumber(p.made),
          makerId: plan.makerId, checkerId: plan.checkerId,
          requestedOn: data.people.asOf } });
        toast.show(fill(W.sent, { name: p.checker }));
        return null;
      }} />
  );
}
