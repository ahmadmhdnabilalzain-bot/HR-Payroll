import { useMemo, useState } from "react";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { PageHead } from "../../ui/templates";
import tp from "../../ui/templates/templates.module.css";
import { share, useReportCrumbs } from "../fmt";
import s from "./checks.module.css";

/** P20: what one planned hire costs, from the engine, against budget. */
export function CostOfHireScreen() {
  const { data } = useDemo();
  const crumbs = useReportCrumbs();
  const roles = useMemo(() => data.checks.hireRoles(), [data]);
  const first = roles[0]!;
  const [jobKey, setJobKey] = useState(first.jobKey);
  const role = roles.find((r) => r.jobKey === jobKey) ?? first;
  const [grade, setGrade] = useState(first.gradeMin);
  const [startIso, setStartIso] = useState(
    `${Number(data.checks.asOf.slice(0, 4)) + 1}-01-01`);
  const [national, setNational] = useState(false);
  const pick = (key: string): void => {
    const r = roles.find((x) => x.jobKey === key)!;
    setJobKey(key);
    setGrade(r.gradeMin);
  };
  const p = useMemo(() => data.checks.hire({ jobKey, grade, startIso,
    national }), [data, jobKey, grade, startIso, national]);
  const grades = Array.from({ length: role.gradeMax - role.gradeMin + 1 },
    (_, i) => role.gradeMin + i);
  const b = p.budget;
  return (
    <div className={tp.page}>
      <PageHead title="Cost of hire" crumbs={crumbs}
        lede={"Pick a role, a grade and a start date. Pay comes from the " +
          "payroll engine; visa, medical and insurance lines are demo " +
          "estimates."} />
      <form className={s.form} onSubmit={(e) => e.preventDefault()}
        aria-label="The planned hire">
        <label className={tp.field}>
          <span>Role</span>
          <select value={jobKey} onChange={(e) => pick(e.target.value)}>
            {roles.map((r) => (
              <option key={r.jobKey} value={r.jobKey}>{r.title}</option>
            ))}
          </select>
        </label>
        <label className={tp.field}>
          <span>Grade</span>
          <select value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}>
            {grades.map((g) => (
              <option key={g} value={g}>{`Grade ${g}`}</option>
            ))}
          </select>
        </label>
        <label className={tp.field}>
          <span>Start date</span>
          <input type="date" value={startIso} min={data.checks.asOf}
            onChange={(e) => setStartIso(e.target.value)} />
        </label>
        <label className={tp.field}>
          <span>Employee type</span>
          <select value={national ? "national" : "expat"}
            onChange={(e) => setNational(e.target.value === "national")}>
            <option value="expat">Not a UAE national</option>
            <option value="national">UAE national</option>
          </select>
        </label>
      </form>
      <div className={s.wrap}>
        {p.problems.length > 0 && (
          <p className={s.problems} role="alert">
            {p.problems.join(" ")}</p>
        )}
        {p.problems.length === 0 && (
          <>
            <dl className={s.key} aria-label="Key figures">
              <div><dt>A full month, gross</dt>
                <dd><Money value={p.monthlyGross} size="lg"
                  tween={false} /></dd></div>
              <div><dt>First year, gross</dt>
                <dd><Money value={p.firstYearGross} size="lg"
                  tween={false} /></dd></div>
              <div><dt>First year with demo estimates</dt>
                <dd><Money value={p.firstYearTotal} size="lg"
                  tween={false} /></dd></div>
            </dl>
            <div className={s.scroll} tabIndex={0} role="region"
              aria-label="Monthly pay">
              <table className={s.table}>
                <caption className={s.basis}>
                  A full month for {role.title}, grade {grade}</caption>
                <thead>
                  <tr><th scope="col">Part of pay</th>
                    <th scope="col" data-end="true">A month</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Basic salary</th>
                    <td data-end="true"><Money value={p.basic} size="sm"
                      tween={false} /></td></tr>
                  {p.allowances.map((a) => (
                    <tr key={a.label}>
                      <th scope="row">{`${a.label} allowance`}</th>
                      <td data-end="true"><Money value={a.monthly}
                        size="sm" tween={false} /></td></tr>
                  ))}
                  <tr className={s.total}><th scope="row">Gross pay</th>
                    <td data-end="true"><Money value={p.monthlyGross}
                      size="sm" tween={false} /></td></tr>
                </tbody>
              </table>
            </div>
            <div className={s.scroll} tabIndex={0} role="region"
              aria-label="First year by month">
              <table className={s.table}>
                <caption className={s.basis}>
                  The first twelve payroll months, from {p.startText}
                </caption>
                <thead>
                  <tr><th scope="col">Month</th>
                    <th scope="col">Note</th>
                    <th scope="col" data-end="true">Gross pay</th></tr>
                </thead>
                <tbody>
                  {p.months.map((m) => (
                    <tr key={m.month}>
                      <th scope="row">{m.label}</th>
                      <td>{m.part ? "Part month" : ""}</td>
                      <td data-end="true"><Money value={m.gross} size="sm"
                        tween={false} /></td></tr>
                  ))}
                  <tr className={s.total}><th scope="row">First year</th>
                    <td /><td data-end="true"><Money
                      value={p.firstYearGross} size="sm"
                      tween={false} /></td></tr>
                </tbody>
              </table>
            </div>
            <div className={s.scroll} tabIndex={0} role="region"
              aria-label="Other costs">
              <table className={s.table}>
                <caption className={s.basis}>Other costs of the hire
                </caption>
                <thead>
                  <tr><th scope="col">Cost</th>
                    <th scope="col">State</th>
                    <th scope="col" data-end="true">First year</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Employer-side costs</th>
                    <td>{p.employer.status === "computed"
                      ? "Computed by the engine" : p.employer.note}</td>
                    <td data-end="true">{p.employer.status === "computed"
                      ? <Money value={p.employer.amount} size="sm"
                        tween={false} /> : "Not computed"}</td></tr>
                  {p.placeholders.map((x) => (
                    <tr key={x.label}>
                      <th scope="row">{x.label}</th>
                      <td>{x.note}</td>
                      <td data-end="true"><Money value={x.amount}
                        size="sm" tween={false} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {b !== null && (
              <div className={s.scroll} tabIndex={0} role="region"
                aria-label="Against the budget">
                <table className={s.table}>
                  <caption className={s.basis}>
                    {`${b.departmentText}, ${b.year} budget`}</caption>
                  <thead>
                    <tr><th scope="col">Line</th>
                      <th scope="col" data-end="true">Gross pay</th></tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">{`Planned for ${b.year}`}</th>
                      <td data-end="true"><Money value={b.planned}
                        size="sm" tween={false} /></td></tr>
                    <tr><th scope="row">This hire in {b.year}</th>
                      <td data-end="true"><Money value={b.hireInYear}
                        size="sm" tween={false} /></td></tr>
                    <tr className={s.total}>
                      <th scope="row">Plan with this hire</th>
                      <td data-end="true"><Money value={b.withHire}
                        size="sm" tween={false} /></td></tr>
                  </tbody>
                </table>
              </div>
            )}
            {b !== null && (
              <p className={s.basis}>
                {`This hire is ${share(Number(b.hireInYear),
                  Number(b.planned))} of the ${b.departmentText} plan. `}
                {b.basis}</p>
            )}
            <p className={s.basis}>{p.basis}</p>
          </>
        )}
      </div>
    </div>
  );
}
