import { FilterList } from "../../ui/templates";
import type { StructureData } from "./data";
import { Status } from "./ui";

/** S18: the readers and phones that feed attendance. */
export function Devices(p: { d: StructureData }) {
  return (
    <FilterList title="Attendance devices and feeds"
      lede="The clocks and phones that send punches in. Punches that
        match no one wait to be matched on the attendance screens."
      rows={p.d.devices} rowKey={(x) => x.id}
      searchText={(x) => `${x.label} ${x.display.where}`}
      segments={[{ id: "all", label: "All", match: () => true },
        { id: "reader", label: "Readers",
          match: (x) => x.kind === "reader" },
        { id: "phone", label: "Phones",
          match: (x) => x.kind === "phone" },
        { id: "match", label: "To match",
          match: (x) => x.unmatched > 0 }]}
      columns={[
        { key: "n", label: "Device", render: (x) => x.label },
        { key: "w", label: "Where", render: (x) => x.display.where },
        { key: "l", label: "Last", render: (x) => x.display.lastPunch },
        { key: "t", label: "Today", render: (x) => (
          <Status tone={x.unmatched > 0 ? "warn" : "ok"}>
            {x.punchesToday} today, {x.unmatched} to match</Status>) }]}
      empty="No devices are connected." />
  );
}
