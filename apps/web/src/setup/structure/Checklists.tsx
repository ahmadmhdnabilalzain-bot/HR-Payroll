import { hrefOf } from "../../demo/route";
import { FilterList, RecordTabs } from "../../ui/templates";
import type { StructureData } from "./data";
import { NotFound, Rows } from "./ui";

export function ChecklistsList(p: { d: StructureData }) {
  return (
    <FilterList title="Checklist templates"
      lede="The steps made for each new joiner and each leaver, who
        owns them and when they fall due."
      rows={p.d.checklists} rowKey={(c) => c.id}
      rowHref={(c) => hrefOf("setup", "structure", "checklists", c.id)}
      searchText={(c) => `${c.name} ${c.steps.map((x) => x.label)}`}
      columns={[
        { key: "n", label: "Checklist", render: (c) => c.name },
        { key: "s", label: "Steps", end: true,
          render: (c) => String(c.steps.length) },
        { key: "u", label: "In use", end: true,
          render: (c) => `${c.usedBy} now` }]}
      empty="No checklist templates." />
  );
}

export function ChecklistRecord(p: { d: StructureData; id: string }) {
  const c = p.d.checklists.find((x) => x.id === p.id);
  if (c === undefined) return <NotFound label="Checklist templates"
    back={hrefOf("setup", "structure", "checklists")} />;
  const owners = new Set(c.steps.map((x) => x.ownerText)).size;
  return (
    <RecordTabs title={c.name}
      lede={`Every step is counted from the ${c.anchor}.`}
      back={{ label: "Checklist templates",
        href: hrefOf("setup", "structure", "checklists") }}
      stats={[{ label: "Steps", value: String(c.steps.length) },
        { label: "Owners", value: String(owners) },
        { label: "In use now", value: String(c.usedBy) }]}
      tabs={[{ id: "steps", label: "Steps", render: () => (
        <Rows label="Steps" rows={c.steps.map((x) => ({ key: x.key,
          title: x.label, help: x.ownerText,
          value: x.display.due }))} />) }]} />
  );
}
