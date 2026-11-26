import { FilterList } from "../../ui/templates";
import { Money } from "../../ui/Money";
import type { StructureData } from "./data";

/** S05: who signs off each kind of request, and above what amount. */
export function SignOff(p: { d: StructureData }) {
  return (
    <FilterList title="Sign-off levels"
      lede="Who signs off each kind of request. The person who prepares
        something never signs it off too."
      rows={p.d.levels} rowKey={(l) => l.ruleId}
      searchText={(l) => l.label + " " +
        l.steps.map((x) => x.who).join(" ")}
      columns={[
        { key: "n", label: "Request", render: (l) => l.label },
        { key: "l", label: "Limit", end: true,
          render: (l) => l.threshold === null ? "No amount limit" : (
            <span>{l.display.threshold.replace(/\s*AED.*$/, "")}{" "}
              <Money value={l.threshold} size="sm" /></span>) },
        { key: "r", label: "Signed off by", render: (l) => {
          const last = l.steps.at(-1)!;
          const first = l.steps.find((x) => x.action === "prepares");
          return first === undefined ? last.who
            : `${last.who} (${first.who} prepares)`; } }]}
      empty="No sign-off levels are set." />
  );
}
