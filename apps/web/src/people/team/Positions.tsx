import type { StaffPosition } from "../../demo/data/team-types";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { FilterList } from "../../ui/templates";
import { profileHref, Status } from "./common";
import { fill, W } from "./words";
import s from "./team.module.css";

const word = (x: StaffPosition): string => x.vacantSince === null
  ? x.statusText : `${x.statusText} since ${x.vacantSince.display}`;

/** Who sits in a seat, or what is open about it. */
function whoText(x: StaffPosition): string {
  if (x.incumbentName !== null) return x.incumbentName;
  if (x.pendingHire !== null) return x.pendingHire;
  if (x.formerIncumbentName !== null) {
    return `Was ${x.formerIncumbentName}`;
  }
  return "Open";
}

/**
 * P06, Positions and headcount: one row per seat. A filled seat opens
 * its person. The pay band is the bank's grade band for the seat.
 */
export function Positions() {
  const { data } = useDemo();
  const rank = (x: StaffPosition): number => x.status === "filled" ? 1 : 0;
  const rows = [...data.team.positions()].sort((a, b) =>
    rank(a) - rank(b));
  const seats = data.team.seats();
  const open = seats.reduce((n, d) => n + d.vacant + d.onHold, 0);
  const w = W.positions;
  const tone = (x: StaffPosition) => x.status === "filled" ? "ok" as const
    : x.status === "on-hold" ? "plain" as const : "warn" as const;
  return (
    <FilterList title={w.title}
      lede={`${w.lede} ${fill("{n} open.", { n: open })}`}
      rows={rows} rowKey={(x) => x.id}
      searchText={(x) => `${x.title} ${x.departmentText} ${x.locationText} ` +
        whoText(x)}
      segments={[
        { id: "all", label: w.all, match: () => true },
        { id: "filled", label: w.filled, match: (x) => x.status === "filled" },
        { id: "vacant", label: w.vacant, match: (x) => x.status === "vacant" },
        { id: "hold", label: w.hold, match: (x) => x.status === "on-hold" },
      ]}
      rowHref={(x) => (x.incumbentId === null ? undefined
        : profileHref(x.incumbentId)) as string}
      columns={[
        { key: "seat", label: w.seat, render: (x) => (
          <span className={s.name}>
            <span>{x.title}</span>
            <span className={s.sub}>
              {x.departmentText}, {x.locationText.split(",")[0]}
            </span>
          </span>) },
        { key: "who", label: w.who, render: whoText },
        { key: "st", label: w.status,
          render: (x) => <Status tone={tone(x)}>{word(x)}</Status> },
        { key: "band", label: w.band, end: true, render: (x) => (
          <span>
            <Money value={x.basicMin.value} size="sm" tween={false} />
            {" to "}
            <Money value={x.basicMax.value} size="sm" tween={false} />
          </span>) },
      ]}
      empty={w.empty} />
  );
}
