import { useState } from "react";
import { Explainable } from "../components/explain";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import b from "../ui/button.module.css";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";
import {
  ApprovalForm,
  FilterList,
  KeyValues,
  RecordTabs,
} from "../ui/templates";
import { requestsOf, requestState } from "./derive";
import { usePay } from "./load";
import {
  NotFound,
  RequestPanel,
  RequestStatus,
  Status,
  useMakerChecker,
} from "./parts";
import type { PayRequest } from "./pay-state";
import s from "./pay.module.css";
import type { SettlementView } from "./types";
import { signTab } from "../people/esign/Sign";

const LIST = hrefOf("pay-run", "settlements");

/** The live request for a leaver's settlement, if one was sent. */
function useSent(employeeId: string): PayRequest | undefined {
  const { state } = useDemo();
  return requestsOf(state, ["settlement"]).find((r) =>
    r.employeeId === employeeId && requestState(state, r) !== "withdrawn");
}

function SentStatus(p: { x: SettlementView }) {
  const sent = useSent(p.x.employeeId);
  return sent === undefined ? <Status tone="check">To send</Status>
    : <RequestStatus r={sent} />;
}

/** R31: final settlements for people leaving, paid outside the run. */
export function Settlements() {
  const pay = usePay();
  return (
    <FilterList title="Final settlements"
      lede={"Gratuity and unused leave for people leaving. A settlement " +
        "is paid on its own, outside the pay run and the salary file."}
      rows={pay.settlements} rowKey={(x) => x.employeeId}
      searchText={(x) => x.name}
      rowHref={(x) => hrefOf("pay-run", "settlements", x.employeeId)}
      columns={[
        { key: "who", label: "Person", render: (x) => x.name },
        { key: "last", label: "Last day", render: (x) => x.lastDay },
        { key: "due", label: "Pay by", render: (x) => x.due },
        { key: "tot", label: "Worked out", end: true, render: (x) =>
          <Money value={x.total} size="sm" /> },
        { key: "st", label: "Status", render: (x) => <SentStatus x={x} /> },
      ]}
      empty={"Nobody is leaving. A settlement appears here when an " +
        "end of employment is recorded on a profile."} />
  );
}

export function SettlementRecord(p: { id: string }) {
  const pay = usePay();
  const x = pay.settlements.find((y) => y.employeeId === p.id);
  if (x === undefined) {
    return <NotFound what="settlement" back={{ label: "Final settlements",
      href: LIST }} />;
  }
  return <Statement x={x} />;
}

/** R32: the settlement statement, each figure with its working. */
function Statement(p: { x: SettlementView }) {
  const x = p.x;
  const { data, state, dispatch } = useDemo();
  const detail = useRunDetail();
  const toast = useToast();
  const mc = useMakerChecker();
  const sent = useSent(x.employeeId);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("statement");
  const ex = detail.explain[x.explainId];
  return (
    <>
      <RecordTabs title={x.name} lede={`Final settlement, last day ` +
        `${x.lastDay}`} back={{ label: "Final settlements", href: LIST }}
        tab={tab} onTab={setTab}
        actions={(
          <>
            <button type="button" className={`${b.btn} ${b.quiet}`}
              onClick={() => print()}>Print</button>
            {sent === undefined && (
              <button type="button" className={`${b.btn} ${b.primary}`}
                onClick={() => setOpen(true)}>Send for a decision</button>
            )}
          </>
        )}
        stats={[
          { label: "Worked out so far", value: (
            <Money value={x.total} size="lg" />) },
          { label: "Gratuity", value: (
            <Explainable explanation={ex}>
              <Money value={x.gratuity} size="lg" />
            </Explainable>) },
          { label: "Unused leave", value: (
            <Money value={x.leavePay} size="lg" />) },
        ]}
        tabs={[
          { id: "statement", label: "Statement", render: () => (
            <div className={s.stack}>
              <ul className={s.list} aria-label="Statement">
                <li className={s.row}>
                  <span className={s.rowText}>End-of-service gratuity
                    <small>Worked out from service and last basic</small>
                  </span>
                  <span className={s.rowEnd}>
                    <Money value={x.gratuity} size="sm" /></span>
                </li>
                <li className={s.row}>
                  <span className={s.rowText}>Unused annual leave
                    <small>{x.unusedLeave}, at basic salary</small>
                  </span>
                  <span className={s.rowEnd}>
                    <Money value={x.leavePay} size="sm" /></span>
                </li>
                {x.notComputed.map((n) => (
                  <li key={n} className={s.row}>
                    <span className={s.rowText}>
                      {n.charAt(0).toUpperCase() + n.slice(1)}
                      <small>To add by hand before paying</small>
                    </span>
                    <span className={`${s.rowEnd} ${s.muted}`}>
                      Not worked out</span>
                  </li>
                ))}
                <li className={s.row}>
                  <span className={s.rowText}><strong>Total so far
                  </strong></span>
                  <span className={s.rowEnd}>
                    <Money value={x.total} size="md" /></span>
                </li>
              </ul>
              <p className={s.note}>Pay by{" "}
                <Explainable explanation={x.dueExplanation}>{x.due}
                </Explainable>. Paid on its own, outside the salary
                file.</p>
            </div>
          ) },
          { id: "dates", label: "Dates", render: () => (
            <KeyValues items={[
              { label: "Last working day", value: x.lastDay },
              { label: "Pay by", value: (
                <Explainable explanation={x.dueExplanation}>{x.due}
                </Explainable>) },
              { label: "Unused leave", value: x.unusedLeave },
              { label: "Status", value: <SentStatus x={x} /> },
            ]} />) },
          ...(sent === undefined ? [] : [{ id: "decision",
            label: "Decision", render: () => (
              <RequestPanel r={sent} what="Settlement" />) }]),
          signTab(`settle:${x.employeeId}`),
        ]} />
      {open && (
        <ApprovalForm open title="Send the settlement for a decision"
          maker={mc.maker} checker={mc.checker}
          submitLabel="Send for a decision" onClose={() => setOpen(false)}
          onSubmit={(v) => {
            dispatch({ type: "pay-request", draft: { kind: "settlement",
              employeeId: x.employeeId, amount: x.total, months: null,
              month: null, effective: null,
              reason: (v["note"] ?? "").trim(), requestedOn: mc.today,
              makerId: mc.makerId, checkerId: mc.checkerId } });
            const id = `pay-new-${state.nextPay}`;
            setTab("decision");
            toast.show(`Sent to ${data.employee(mc.checkerId).name.en} ` +
              "to decide", () => dispatch({ type: "pay-withdraw", id }));
            return null;
          }}
          fields={[
            { key: "note", label: "Note for the decision", kind: "textarea",
              help: "Notice pay and deductions are not worked out yet; " +
                "say how they will be settled." },
          ]} />
      )}
    </>
  );
}
