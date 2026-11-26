import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { FilterList } from "../../ui/templates";
import { Stack, Status } from "../papers/Status";
import { expiryRows, whenOf } from "./model";
import { leftWord, V } from "./words";

/** P54: every dated paper, scans taken in here included. */
export function Expiry() {
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const rows = expiryRows(data, state, lang);
  const nameOf = (id: string): string =>
    data.people.person(id)?.name[lang] ?? id;
  return (
    <FilterList title={V.expiryTitle} lede={V.expiryLede} rows={rows}
      rowKey={(r) => r.id} searchText={(r) => `${nameOf(r.employeeId)} ${
        r.paper}`}
      rowHref={(r) => hrefOf("people", "files", "documents", r.employeeId)}
      segments={[
        { id: "all", label: V.segAll, match: () => true },
        { id: "soon", label: "Within 90 days",
          match: (r) => r.daysLeft <= 90 },
        { id: "taken", label: "Taken in", match: (r) =>
          r.via === "Taken in" },
      ]}
      columns={[
        { key: "p", label: V.paper, render: (r) => (
          <Stack main={r.paper} sub={nameOf(r.employeeId)} />) },
        { key: "e", label: V.expiresOn,
          render: (r) => whenOf(r.expiresIso, lang) },
        { key: "l", label: V.left, render: (r) => {
          const [word, tone] = leftWord(r.daysLeft);
          return <Status word={word} tone={tone} />;
        } },
        { key: "v", label: V.source, render: (r) => r.via },
      ]}
      empty={V.expiryEmpty} />
  );
}
