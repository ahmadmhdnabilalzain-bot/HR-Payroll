import type { CompOffBalance } from "../../demo/data/finish-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { Status, Stack } from "../../people/papers/Status";
import { FilterList } from "../../ui/templates";
import s from "../../people/team/team.module.css";
import { F, fill } from "./words";

const W = F.compOff;

/**
 * T07, Comp-off days: days off earned by working a public holiday, with
 * a balance and an expiry. A register only: it does not change the
 * annual leave balance or any pay.
 */
export function CompOff() {
  const { data } = useDemo();
  const earned = data.finish.compOff();
  const rows = data.finish.balances();
  const listOf = (b: CompOffBalance): string => [...new Set(earned.filter(
    (r) => r.employeeId === b.employeeId).map((r) => r.holidayName))]
    .join(", ");
  const soon = (b: CompOffBalance): boolean => earned.some((r) =>
    r.employeeId === b.employeeId && r.status === "expiring");
  return (
    <>
      <FilterList title={W.title} lede={W.lede} rows={rows}
        rowKey={(b) => b.employeeId}
        searchText={(b) => `${b.name} ${b.title} ${listOf(b)}`}
        rowHref={(b) => hrefOf("people", b.employeeId)}
        segments={[
          { id: "all", label: W.all, match: () => true },
          { id: "take", label: W.withDays, match: (b) => b.available > 0 },
          { id: "soon", label: W.soon, match: soon },
          { id: "ran", label: W.ran, match: (b) => b.expired > 0 },
        ]}
        columns={[
          { key: "p", label: W.person, render: (b) => (
            <Stack main={b.name} sub={fill(W.worked,
              { list: listOf(b) })} />) },
          { key: "t", label: W.toTake, render: (b) => (
            <Status word={b.available > 0 ? b.display.available : W.none}
              tone={soon(b) ? "warn" : b.available > 0 ? "ok" : "quiet"} />
          ) },
          { key: "e", label: W.expiry, render: (b) => b.nextExpiry === null
            ? "" : b.nextExpiry.display },
          { key: "n", label: W.earned, render: (b) => fill(W.earnedText,
            { earned: b.earned, expired: b.expired }) },
        ]}
        empty={W.empty} />
      <section className={s.after}>
        <p className={s.note}>{data.finish.compOffNote}</p>
      </section>
    </>
  );
}
