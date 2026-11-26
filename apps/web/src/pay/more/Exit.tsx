import { useState } from "react";
import { settlementLabel, settlementTotal } from "../../demo/figures";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { itemsNow } from "../../people/moves/view";
import { Checklist } from "../../people/moves/Checklist";
import { Settlement } from "../../people/moves/Settlement";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { FilterList, RecordTabs } from "../../ui/templates";
import { usePay } from "../load";
import { NotFound, Status } from "../parts";
import s from "../pay.module.css";
import { usePayMore } from "./load";
import type { PayMoreSource } from "./source";

type Flow = PayMoreSource["exits"][number];
const LIST = hrefOf("pay-run", "more", "exit");

/** R34: people leaving, each with one flow from resignation to pay. */
export function ExitList() {
  const { exits } = usePayMore();
  return (
    <FilterList title="People leaving"
      lede={"One flow from resignation to the final payment, with the " +
        "dates and checks that matter."}
      rows={exits} rowKey={(x) => x.employeeId}
      searchText={(x) => x.name}
      rowHref={(x) => hrefOf("pay-run", "more", "exit", x.employeeId)}
      columns={[
        { key: "who", label: "Person", render: (x) => x.name },
        { key: "last", label: "Last day", render: (x) => x.lastDay },
        { key: "chk", label: "To check", end: true, render: (x) =>
          `${x.flags.filter((f) => f.word === "Check").length} to check` },
      ]}
      empty={"Nobody is leaving. A flow appears here when an end of " +
        "employment is recorded on a profile."} />
  );
}

/** One person's exit: steps, flags and the settlement. */
export function ExitRecord(p: { id: string }) {
  const { exits } = usePayMore();
  const flow = exits.find((x) => x.employeeId === p.id);
  if (flow === undefined) {
    return <NotFound what="exit flow" back={{ label: "People leaving",
      href: LIST }} />;
  }
  return <Flow flow={flow} />;
}

function Flags(p: { flow: Flow }) {
  const { data, state } = useDemo();
  const l = data.moves.leavers().find((x) => x.employeeId ===
    p.flow.employeeId);
  const open = l === undefined ? [] : itemsNow(l.id, l.items, state)
    .filter((x) => x.state !== "done");
  return (
    <ul className={s.list} aria-label="Legal and pay flags">
      {open.length > 0 && (
        <li className={s.row}>
          <span className={s.rowText}>Steps still open
            <small>{open.map((x) => x.item.label).join("; ")}</small>
          </span>
          <span className={s.rowEnd}><Status tone="check">Check</Status>
          </span>
        </li>
      )}
      {p.flow.flags.map((f) => (
        <li key={f.id} className={s.row}>
          <span className={s.rowText}>{f.title}
            <small>{f.text}</small>
            {f.basis !== null && <small>Our reading: {f.basis}</small>}
          </span>
          <span className={s.rowEnd}>
            <Status tone={f.word === "Check" ? "check" : "neutral"}>
              {f.word}</Status>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Flow(p: { flow: Flow }) {
  const f = p.flow;
  const pay = usePay();
  const { data, state } = useDemo();
  const settlement = pay.settlements.find((x) => x.employeeId ===
    f.employeeId);
  const l = data.moves.leavers().find((x) => x.employeeId === f.employeeId);
  const [tab, setTab] = useState("steps");
  return (
    <RecordTabs title={f.name} lede={`${f.jobText}. ${f.noticeText}.`}
      back={{ label: "People leaving", href: LIST }} tab={tab} onTab={setTab}
      actions={(
        <a className={`${b.btn} ${b.primary}`}
          href={hrefOf("pay-run", "settlements", f.employeeId)}>
          Open the settlement
        </a>
      )}
      stats={[
        { label: "Last day", value: f.lastDay },
        { label: "Pay by", value: f.payBy },
        { label: settlementLabel(state, f.employeeId),
          value: settlement === undefined
          ? "Not worked out" : <Money value={settlementTotal(
            settlement.total, state, f.employeeId)} size="lg" /> },
      ]}
      tabs={[
        { id: "steps", label: "Steps", render: () => l === undefined
          ? <p className={s.muted}>No steps are recorded.</p>
          : <Checklist listId={l.id} items={l.items} subject={f.name} /> },
        { id: "flags", label: "To check", render: () => <Flags flow={f} /> },
        { id: "settlement", label: "Settlement", render: () =>
          l === undefined ? null : <Settlement leaver={l} /> },
      ]} />
  );
}
