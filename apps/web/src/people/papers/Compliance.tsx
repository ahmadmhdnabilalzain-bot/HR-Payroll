import { hrefOf } from "../../demo/route";
import { FilterList } from "../../ui/templates";
import { complianceRows } from "./model";
import { Stack, Status } from "./Status";
import { usePapers } from "./usePapers";

/** P43: what needs attention across papers and rules, with a way in. */
export function Compliance() {
  const p = usePapers();
  const rows = complianceRows(p.data, p.state);
  return (
    <FilterList title="Compliance overview"
      lede="What is waiting on papers and rules, with a way in. It lists
        what we track; it does not say the company meets any rule."
      rows={rows} rowKey={(r) => r.id}
      rowHref={(r) => hrefOf(...r.href)}
      segments={[
        { id: "check", label: "Needs attention", match: (r) =>
          r.attention },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "a", label: "Area", render: (r) => (
          <Stack main={r.area} sub={r.finding} />) },
        { key: "s", label: "Status", render: (r) => (
          <Status word={r.word} tone={r.tone} />) },
      ]}
      empty="Nothing needs attention." />
  );
}
