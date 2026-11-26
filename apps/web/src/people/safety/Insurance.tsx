import type { CoverRow } from "../../demo/data/safety-types";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { History } from "../papers/History";
import { Stack, Status } from "../papers/Status";
import { Outside } from "../team/common";
import { safetyHref, useSafety, type Safety } from "./common";
import { fill, T } from "./words";

const W = T.insurance;

type View = { word: string; card: string; status: CoverRow["status"] };

/** A row as it reads once this visit's card marks are laid over it. */
function viewOf(r: CoverRow, p: Safety): View {
  const m = p.marks[`card:${r.employeeId}`];
  if (r.status === "card-pending" && m !== undefined) {
    return { word: W.covered, card: W.issuedNow, status: "covered" };
  }
  return { word: r.display.status, card: r.display.card,
    status: r.status };
}

const tone = (s: CoverRow["status"]) =>
  s === "covered" ? "ok" as const : s === "ended" ? "quiet" as const
    : "warn" as const;

/** P46, Health insurance: a register of who is covered. */
export function Insurance(p: { rest: string[] }) {
  const sf = useSafety();
  const rows = sf.data.safety.cover();
  if (p.rest[0] !== undefined) {
    return <Cover row={rows.find((x) => x.employeeId === p.rest[0]) ??
      null} sf={sf} />;
  }
  return (
    <FilterList title={W.title} lede={`${W.lede} ${sf.data.safety
      .insuranceBasis}`} rows={rows} rowKey={(x) => x.id}
    searchText={(x) => `${x.name} ${x.jobText}`}
    rowHref={(x) => safetyHref("insurance", x.employeeId)}
    segments={[
      { id: "all", label: W.all, match: () => true },
      { id: "pending", label: W.pending, match: (x) =>
        viewOf(x, sf).status === "card-pending" },
      { id: "ended", label: W.ended, match: (x) => x.status === "ended" },
    ]}
    columns={[
      { key: "n", label: W.person, render: (x) => (
        <Stack main={x.name} sub={`${x.jobText}, ${x.placeText}`} />) },
      { key: "s", label: W.status, render: (x) => {
        const v = viewOf(x, sf);
        return <Status word={v.word} tone={tone(v.status)} />;
      } },
      { key: "c", label: W.card, render: (x) => viewOf(x, sf).card },
      { key: "r", label: W.renewal, render: (x) => x.display.renewal },
    ]}
    empty={W.empty} />
  );
}

function Cover(p: { row: CoverRow | null; sf: Safety }) {
  const r = p.row;
  if (r === null) return <Outside />;
  const key = `card:${r.employeeId}`;
  const m = p.sf.marks[key];
  const v = viewOf(r, p.sf);
  const pending = v.status === "card-pending";
  const issue = (): void => p.sf.mark(key, "issued",
    fill(W.issuedMsg, { name: r.name }));
  const marked = r.status === "card-pending" && m !== undefined;
  return (
    <RecordTabs title={r.name} back={{ label: W.back,
      href: safetyHref("insurance") }}
    stats={[{ label: W.status, value: v.word },
      { label: W.card, value: v.card },
      { label: W.renewal, value: r.renewalOn.display }]}
    actions={pending ? (
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={issue}>{W.issue}</button>) : undefined}
    tabs={[{ id: "cover", label: W.cover, render: () => (
      <>
        <KeyValues items={[
          { label: W.insurer, value: p.sf.data.safety.insurer },
          { label: W.job, value: r.jobText },
          { label: W.place, value: r.placeText },
          { label: W.starts, value: r.startsOn.display },
          ...(r.endsOn === null ? [] : [{ label: W.ends,
            value: r.endsOn.display }]),
          { label: W.card, value: v.card },
          { label: W.renews, value: r.renewalOn.display }]} />
        {marked && (
          <History items={[{ text: p.sf.byLine("Card marked issued", m),
            tone: "ok" }]} />)}
      </>) }]} />
  );
}
