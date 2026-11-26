import { personOf } from "../demo/derive";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";
import {
  FilterList,
  KeyValues,
  RecordTabs,
  RowDecision,
} from "../ui/templates";
import { dayMonth, whoIs } from "./derive";
import { usePay } from "./load";
import { NotFound, Status } from "./parts";
import type { FineChoice, FineDecision } from "./pay-state";
import s from "./pay.module.css";
import type { FineView } from "./types";

const LIST = hrefOf("pay-run", "fines");
const CHOICE: Record<FineChoice, string> = {
  bank: "The bank pays", recover: "Recover from the employee",
};

function FineStatus(p: { d: FineDecision | undefined }) {
  return p.d === undefined ? <Status tone="check">To decide</Status>
    : <Status tone="done">{CHOICE[p.d.choice]}</Status>;
}

/** Who pays a fine, on its row: the same buttons as the record. */
function FineRow(p: { f: FineView }) {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const d = state.fineDecisions[p.f.id];
  const decide = (choice: FineChoice) => (): void => {
    dispatch({ type: "fine-decide", id: p.f.id, decision: { choice,
      by: personOf(data, state.role), on: data.payCalendar().asOf } });
    toast.show(choice === "bank" ? "Noted: the bank pays this fine"
      : "Noted: to recover from the employee",
    () => dispatch({ type: "fine-undo", id: p.f.id }));
  };
  return (
    <RowDecision open={d === undefined} mine
      yes={{ label: "Bank pays", run: decide("bank") }}
      no={{ label: "Recover", run: decide("recover") }}
      undo={() => dispatch({ type: "fine-undo", id: p.f.id })} />
  );
}

/** R24: traffic fines on bank cars, waiting for a decision. */
export function Fines() {
  const { state } = useDemo();
  const pay = usePay();
  const d = state.fineDecisions;
  return (
    <FilterList title="Traffic fines"
      lede={"Fines on bank cars. Decide who pays each one; recovering a " +
        "fine from pay is not worked out here."}
      rows={pay.fines} rowKey={(f) => f.id}
      searchText={(f) => `${f.name} ${f.offence}`}
      rowHref={(f) => hrefOf("pay-run", "fines", f.id)}
      rowActions={(f) => <FineRow f={f} />}
      avatar={(f) => ({ id: f.employeeId, name: f.name })}
      segments={[
        { id: "open", label: "To decide", match: (f) =>
          d[f.id] === undefined },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "who", label: "Driver", render: (f) => f.name },
        { key: "what", label: "Offence", render: (f) => f.offence },
        { key: "on", label: "Date", render: (f) => f.date },
        { key: "amt", label: "Amount", end: true, render: (f) =>
          <Money value={f.amount} size="sm" /> },
        { key: "st", label: "Status", render: (f) =>
          <FineStatus d={d[f.id]} /> },
      ]}
      empty="Every fine is decided. Choose All to see them." />
  );
}

export function FineRecord(p: { id: string }) {
  const pay = usePay();
  const f = pay.fines.find((x) => x.id === p.id);
  if (f === undefined) {
    return <NotFound what="fine" back={{ label: "Traffic fines",
      href: LIST }} />;
  }
  return <FinePage f={f} />;
}

function FinePage(p: { f: FineView }) {
  const f = p.f;
  const { lang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const d = state.fineDecisions[f.id];
  const decide = (choice: FineChoice): void => {
    dispatch({ type: "fine-decide", id: f.id, decision: { choice,
      by: personOf(data, state.role), on: data.payCalendar().asOf } });
    toast.show(choice === "bank" ? "Noted: the bank pays this fine"
      : "Noted: to recover from the employee",
    () => dispatch({ type: "fine-undo", id: f.id }));
  };
  return (
    <RecordTabs title={f.name} lede={`${f.offence}, ${f.date}`}
      back={{ label: "Traffic fines", href: LIST }}
      actions={d === undefined ? (
        <>
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={() => decide("recover")}>{CHOICE.recover}</button>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => decide("bank")}>{CHOICE.bank}</button>
        </>
      ) : (
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => dispatch({ type: "fine-undo", id: f.id })}>
          Take back decision</button>
      )}
      stats={[
        { label: "Amount", value: <Money value={f.amount} size="lg" /> },
      ]}
      tabs={[{ id: "details", label: "Details", render: () => (
        <div className={s.stack}>
          <KeyValues items={[
            { label: "Status", value: <FineStatus d={d} /> },
            { label: "Fine number", value: f.number },
            { label: "Date", value: f.date },
            { label: "Driver", value: f.name },
            ...(d === undefined ? [] : [{ label: "Decided",
              value: `${CHOICE[d.choice]}: ${whoIs(data, d.by)}, ` +
                dayMonth(d.on, lang) }]),
          ]} />
          <p className={s.note}>{f.recoveryNote}</p>
          <p className={s.note}>{f.numberNote}.</p>
        </div>
      ) }]} />
  );
}
