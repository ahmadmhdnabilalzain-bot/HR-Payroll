import { hrefOf } from "../../demo/route";
import { FilterList } from "../../ui/templates";
import { Stack, Status } from "./Status";
import { usePapers } from "./usePapers";

/**
 * P44: who is in the national pension question. Nothing is computed:
 * which fund covers UAE nationals in Abu Dhabi is not confirmed, so
 * the page lists the people and says so, with no amounts.
 */
export function Pension() {
  const p = usePapers();
  const rows = p.data.people.people().filter((x) => x.status !== "left");
  return (
    <FilterList title="Pension (GPSSA)"
      lede={p.data.basis().pension[p.lang]}
      rows={rows} rowKey={(x) => x.id}
      searchText={(x) => `${x.name[p.lang]} ${x.nationality}`}
      rowHref={(x) => hrefOf("people", x.id)}
      segments={[
        { id: "nat", label: "UAE nationals", match: (x) => x.uaeNational },
        { id: "other", label: "Others", match: (x) => !x.uaeNational },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "n", label: "Person", render: (x) => (
          <Stack main={x.name[p.lang]} sub={x.role[p.lang]} />) },
        { key: "c", label: "Nationality", render: (x) =>
          new Intl.DisplayNames(["en"], { type: "region" })
            .of(x.nationality) ?? x.nationality },
        { key: "p", label: "Pension", render: (x) => (
          <Status word={x.uaeNational ? "Not computed" : "Not applicable"}
            tone={x.uaeNational ? "warn" : "quiet"} />) },
      ]}
      empty="Nobody here." />
  );
}
