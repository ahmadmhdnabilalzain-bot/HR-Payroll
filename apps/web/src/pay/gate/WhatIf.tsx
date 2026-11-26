import { useMemo, useState, type FormEvent } from "react";
import type { Fils } from "@payroll/engine";
import { useExtras } from "../../demo/data/payroll-extras-load";
import type { WhatIfChange } from "../../demo/data/payroll-extras-types";
import { useDemo } from "../../demo/state";
import { formatMoney } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { PageHead } from "../../ui/templates";
import { filsOfInput } from "../derive";
import s from "./gate.module.css";
import tpl from "../../ui/templates/templates.module.css";
import { Footnote } from "../../components/explain";

const aedOf = (f: Fils): string => {
  const v = f as bigint;
  return `${v / 100n}.${String(v % 100n).padStart(2, "0")}`;
};

/** One figure as run, with the change, and the difference. */
function Row(p: { label: string; before: Fils; after: Fils }) {
  const diff = (p.after - p.before) as Fils;
  return (
    <tr>
      <th scope="row">{p.label}</th>
      <td data-label="As run">
        <Money value={p.before} size="sm" tween={false} /></td>
      <td data-label="With the change">
        <Money value={p.after} size="sm" tween={false} /></td>
      <td data-label="Difference">
        {diff === 0n ? <span className={s.muted}>No change</span>
          : <Money value={diff} size="sm" tween={false} signed />}</td>
    </tr>
  );
}

function Compare(p: { title: string; rows: { label: string;
  before: Fils; after: Fils }[] }) {
  return (
    <table className={s.compare}>
      <caption>{p.title}</caption>
      <thead>
        <tr>
          <td />
          <th scope="col">As run</th>
          <th scope="col">With the change</th>
          <th scope="col">Difference</th>
        </tr>
      </thead>
      <tbody>
        {p.rows.map((x) => <Row key={x.label} {...x} />)}
      </tbody>
    </table>
  );
}

/**
 * R09: change one person's October basic or add overtime hours and
 * see the engine work the run out again. Nothing is saved.
 */
export function WhatIf() {
  const { lang } = useLocale();
  const x = useExtras();
  const { state } = useDemo();
  const first = x.people.find((p) => p.hasOvertime) ?? x.people[0]!;
  const [who, setWho] = useState(first.id);
  const person = x.people.find((p) => p.id === who) ?? first;
  const [basic, setBasic] = useState(aedOf(first.basic));
  const [hours, setHours] = useState("0");
  const [asked, setAsked] = useState<WhatIfChange>({ employeeId: first.id });
  const [error, setError] = useState<string | null>(null);
  const r = useMemo(() => x.whatIf(asked, state.ibans),
    [x, asked, state.ibans]);
  const pick = (id: string): void => {
    const p = x.people.find((y) => y.id === id) ?? first;
    setWho(p.id);
    setBasic(aedOf(p.basic));
    setHours("0");
    setError(null);
    setAsked({ employeeId: p.id });
  };
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const f = filsOfInput(basic);
    const h = Number(hours);
    const max = x.whatIfMaxMinutes / 60;
    if (f === null || f <= 0n) {
      setError("Enter the basic salary in AED, for example 8250.00.");
      return;
    }
    if (!Number.isFinite(h) || h < 0 || h > max || h * 4 % 1 !== 0) {
      setError(`Enter overtime hours from 0 to ${max}, in quarter hours.`);
      return;
    }
    setError(null);
    setAsked({ employeeId: who, basic: f,
      extraOvertimeMinutes: Math.round(h * 60) });
  };
  const reset = (): void => pick(who);
  const changed = r.asked.length > 0;
  const netDiff = (r.after.net - r.before.net) as Fils;
  const netLine = netDiff === 0n ? "October net pay does not change."
    : `October net pay ${netDiff > 0n ? "rises" : "falls"} by ` +
      `${formatMoney((netDiff > 0n ? netDiff : -netDiff) as Fils, lang)}.`;
  if (state.hideAmounts) {
    return (
      <div className={s.page}>
        <PageHead title="What-if"
          lede={"Amounts are hidden. Show amounts (the eye in the top bar) " +
            "to try a change to someone's pay."} />
      </div>
    );
  }
  return (
    <div className={s.page}>
      <PageHead title="What-if"
        lede={"Change one person's October basic salary or add overtime, " +
          "and the engine works the run out again. Nothing is saved, and " +
          "the pay run is not changed."} />
      <form className={s.tryCard} onSubmit={submit} noValidate
        aria-label="Change to try">
        <div className={s.fields}>
          <label className={s.field}>
            <span>Person</span>
            <select value={who} onChange={(e) => pick(e.target.value)}>
              {x.people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}, {p.department}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            <span>Basic salary, AED a month</span>
            <input inputMode="decimal" value={basic}
              onChange={(e) => setBasic(e.target.value)} />
            <small>As run: {formatMoney(person.basic, "en")}</small>
          </label>
          <label className={s.field}>
            <span>Overtime hours to add</span>
            <input inputMode="decimal" value={hours}
              onChange={(e) => setHours(e.target.value)} />
            <small>Two hours a day on October working days, daytime</small>
          </label>
        </div>
        {error !== null && <p className={s.error} role="alert">{error}</p>}
        <div className={s.actions}>
          <button type="submit" className={`${b.btn} ${b.primary}`}>
            Work it out</button>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={reset} disabled={!changed}>Back to the run</button>
        </div>
      </form>
      <section className={s.result} aria-live="polite"
        aria-label="What the engine worked out">
        <p className={s.lead}>{changed ? r.asked.join(". ") + "."
          : `${r.name} as run. Change a figure and choose Work it out.`}
        </p>
        <div className={s.pair}>
          <div className={tpl.figure}>
            <span>{r.name}'s net pay, as run</span>
            <strong><Money value={r.before.net} tween={false} /></strong>
          </div>
          <span className={s.arrow} aria-hidden="true">→</span>
          <div className={tpl.figure} data-after={changed}>
            <span>With the change</span>
            <strong><Money value={r.after.net} /></strong>
          </div>
        </div>
        <p className={s.diffLine}>{netLine}</p>
        <Compare title={r.name} rows={[
          { label: "Gross pay", before: r.before.gross,
            after: r.after.gross },
          { label: "Deductions", before: r.before.deductions,
            after: r.after.deductions },
          { label: "Net pay", before: r.before.net, after: r.after.net },
        ]} />
        <Compare title="October run" rows={[
          { label: "Gross pay", before: r.run.before.gross,
            after: r.run.after.gross },
          { label: "Net pay", before: r.run.before.net,
            after: r.run.after.net },
          { label: "Salary file", before: r.run.before.inFile,
            after: r.run.after.inFile },
        ]} />
        <p className={s.muted}>Worked out by the same engine as the pay run,
          on the same rules.</p>
      </section>
      <Footnote />
    </div>
  );
}
