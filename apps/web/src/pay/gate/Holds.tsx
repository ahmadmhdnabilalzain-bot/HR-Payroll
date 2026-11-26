import { useState, type FormEvent } from "react";
import { personOf } from "../../demo/derive";
import { useDemo } from "../../demo/state";
import { useRunDetail } from "../../demo/useRunDetail";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import { FilterList, Sheet } from "../../ui/templates";
import { dayMonth, whoIs } from "../derive";
import { Status } from "../parts";
import type { SalaryHold } from "./hold-state";
import s from "./gate.module.css";

const REASONS = ["Not at work and not in touch", "Waiting for documents " +
  "to be returned", "Final settlement under review", "Asked by the " +
  "General manager"];

/** R14: hold one person's October salary, with who, role and date. */
export function Holds() {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const d = useRunDetail();
  const [open, setOpen] = useState(false);
  const held = new Map(state.salaryHolds.map((h) => [h.employeeId, h]));
  const release = (h: SalaryHold): void => {
    dispatch({ type: "salary-release", employeeId: h.employeeId });
    toast.show(`Released: ${data.employee(h.employeeId).name.en}'s ` +
      "salary is to be paid again", () =>
      dispatch({ type: "salary-hold", hold: h }));
  };
  const hold = (employeeId: string, reason: string): void => {
    const h: SalaryHold = { employeeId, reason,
      by: personOf(data, state.role), role: state.role,
      on: data.payCalendar().asOf };
    dispatch({ type: "salary-hold", hold: h });
    toast.show(`Held: ${data.employee(employeeId).name.en}'s salary`, () =>
      dispatch({ type: "salary-release", employeeId }));
  };
  return (
    <>
      <FilterList title="Salary hold"
        lede={"Keep one person's October salary back while something is " +
          "sorted out. The salary is still worked out; it is marked do " +
          "not pay on the bank advice until it is released."}
        rows={d.people} rowKey={(p) => p.id}
        searchText={(p) => `${p.name} ${p.department}`}
        segments={[{ id: "all", label: "Everyone", match: () => true },
          { id: "held", label: "Held", match: (p) => held.has(p.id) }]}
        actions={<button type="button" className={`${b.btn} ${b.primary}`}
          onClick={() => setOpen(true)}>Hold a salary</button>}
        columns={[
          { key: "who", label: "Person", render: (p) => p.name },
          { key: "dept", label: "Department", render: (p) => p.department },
          { key: "net", label: "Net pay", end: true, render: (p) =>
            <Money value={p.net} size="sm" tween={false} /> },
          { key: "st", label: "Status", render: (p) =>
            held.has(p.id) ? <Status tone="check">Held</Status>
              : p.inFile ? <Status tone="done">To be paid</Status>
                : <Status tone="bad">No IBAN yet</Status> },
          { key: "why", label: "Held by", render: (p) => {
            const h = held.get(p.id);
            return h === undefined ? "" : `${whoIs(data, h.by)}, ` +
              `${dayMonth(h.on, lang)}: ${h.reason}`;
          } },
        ]}
        empty="No salary is held. Choose Hold a salary to keep one back." />
      {state.salaryHolds.length > 0 && (
        <section className={s.page} aria-labelledby="held-now">
          <h2 id="held-now" className={s.blockTitle}>Held now</h2>
          <ul className={s.list}>
            {state.salaryHolds.map((h) => {
              const name = data.employee(h.employeeId).name.en;
              return (
                <li key={h.employeeId} className={s.listRow}>
                  <span>
                    <strong>{name}</strong>
                    <span className={s.muted}> {h.reason}. Held by{" "}
                      {whoIs(data, h.by)}, {dayMonth(h.on, lang)}.</span>
                  </span>
                  <button type="button" className={`${b.btn} ${b.secondary}`}
                    aria-label={`Release ${name}'s salary`}
                    onClick={() => release(h)}>Release</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <HoldSheet open={open} onClose={() => setOpen(false)}
        people={d.people.filter((p) => !held.has(p.id))
          .map((p) => ({ id: p.id, name: p.name }))}
        maker={whoIs(data, personOf(data, state.role))}
        onHold={hold} />
    </>
  );
}

function HoldSheet(p: { open: boolean; onClose(): void;
  people: { id: string; name: string }[]; maker: string;
  onHold(id: string, reason: string): void }) {
  const [who, setWho] = useState("");
  const [why, setWhy] = useState(REASONS[0]!);
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (who === "") {
      setError("Choose whose salary to hold.");
      return;
    }
    p.onHold(who, why);
    setWho("");
    setError(null);
    p.onClose();
  };
  return (
    <Sheet open={p.open} title="Hold a salary" onClose={p.onClose}>
      <form className={s.form} onSubmit={submit} noValidate>
        <label className={s.field}>
          <span>Person</span>
          <select value={who} onChange={(e) => {
            setWho(e.target.value);
            setError(null);
          }}>
            <option value="">Choose a person</option>
            {p.people.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>Reason</span>
          <select value={why} onChange={(e) => setWhy(e.target.value)}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <p className={s.muted}>Held by {p.maker}, today. Release it at any
          time from this list.</p>
        {error !== null && <p className={s.error} role="alert">{error}</p>}
        <div className={s.actions}>
          <button type="submit" className={`${b.btn} ${b.primary}`}>
            Hold salary</button>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={p.onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}
