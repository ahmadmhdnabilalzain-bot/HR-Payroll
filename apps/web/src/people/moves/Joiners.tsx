import type { JoinerChecklistView } from "../../demo/data/moves-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { Money } from "../../ui/Money";
import { Checklist } from "./Checklist";
import { Dot } from "./Dot";
import { Missing } from "./Missing";
import { itemsNow, progressOf } from "./view";
import { packTab } from "../esign/Sign";

const hrefJoiner = (id: string): string =>
  hrefOf("people", "moves", "joiners", id);

/** Joiner checklists (P14): who is joining, and what is still to do. */
export function Joiners(p: { id?: string | undefined }) {
  return p.id === undefined ? <JoinerList /> : <JoinerRecord id={p.id} />;
}

function useProgress() {
  const { state } = useDemo();
  return (j: JoinerChecklistView) =>
    progressOf(itemsNow(j.id, j.items, state));
}

function JoinerList() {
  const { data } = useDemo();
  const progress = useProgress();
  const rows = data.moves.joiners();
  const left = (j: JoinerChecklistView): number => {
    const x = progress(j);
    return x.of - x.done;
  };
  return (
    <FilterList title="Joiner checklists" rows={rows}
      lede="Everything to have ready before and on the first day."
      rowKey={(j) => j.id} searchText={(j) => `${j.personName} ${j.title}`}
      rowHref={(j) => hrefJoiner(j.id)}
      segments={[{ id: "all", label: "All", match: () => true },
        { id: "todo", label: "Still to do", match: (j) => left(j) > 0 },
        { id: "ready", label: "Ready", match: (j) => left(j) === 0 }]}
      columns={[
        { key: "n", label: "Person", render: (j) => j.personName },
        { key: "r", label: "Role", render: (j) => j.title },
        { key: "d", label: "Joins", render: (j) => j.joiningDate.display },
        { key: "p", label: "Checklist", end: true, render: (j) => {
          const x = progress(j);
          return (
            <Dot tone={x.done === x.of ? "ok" : "neutral"}>
              {x.done} of {x.of} done
            </Dot>
          );
        } }]}
      empty="Nobody is joining. New hires appear once an offer is accepted."
    />
  );
}

function JoinerRecord(p: { id: string }) {
  const { data, state } = useDemo();
  const j = data.moves.joiners().find((x) => x.id === p.id);
  if (j === undefined) return <Missing what="joiner" />;
  const rows = itemsNow(j.id, j.items, state);
  const x = progressOf(rows);
  const late = rows.filter((r) => r.state === "overdue").length;
  const cand = data.moves.candidates().find((c) => c.id === j.candidateId);
  const offer = data.moves.offers().find((o) => o.id === cand?.offerId);
  return (
    <RecordTabs title={j.personName} lede={j.title}
      back={{ label: "Joiner checklists",
        href: hrefOf("people", "moves", "joiners") }}
      stats={[{ label: "Joins", value: j.joiningDate.display },
        { label: "Done", value: `${x.done} of ${x.of}` },
        { label: "Overdue", value: late }]}
      tabs={[
        { id: "checklist", label: "Checklist", render: () => (
          <Checklist listId={j.id} items={j.items} subject={j.personName} />
        ) },
        { id: "hire", label: "The hire", render: () => (
          <KeyValues items={[
            { label: "Role", value: j.title },
            { label: "Joins", value: j.joiningDate.display },
            { label: "Offer", value: offer === undefined ? "None on file"
              : <a href={hrefOf("people", "moves", "offers", offer.id)}>
                {offer.number}</a> },
            { label: "Monthly pay", value: offer === undefined ? "None"
              : <Money value={offer.gross} /> },
            { label: "Staff list", value: j.employeeId === null
              ? "Not on the staff list yet"
              : <a href={hrefOf("people", j.employeeId)}>Open profile</a> }]}
          />
        ) }, packTab(j.employeeId ?? cand?.offerId)]} />
  );
}
