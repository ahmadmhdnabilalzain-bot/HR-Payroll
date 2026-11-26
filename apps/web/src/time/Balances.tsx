import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { annualNow, requestRows, usedHalves } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import { dayCountText } from "../people/words";
import { FilterList } from "../ui/templates";
import { useWho } from "./shared";

/** T04, Leave balances: everyone's annual days left (LF). */
export function Balances() {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const who = useWho();
  const rows = requestRows(data, state);
  const ids = data.people.people().filter((x) => who.visible.has(x.id) &&
    x.status !== "left").map((x) => x.id);
  const days = (h: number): string => dayCountText(h / 2, t, who.lang);
  const left = (id: string): number | null =>
    annualNow(data, state, id)?.availableDays ?? null;
  return (
    <FilterList title="Leave balances"
      lede="Annual leave left today, and sick and unpaid days used this year."
      rows={ids} rowKey={(id) => id}
      searchText={(id) => `${who.name(id)} ${who.jobOf(id)}`}
      rowHref={(id) => hrefOf("people", id)}
      segments={[
        { id: "all", label: "Everyone", match: () => true },
        { id: "low", label: "Under 5 days left", match: (id) =>
          (left(id) ?? 99) < 5 },
      ]}
      columns={[
        { key: "n", label: "Person", render: (id) => who.name(id) },
        { key: "a", label: "Annual left", end: true, render: (id) => {
          const v = left(id);
          return v === null ? "Not joined yet" : days(v * 2);
        } },
        { key: "s", label: "Sick used", end: true, render: (id) =>
          days(usedHalves(rows, id, "lt-sick")) },
        { key: "u", label: "Unpaid used", end: true, render: (id) =>
          days(usedHalves(rows, id, "lt-unpaid")) },
      ]}
      empty="No one matches. Pick another filter or clear the search." />
  );
}
