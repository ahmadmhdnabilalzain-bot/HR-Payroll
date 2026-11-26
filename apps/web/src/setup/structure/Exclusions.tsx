import { FilterList } from "../../ui/templates";
import type { StructureData } from "./data";
import { Status, type Tone } from "./ui";

const WORD: Record<string, [string, Tone]> = {
  "not-computed": ["Not computed", "warn"],
  "not-applicable": ["Not applicable", "none"],
  "held-out": ["Held back", "danger"],
  "outside-run": ["Outside the run", "none"],
  probation: ["Unpaid", "none"],
};

/** S17: what the October run leaves out or holds back, and why. */
export function Exclusions(p: { d: StructureData }) {
  const { d } = p;
  return (
    <FilterList title="Pay exclusions"
      lede="What this month's pay run leaves out or holds back, and the
        reason. Each line is read from the person's record."
      rows={d.exclusions} rowKey={(r) => r.id}
      searchText={(r) => `${r.name} ${r.element} ${r.reason}`}
      segments={[{ id: "all", label: "All", match: () => true },
        { id: "pension", label: "Pension",
          match: (r) => r.element === "Pension" },
        { id: "gratuity", label: "Gratuity",
          match: (r) => r.element.startsWith("End-of") },
        { id: "other", label: "Other",
          match: (r) => r.element !== "Pension" &&
            !r.element.startsWith("End-of") }]}
      columns={[
        { key: "n", label: "Person", render: (r) => r.display.who },
        { key: "e", label: "Item", render: (r) => r.element },
        { key: "k", label: "Status", render: (r) => {
          const [w, tone] = WORD[r.kind] ?? [r.kind, "none"];
          return <Status tone={tone}>{w}</Status>; } },
        { key: "r", label: "Why", render: (r) => r.reason }]}
      empty="Nothing is left out of this month's run." />
  );
}
