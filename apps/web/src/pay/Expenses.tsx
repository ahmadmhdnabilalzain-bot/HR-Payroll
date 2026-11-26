import { useSwitchRole } from "../demo/actions";
import type { Approval } from "../demo/data/types";
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
import { NotFound, Status, type Tone } from "./parts";
import s from "./pay.module.css";
import type { ExpenseView } from "./types";

const LIST = hrefOf("pay-run", "expenses");

/** The inbox approval for a waiting claim (the one Home decides). */
function useApproval(x: ExpenseView): Approval | undefined {
  const { data } = useDemo();
  return x.settled ? undefined : data.approvalsInbox().find((a) =>
    a.kind === "expense" && a.employeeId === x.employeeId);
}

function useClaimState(x: ExpenseView): [string, Tone] {
  const { state } = useDemo();
  const a = useApproval(x);
  if (a === undefined) return ["Agreed earlier", "done"];
  const v = state.decided[a.id];
  return v === undefined ? ["Waiting", "check"] : v === "approve"
    ? ["Agreed", "done"] : ["Declined", "neutral"];
}

function ClaimStatus(p: { x: ExpenseView }) {
  const [word, tone] = useClaimState(p.x);
  return <Status tone={tone}>{word}</Status>;
}

/** Agree and Decline on the row, for the person who decides. */
function ClaimActions(p: { x: ExpenseView }) {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const a = useApproval(p.x);
  if (a === undefined) return null;
  const mine = personOf(data, state.role) === a.checkerId;
  const decide = (v: "approve" | "decline") => (): void => {
    dispatch({ type: "decide", id: a.id, verdict: v });
    toast.show(v === "approve" ? "Claim agreed" : "Claim declined",
      () => dispatch({ type: "undecide", id: a.id }));
  };
  return (
    <RowDecision open={state.decided[a.id] === undefined} mine={mine}
      waitingFor={data.employee(a.checkerId).name.en}
      yes={{ label: "Agree", run: decide("approve") }}
      no={{ label: "Decline", run: decide("decline") }}
      undo={mine ? () => dispatch({ type: "undecide", id: a.id })
        : undefined} />
  );
}

/** R23: expense claims, decided by the person's manager. */
export function Expenses() {
  const pay = usePay();
  return (
    <FilterList title="Expense claims"
      lede={"Claims with their receipts. The person's manager decides; " +
        "an agreed claim is repaid with the next pay run."}
      rows={pay.expenses} rowKey={(x) => x.id}
      searchText={(x) => `${x.name} ${x.title}`}
      rowHref={(x) => hrefOf("pay-run", "expenses", x.id)}
      avatar={(x) => ({ id: x.employeeId, name: x.name })}
      rowActions={(x) => <ClaimActions x={x} />}
      columns={[
        { key: "who", label: "Person", render: (x) => x.name },
        { key: "what", label: "Claim", render: (x) => x.title },
        { key: "on", label: "Date", render: (x) => x.date },
        { key: "amt", label: "Amount", end: true, render: (x) =>
          <Money value={x.amount} size="sm" /> },
        { key: "st", label: "Status", render: (x) => <ClaimStatus x={x} /> },
      ]}
      empty="No expense claims. A claim appears here once it is sent." />
  );
}

export function ExpenseRecord(p: { id: string }) {
  const pay = usePay();
  const x = pay.expenses.find((y) => y.id === p.id);
  if (x === undefined) {
    return <NotFound what="claim" back={{ label: "Expense claims",
      href: LIST }} />;
  }
  return <ClaimPage x={x} />;
}

function ClaimPage(p: { x: ExpenseView }) {
  const x = p.x;
  const { lang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const switchRole = useSwitchRole();
  const [word, tone] = useClaimState(x);
  const a = useApproval(x);
  const verdict = a === undefined ? undefined : state.decided[a.id];
  const isChecker = a !== undefined &&
    personOf(data, state.role) === a.checkerId;
  const decide = (v: "approve" | "decline"): void => {
    if (a === undefined) return;
    dispatch({ type: "decide", id: a.id, verdict: v });
    toast.show(v === "approve" ? "Claim agreed" : "Claim declined",
      () => dispatch({ type: "undecide", id: a.id }));
  };
  return (
    <RecordTabs title={x.name} lede={`${x.title}, ${x.date}`}
      avatar={{ id: x.employeeId, name: x.name }}
      status={{ word, tone: tone === "check" ? "warn" : tone === "bad"
        ? "stop" : tone }}
      history={[{ when: x.date, what: `Sent by ${x.name}` },
        ...(a === undefined || verdict === undefined ? [] : [{
          when: dayMonth(data.payCalendar().asOf, lang),
          what: `Claim ${verdict === "approve" ? "agreed" : "declined"} by ` +
            whoIs(data, a.checkerId) }])]}
      back={{ label: "Expense claims", href: LIST }}
      actions={a !== undefined && verdict === undefined && isChecker ? (
        <>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => decide("decline")}>Decline</button>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => decide("approve")}>Agree</button>
        </>
      ) : undefined}
      stats={[
        { label: "Amount", value: <Money value={x.amount} size="lg" /> },
        { label: "Of which VAT", value: <Money value={x.vat} size="lg" /> },
      ]}
      tabs={[{ id: "details", label: "Details", render: () => (
        <div className={s.stack}>
          <KeyValues items={[
            ...(a === undefined ? [] : [{ label: "Decides",
              value: whoIs(data, a.checkerId) }]),
            { label: "Receipt", value: x.receipt },
          ]} />
          {a !== undefined && verdict === undefined && !isChecker && (
            <div className={s.decide}>
              <p>{`Only ${data.employee(a.checkerId).name.en} can decide ` +
                "this claim. It also shows in their decisions on Home."}</p>
              {a.checkerId === data.runPeople().checkerId && (
                <button type="button" className={`${b.btn} ${b.secondary}`}
                  onClick={() => switchRole("gm")}>
                  View as General manager</button>
              )}
            </div>
          )}
          {a !== undefined && verdict !== undefined && (
            <div className={s.decide}>
              <p>{`${verdict === "approve" ? "Agreed" : "Declined"} by ` +
                whoIs(data, a.checkerId)}</p>
              {isChecker && (
                <button type="button" className={`${b.btn} ${b.quiet}`}
                  onClick={() => dispatch({ type: "undecide", id: a.id })}>
                  Take back decision</button>
              )}
            </div>
          )}
        </div>
      ) }]} />
  );
}
