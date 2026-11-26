import type { IloeRow } from "../../demo/data/safety-types";
import { useDemo } from "../../demo/state";
import { FilterList } from "../../ui/templates";
import { Stack, Status } from "../papers/Status";
import { T } from "./words";

const W = T.iloe;
const TONE = { subscribed: "ok", due: "warn", exempt: "quiet" } as const;

/**
 * P52, ILOE insurance: a status per person, as we read the rules.
 * Read only: nothing is sent to any authority from here.
 */
export function Iloe() {
  const { data } = useDemo();
  const rows = data.safety.iloe();
  const is = (s: IloeRow["status"]) => (x: IloeRow) => x.status === s;
  return (
    <FilterList title={W.title}
      lede={`${data.safety.iloeBasis} ${data.safety.iloeExemptNote}`}
      rows={rows} rowKey={(x) => x.id}
      searchText={(x) => `${x.name} ${x.jobText}`}
      segments={[
        { id: "all", label: W.all, match: () => true },
        { id: "due", label: W.due, match: is("due") },
        { id: "subscribed", label: W.subscribed, match: is("subscribed") },
        { id: "exempt", label: W.exempt, match: is("exempt") },
      ]}
      columns={[
        { key: "n", label: W.person, render: (x) => (
          <Stack main={x.name} sub={x.jobText} />) },
        { key: "s", label: W.status, render: (x) => (
          <Status word={x.display.status} tone={TONE[x.status]} />) },
        { key: "d", label: W.note, render: (x) => x.display.note },
      ]}
      empty={W.empty} />
  );
}
