import type { LeaverChecklistView } from "../../demo/data/moves-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { Checklist } from "./Checklist";
import { Dot } from "./Dot";
import { EndingDetails } from "./Ending";
import { Missing } from "./Missing";
import { Settlement } from "./Settlement";
import { itemsNow, progressOf } from "./view";

const hrefLeaver = (id: string): string =>
  hrefOf("people", "moves", "leavers", id);

/** Leaver checklists (P15): the leaving checklist and the settlement. */
export function Leavers(p: { id?: string | undefined }) {
  return p.id === undefined ? <LeaverList /> : <LeaverRecord id={p.id} />;
}

function LeaverList() {
  const { data, state } = useDemo();
  const prog = (l: LeaverChecklistView) =>
    progressOf(itemsNow(l.id, l.items, state));
  return (
    <FilterList title="Leaver checklists" rows={data.moves.leavers()}
      lede="What to close, return and pay when someone leaves."
      rowKey={(l) => l.id} searchText={(l) => `${l.personName} ${l.title}`}
      rowHref={(l) => hrefLeaver(l.employeeId)}
      segments={[{ id: "all", label: "All", match: () => true },
        { id: "todo", label: "Still to do",
          match: (l) => prog(l).done < prog(l).of }]}
      columns={[
        { key: "n", label: "Person", render: (l) => l.personName },
        { key: "r", label: "Role", render: (l) => l.title },
        { key: "d", label: "Last working day",
          render: (l) => l.lastWorkingDay.display },
        { key: "s", label: "Settlement", end: true,
          render: (l) => <Money value={l.settlement.total.value} size="sm" />
        },
        { key: "p", label: "Checklist", end: true, render: (l) => {
          const x = prog(l);
          return (
            <Dot tone={x.done === x.of ? "ok" : "neutral"}>
              {x.done} of {x.of} done
            </Dot>
          );
        } }]}
      empty="Nobody is leaving. Leavers appear once a resignation is recorded."
    />
  );
}

function LeaverRecord(p: { id: string }) {
  const { data, state } = useDemo();
  const l = data.moves.leavers().find((x) => x.employeeId === p.id);
  if (l === undefined) return <Missing what="leaver" />;
  const rows = itemsNow(l.id, l.items, state);
  const x = progressOf(rows);
  const end = data.moves.endings().find((e) => e.employeeId === p.id);
  return (
    <RecordTabs title={l.personName} lede={l.title}
      back={{ label: "Leaver checklists",
        href: hrefOf("people", "moves", "leavers") }}
      stats={[{ label: "Last working day", value: l.lastWorkingDay.display },
        { label: "Checklist", value: `${x.done} of ${x.of}` },
        { label: "Settlement due by", value: l.settlement.dueOn.display }]}
      tabs={[
        { id: "checklist", label: "Checklist", render: () => (
          <Checklist listId={l.id} items={l.items} subject={l.personName} />
        ) },
        { id: "settlement", label: "Final settlement", render: () => (
          <Settlement leaver={l} />
        ) },
        { id: "ending", label: "Employment end", render: () => (
          end === undefined ? (
            <KeyValues items={[{ label: "Last working day",
              value: l.lastWorkingDay.display }]} />
          ) : <EndingDetails end={end} />
        ) }]} />
  );
}
