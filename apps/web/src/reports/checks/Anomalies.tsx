import { useMemo } from "react";
import type { AnomalyFinding } from "../../demo/data/checks-types";
import { hrefOf } from "../../demo/route";
import { useDemo, type DemoState } from "../../demo/state";
import type { CheckNote } from "../../demo/checks-state";
import { useMakerChecker } from "../../pay/parts";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { useMaskText } from "../../ui/mask";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import { FilterList, RowDecision } from "../../ui/templates";
import s from "./checks.module.css";

type Row = AnomalyFinding & { note: CheckNote | null };

const statusOf = (r: Row): string => r.note === null ? "To check"
  : r.note.mark === "reviewed" ? "Reviewed" : "Marked as expected";

/** The findings as the state has them, marked or not. */
export function anomalyRows(d: { checks: { anomalies(b: readonly string[]):
  { findings: AnomalyFinding[] } } }, state: DemoState): Row[] {
  return d.checks.anomalies(Object.keys(state.ibans)).findings.map((f) =>
    ({ ...f, note: state.checkMarks[f.id] ?? null }));
}

/** R43: rule-based checks on this run against last month's. */
export function AnomaliesScreen() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const { lang } = useLocale();
  const mask = useMaskText();
  const mc = useMakerChecker();
  const report = data.checks.anomalies(Object.keys(state.ibans));
  const rows = useMemo(() => anomalyRows(data, state), [data, state]);
  const mine = state.role === "hr" || state.role === "gm";

  const mark = (r: Row, kind: CheckNote["mark"]): void => {
    dispatch({ type: "check-mark", id: r.id, employeeId: r.employeeId,
      note: { mark: kind, by: mc.makerId, role: state.role,
        on: mc.today } });
    toast.show(kind === "reviewed" ? `Marked ${r.name} as reviewed`
      : `Marked ${r.name} as expected`, () => dispatch({
      type: "check-unmark", id: r.id, employeeId: r.employeeId }));
  };
  const unmark = (r: Row): void => {
    const was = r.note;
    dispatch({ type: "check-unmark", id: r.id,
      employeeId: r.employeeId });
    if (was !== null) {
      toast.show(`Took back the mark on ${r.name}`, () => dispatch({
        type: "check-mark", id: r.id, employeeId: r.employeeId,
        note: was }));
    }
  };
  const who = (id: string): string => data.employee(id).name.en;

  return (
    <>
      <FilterList title="Anomaly checks"
        lede={`${report.monthText} against ${report.againstText}. Plain ` +
          "rules with sample thresholds. Each finding is a question for " +
          "a person; marking it changes no pay."}
        rows={rows} rowKey={(r) => r.id}
        searchText={(r) => `${r.name} ${r.departmentText} ${r.ruleLabel} ` +
          r.what}
        rowHref={(r) => hrefOf("people", r.employeeId)}
        segments={[
          { id: "all", label: "All", match: () => true },
          { id: "open", label: "To check", match: (r) => r.note === null },
          { id: "rev", label: "Reviewed", match: (r) =>
            r.note?.mark === "reviewed" },
          { id: "exp", label: "Expected", match: (r) =>
            r.note?.mark === "expected" },
        ]}
        columns={[
          { key: "who", label: "Person", render: (r) => r.name },
          { key: "rule", label: "Check", render: (r) => r.ruleLabel },
          { key: "what", label: "What we found", render: (r) => (
            <span className={s.sentence}>
              <span>{r.what}</span>
              {r.figures.length > 0 && (
                <span className={s.figs}>
                  {r.figures.map((f) => (
                    <span key={f.label}>{f.label}{" "}
                      <Money value={f.value} size="sm" tween={false}
                        signed={f.signed === true} /></span>
                  ))}
                </span>
              )}
            </span>) },
          { key: "st", label: "Status", render: (r) => (
            <span><span className={s.dot} aria-hidden="true" />
              {statusOf(r)}</span>) },
        ]}
        rowActions={(r) => (
          <RowDecision open={r.note === null} mine={mine}
            waitingFor="HR or the General manager"
            yes={{ label: "Reviewed", run: () => mark(r, "reviewed") }}
            no={{ label: "Expected", run: () => mark(r, "expected") }}
            {...(mine ? { undo: () => unmark(r) } : {})} />
        )}
        empty="Nothing to check. Every rule ran and found nothing." />
      <div className={s.wrap}>
        <div className={s.scroll} tabIndex={0} role="region"
          aria-label="The rules">
          <table className={s.table}>
            <caption className={s.basis}>
              The rules, with their sample thresholds</caption>
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">It asks</th>
                <th scope="col">Sample threshold</th>
                <th scope="col" data-end="true">Found</th>
              </tr>
            </thead>
            <tbody>
              {report.rules.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.label}</th>
                  <td>{r.asks}</td>
                  <td>{mask(r.sample)}</td>
                  <td data-end="true">
                    {r.count === 0 ? "Nothing found" : r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.basis}>{report.basis}</p>
        {rows.filter((r) => r.note !== null).map((r) => (
          <p key={r.id} className={s.basis}>
            {`${r.name}: marked ${r.note!.mark === "reviewed" ? "reviewed"
              : "as expected"} by ${who(r.note!.by)} on ` +
              `${formatDate(r.note!.on, lang)}.`}</p>
        ))}
      </div>
    </>
  );
}
