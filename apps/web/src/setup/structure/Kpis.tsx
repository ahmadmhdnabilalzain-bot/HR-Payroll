import { RecordTabs } from "../../ui/templates";
import type { StructureData } from "./data";
import { Rows, Status } from "./ui";

/** S06: the goals departments pick from, and the periods they are
 * scored in. */
export function Kpis(p: { d: StructureData }) {
  const { d } = p;
  const open = d.periods.filter((x) => x.status === "Open").length;
  return (
    <RecordTabs title="KPI library and periods"
      lede="The goals departments pick from, and the review periods
        they are scored in."
      stats={[{ label: "Goals in the library",
        value: String(d.kpis.length) },
      { label: "Periods", value: String(d.periods.length) },
      { label: "Open now", value: String(open) }]}
      tabs={[
        { id: "library", label: "Library", render: () => (
          <Rows label="Library" empty="No goals in the library yet."
            rows={d.kpis.map((k) => ({ key: k.id, title: k.title,
              help: `${k.departmentText}. Target ${k.display.target}`,
              value: `Set for ${k.display.assigned}` }))} />) },
        { id: "periods", label: "Periods", render: () => (
          <Rows label="Periods" empty="No review periods yet."
            rows={d.periods.map((x) => ({ key: x.id, title: x.name,
              help: `${x.display.period}. Closes ${x.display.closes}`,
              value: (
                <Status tone={x.status === "Open" ? "ok" : "none"}>
                  {x.status}</Status>) }))} />) }]} />
  );
}
