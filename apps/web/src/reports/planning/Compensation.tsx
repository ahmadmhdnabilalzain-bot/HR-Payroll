import { useState } from "react";
import { fils, type Fils } from "@payroll/engine";
import type { MeritRow } from "./source";
import { useMakerChecker } from "../../pay/parts";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import {
  signedOffIds,
  type PlanItem,
  type PlanProposal,
} from "../../demo/planning-state";
import { formatDate, formatMoney } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList, type FormValues } from "../../ui/templates";
import { useMoney } from "../fmt";
import { usePlanningSource } from "./load";
import s from "./planning.module.css";

type Row = MeritRow & { proposal: PlanProposal | null;
  signed: PlanItem | null };

const stepFils = (step: Fils, n: number): Fils => fils(step * BigInt(n));

/** P67: compensation planning. HR proposes, the GM signs off a batch. */
export function CompensationScreen() {
  const src = usePlanningSource();
  const m = src.merit;
  const { lang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const mc = useMakerChecker();
  const { signed: plus } = useMoney();
  const [open, setOpen] = useState(false);
  const done = signedOffIds(state);
  const item = (id: string): PlanItem | null => state.planBatches
    .flatMap((x) => x.items).find((i) => i.employeeId === id) ?? null;
  const rows: Row[] = m.rows.map((r) => ({ ...r,
    proposal: state.planProposals[r.employeeId] ?? null,
    signed: done.has(r.employeeId) ? item(r.employeeId) : null }));
  const live = rows.filter((r) => r.signed === null && r.proposal !== null);
  const usedIn = (dept: string, except?: string): number => live
    .filter((r) => r.departmentId === dept && r.employeeId !== except)
    .reduce((n, r) => n + r.proposal!.steps, 0);
  const isHr = state.role === "hr";
  const canPropose = rows.filter((r) => r.noneReason === null &&
    r.signed === null);
  const who = (id: string): string => data.employee(id).name.en;
  const statusOf = (r: Row): string => r.signed !== null ? "Signed off"
    : r.proposal !== null ? "Proposed"
      : r.noneReason !== null ? "No increase" : "Can propose";

  const submit = (v: FormValues): string | null => {
    const r = rows.find((x) => x.employeeId === v["person"]);
    if (r === undefined) return "Choose the person.";
    const n = Number(v["steps"] ?? "");
    if (!Number.isInteger(n) || n < 0) return "Choose the number of steps.";
    if (r.signed !== null) return `${r.name}'s increase is already signed off.`;
    if (n > r.allowedSteps) {
      return `The guideline allows ${r.name} up to ` +
        `${r.allowedSteps} ${r.allowedSteps === 1 ? "step" : "steps"}.`;
    }
    const pool = m.pools.find((p) => p.departmentId === r.departmentId)!;
    const left = pool.poolSteps - usedIn(r.departmentId, r.employeeId);
    if (n > left) {
      return `${r.departmentText} has ${left} ` +
        `${left === 1 ? "step" : "steps"} left in its pool.`;
    }
    const before = r.proposal;
    dispatch({ type: "plan-set", employeeId: r.employeeId,
      proposal: n === 0 ? null : { steps: n, by: mc.makerId,
        role: state.role, on: mc.today } });
    toast.show(n === 0 ? `Cleared the proposal for ${r.name}`
      : `Proposed for ${r.name}, to be signed off by ${mc.checker}`,
    () => dispatch({ type: "plan-set", employeeId: r.employeeId,
      proposal: before }));
    return null;
  };

  const signOff = (): void => {
    const items: PlanItem[] = live.map((r) => ({
      employeeId: r.employeeId, name: r.name,
      departmentId: r.departmentId, departmentText: r.departmentText,
      steps: r.proposal!.steps, from: r.basic,
      to: fils(r.basic + stepFils(m.step, r.proposal!.steps)),
      effective: m.effectiveText }));
    const id = `plan-batch-${state.nextPlan}`;
    dispatch({ type: "plan-signoff", items, by: mc.makerId,
      role: state.role, on: mc.today });
    toast.show(`Signed off ${items.length} ` +
      `${items.length === 1 ? "increase" : "increases"}; they are in ` +
      "Salary revisions", () => dispatch({ type: "plan-unsign", id }));
  };

  const primary = isHr ? (
    <button type="button" className={`${b.btn} ${b.primary}`}
      onClick={() => setOpen(true)}>Propose an increase</button>
  ) : state.role === "gm" ? (
    <button type="button" className={`${b.btn} ${b.primary}`}
      disabled={live.length === 0} onClick={signOff}>
      {live.length === 0 ? "Nothing to sign off yet"
        : `Sign off ${live.length} ${live.length === 1 ? "increase"
          : "increases"}`}</button>
  ) : null;
  const options = [0, 1, 2, 3].filter((n) => n === 0 ||
    canPropose.some((r) => r.allowedSteps >= n));
  return (
    <>
      <FilterList title="Compensation planning"
        lede={`${m.year} increases, from ${m.effectiveText}. HR proposes ` +
          "inside the guideline and each department's pool; the General " +
          "manager signs them off as one batch, and they become salary " +
          "revisions."}
        rows={rows} rowKey={(r) => r.employeeId}
        searchText={(r) => `${r.name} ${r.departmentText}`}
        rowHref={(r) => hrefOf("people", r.employeeId)}
        segments={[
          { id: "all", label: "All", match: () => true },
          { id: "can", label: "Can propose", match: (r) =>
            statusOf(r) === "Can propose" },
          { id: "prop", label: "Proposed", match: (r) =>
            statusOf(r) === "Proposed" },
          { id: "done", label: "Signed off", match: (r) =>
            statusOf(r) === "Signed off" },
          { id: "none", label: "No increase", match: (r) =>
            statusOf(r) === "No increase" },
        ]}
        columns={[
          { key: "who", label: "Person", render: (r) => r.name },
          { key: "rate", label: "Mid-year rating",
            render: (r) => r.ratingText },
          { key: "basic", label: "Basic now", end: true,
            render: (r) => <Money value={r.basic} size="sm" /> },
          { key: "guide", label: "Guideline", render: (r) =>
            r.display.guideline },
          { key: "prop", label: "Proposed, a month", end: true,
            render: (r) => {
              const n = r.signed?.steps ?? r.proposal?.steps ?? 0;
              return n === 0 ? <span className={s.muted}>None</span>
                : <Money value={stepFils(m.step, n)} size="sm" />;
            } },
          { key: "st", label: "Status", render: (r) => (
            <span><span className={s.dot} aria-hidden="true" />
              {statusOf(r)}</span>) },
        ]}
        empty="No one matches. Clear the search to see everyone."
        actions={primary} />
      <div className={s.wrap}>
        <div className={s.scroll} tabIndex={0} role="region"
          aria-label="Pools by department">
        <table className={s.pools}>
          <caption className={s.basis}>Pools by department, in steps of{" "}
            {formatMoney(m.step, lang)} a month</caption>
          <thead>
            <tr>
              <th scope="col">Department</th>
              <th scope="col" data-end="true">Rated people</th>
              <th scope="col" data-end="true">Pool</th>
              <th scope="col" data-end="true">Proposed</th>
              <th scope="col" data-end="true">Left</th>
            </tr>
          </thead>
          <tbody>
            {m.pools.map((p) => {
              const used = usedIn(p.departmentId) + rows.filter((r) =>
                r.departmentId === p.departmentId && r.signed !== null)
                .reduce((n, r) => n + r.signed!.steps, 0);
              return (
                <tr key={p.departmentId}>
                  <th scope="row">{p.departmentText}</th>
                  <td data-end="true">{p.eligible}</td>
                  <td data-end="true">{formatMoney(p.pool, lang)}</td>
                  <td data-end="true">
                    {formatMoney(stepFils(m.step, used), lang)}</td>
                  <td data-end="true">
                    {formatMoney(stepFils(m.step, p.poolSteps - used), lang)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <p className={s.basis}>{m.basis}</p>
        {m.left.map((l) => (
          <p key={l.name} className={s.basis}>
            {l.name} is not in the plan: {l.reason.toLowerCase()}.</p>
        ))}
        {state.planBatches.map((x) => (
          <p key={x.id} className={s.basis}>
            {`Signed off by ${who(x.by)} on ${formatDate(x.on, lang)}: ` +
              `${x.items.length} ${x.items.length === 1 ? "increase"
                : "increases"}, `}
            <a href={hrefOf("pay-run", "revisions")}>
              see them in Salary revisions</a>.
          </p>
        ))}
        {isHr && live.length > 0 && (
          <p className={s.basis}>
            {`${live.length} proposed, waiting for ${mc.checker} to ` +
              "sign off. Total " + plusOf(live, m.step, plus) + " a month."}
          </p>
        )}
      </div>
      {open && (
        <ApprovalForm key={Object.keys(state.planProposals).length} open
          title="Propose an increase" maker={mc.maker}
          checker={mc.checker} submitLabel="Send for a decision"
          onClose={() => setOpen(false)} onSubmit={submit}
          fields={[
            { key: "person", label: "Person", kind: "select",
              required: true, initial: canPropose[0]?.employeeId ?? "",
              options: canPropose.map((r) => ({ value: r.employeeId,
                label: `${r.name}, up to ${r.allowedSteps} ` +
                  `${r.allowedSteps === 1 ? "step" : "steps"}` })) },
            { key: "steps", label: "Steps of " +
              formatMoney(m.step, lang) + " a month", kind: "select",
            required: true, initial: "1",
            help: "0 clears a proposal. The guideline and the pool " +
              "are checked when you send it.",
            options: options.map((n) => ({ value: String(n),
              label: n === 0 ? "None" : `${n} ${n === 1 ? "step"
                : "steps"}, ${formatMoney(stepFils(m.step, n), lang)}` })) },
          ]} />
      )}
    </>
  );
}

function plusOf(live: { proposal: PlanProposal | null }[], step: Fils,
  plus: (f: Fils) => string): string {
  const n = live.reduce((a, r) => a + r.proposal!.steps, 0);
  return plus(stepFils(step, n));
}
