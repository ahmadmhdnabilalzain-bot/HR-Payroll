import { useState } from "react";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { filsOfInput, whoIs } from "../derive";
import { Status, useMakerChecker } from "../parts";
import { usePayMore } from "./load";
import { priorOf, type PriorRecord } from "./state";

/**
 * R25: prior-employment pay for people who joined in the last twelve
 * months. HR enters what the person's papers say; a second person
 * checks it. Nothing is made up: until HR enters it, the row says none.
 */
export function PriorEmployment() {
  const { prior, priorNote, evidence } = usePayMore();
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const mc = useMakerChecker();
  const [who, setWho] = useState<string | null>(null);
  const hr = state.role === "hr";
  const label = (id: string): string => evidence.find((e) =>
    e.value === id)?.label ?? id;
  const asOf = data.payCalendar().asOf;
  const stamp = { by: mc.makerId, role: state.role, on: asOf };
  const person = prior.find((x) => x.employeeId === who);

  return (
    <>
      <FilterList title="Prior-employment pay"
        lede={priorNote} rows={prior} rowKey={(x) => x.employeeId}
        searchText={(x) => `${x.name} ${x.jobText} ${x.departmentText}`}
        segments={[
          { id: "all", label: "Joined in the last year", match: () => true },
          { id: "none", label: "No record", match: (x) =>
            priorOf(state.priorRecords, x.employeeId) === undefined },
          { id: "have", label: "Entered", match: (x) =>
            priorOf(state.priorRecords, x.employeeId) !== undefined },
        ]}
        columns={[
          { key: "who", label: "Person", render: (x) =>
            `${x.name}, joined ${x.joined}` },
          { key: "rec", label: "Earlier pay", render: (x) => {
            const r = priorOf(state.priorRecords, x.employeeId);
            return r === undefined ? <span>None entered</span> : (
              <span>{r.employer}, <Money value={r.lastMonthly} size="sm"
                tween={false} /> a month, {label(r.evidence)}.<br />
              Entered by {whoIs(data, r.by)}, {formatDate(r.on, lang)}.
              {r.checked !== null && <><br />Checked by {whoIs(data,
                r.checked.by)}, {formatDate(r.checked.on, lang)}.</>}
              </span>);
          } },
          { key: "st", label: "Status", end: true, render: (x) => {
            const r = priorOf(state.priorRecords, x.employeeId);
            return (
              <Row r={r} hr={hr} name={x.name}
                add={() => setWho(x.employeeId)}
                check={(rec) => {
                  dispatch({ type: "prior-check", id: rec.id, stamp });
                  toast.show(`${x.name}: marked checked`, () =>
                    dispatch({ type: "prior-uncheck", id: rec.id }));
                }}
                undo={(rec) => {
                  dispatch({ type: "prior-undo", id: rec.id });
                }} lang={lang} />);
          } },
        ]}
        empty={"Nobody joined in the last twelve months. A joiner " +
          "appears here once they are on the payroll."} />
      <ApprovalForm key={who ?? "none"} open={person !== undefined}
        title={person === undefined ? "" : `Earlier pay: ${person.name}`}
        maker={mc.maker} checker={mc.checker} submitLabel="Save the record"
        onClose={() => setWho(null)}
        fields={[
          { key: "employer", label: "Earlier employer", kind: "text",
            required: true },
          { key: "from", label: "From", kind: "date", required: true },
          { key: "to", label: "To", kind: "date", required: true },
          { key: "pay", label: "Last monthly pay (AED)", kind: "number",
            required: true, help: "Basic and allowances together." },
          { key: "evidence", label: "Source of the figure", kind: "select",
            options: evidence.map((e) => ({ value: e.value,
              label: e.label })), initial: evidence[0]?.value ?? "" },
        ]}
        onSubmit={(v) => {
          const pay = filsOfInput(v["pay"] ?? "");
          if (pay === null || pay <= 0n) {
            return "Enter the pay as an amount in AED, such as 18500.";
          }
          const from = v["from"] ?? "";
          const to = v["to"] ?? "";
          if (to < from) return "The end date is before the start date.";
          if (to > asOf) return "The earlier job cannot end after today.";
          if (person === undefined) return "Pick a person first.";
          dispatch({ type: "prior-add", draft: { employeeId:
            person.employeeId, employer: (v["employer"] ?? "").trim(),
          from, to, lastMonthly: pay, evidence: v["evidence"] ?? "",
          by: mc.makerId, role: state.role, on: asOf } });
          toast.show(`Earlier pay saved for ${person.name}.`);
          return null;
        }} />
    </>
  );
}

function Row(p: { r: PriorRecord | undefined; hr: boolean; name: string;
  lang: "en" | "ar"; add(): void; check(r: PriorRecord): void;
  undo(r: PriorRecord): void }) {
  const { r } = p;
  if (r === undefined) {
    return p.hr ? (
      <button type="button" className={`${b.btn} ${b.secondary}`}
        onClick={p.add}>
        Add record<span className="visually-hidden">: {p.name}</span>
      </button>) : <Status tone="neutral">No record</Status>;
  }
  const when = formatDate(r.on, p.lang);
  return (
    <span>
      <Status tone={r.checked === null ? "check" : "done"}>
        {r.checked === null ? `Entered ${when}` : `Checked ${formatDate(
          r.checked.on, p.lang)}`}
      </Status>
      {r.checked === null && !p.hr && (
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => p.check(r)}>
          Mark checked<span className="visually-hidden">: {p.name}</span>
        </button>)}
      {p.hr && r.checked === null && (
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => p.undo(r)}>
          Take back<span className="visually-hidden">: {p.name}</span>
        </button>)}
    </span>
  );
}
