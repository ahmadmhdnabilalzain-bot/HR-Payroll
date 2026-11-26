import type { PolicyView } from "../../demo/data/safety-types";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { History } from "../papers/History";
import { Stack, Status } from "../papers/Status";
import { Outside } from "../team/common";
import { safetyHref, useSafety, type Safety } from "./common";
import { fill, T } from "./words";
import s from "./safety.module.css";
import { SignLink } from "../esign/Sign";

const W = T.policies;

/** The reads once this visit's marks are laid over the data. */
function readCount(pol: PolicyView, sf: Safety): number {
  return pol.acks.filter((a) => a.done ||
    sf.marks[`ack:${pol.id}:${a.employeeId}`] !== undefined).length;
}

/** P53, Policy versions: version, date, owner and who has read it. */
export function Policies(p: { rest: string[] }) {
  const sf = useSafety();
  const rows = sf.data.safety.policies();
  if (p.rest[0] !== undefined) {
    return <Policy row={rows.find((x) => x.id === p.rest[0]) ?? null}
      sf={sf} />;
  }
  return (
    <FilterList title={W.title} lede={W.lede} rows={rows}
      rowKey={(x) => x.id} searchText={(x) => `${x.name} ${x.ownerName}`}
      rowHref={(x) => safetyHref("policies", x.id)}
      segments={[
        { id: "all", label: W.all, match: () => true },
        { id: "unread", label: W.toRead,
          match: (x) => readCount(x, sf) < x.total },
      ]}
      columns={[
        { key: "n", label: W.policy, render: (x) => (
          <Stack main={x.name} sub={x.display.version} />) },
        { key: "e", label: W.effective, render: (x) => x.effectiveOn.display },
        { key: "o", label: W.owner, render: (x) => x.ownerName },
        { key: "r", label: W.read, render: (x) => {
          const n = readCount(x, sf);
          return <Status word={`${n} of ${x.total}`}
            tone={n === x.total ? "ok" : "warn"} />;
        } },
      ]}
      empty={W.empty} />
  );
}

function Policy(p: { row: PolicyView | null; sf: Safety }) {
  const r = p.row;
  if (r === null) return <Outside />;
  const n = readCount(r, p.sf);
  return (
    <RecordTabs title={r.name} lede={r.summary}
      back={{ label: W.back, href: safetyHref("policies") }}
      stats={[{ label: W.version, value: r.version },
        { label: W.effective, value: r.effectiveOn.display },
        { label: W.read, value: `${n} of ${r.total}` }]}
      tabs={[
        { id: "about", label: W.about, render: () => (
          <>
            <KeyValues items={[
              { label: W.owner,
                value: `${r.ownerName}, ${r.ownerRole}` }]} />
            <h2 className={s.sub}>{W.history}</h2>
            <History items={r.history.map((h, i) => ({
              text: `Version ${h.version}`, when: h.effectiveOn.display
                + (i === 0 ? ` (${W.current})` : ""),
              tone: i === 0 ? "ok" as const : "quiet" as const }))} />
          </>) },
        { id: "acks", label: W.acks, render: () => (
          <>
            <p className={s.note}>{W.ackNote}</p>
            <ul className={s.rows} aria-label={W.acks}>
              {r.acks.map((a) => {
                const key = `ack:${r.id}:${a.employeeId}`;
                const m = p.sf.marks[key];
                const done = a.done || m !== undefined;
                return (
                  <li key={a.employeeId} className={s.row}>
                    <Stack main={a.name} sub={a.jobText} />
                    {done ? (
                      <Status tone="ok" word={m !== undefined
                        ? p.sf.byLine("Read and acknowledged", m)
                        : a.display.status} />
                    ) : (
                      <span className={s.undone}>
                        <Status tone="warn" word={a.newJoiner
                          ? `${W.notYet} (${W.joinedAfter})` : W.notYet} />
                        <button type="button"
                          className={`${b.btn} ${b.secondary}`}
                          aria-label={`${W.record}: ${a.name}`}
                          onClick={() => p.sf.mark(key, "read",
                            fill(W.recordedMsg, { name: a.name }))}>
                          {W.record}</button>
                        <SignLink docId={`policy:${r.id}:${a.employeeId}`} />
                      </span>)}
                  </li>);
              })}
            </ul>
          </>) },
      ]} />
  );
}
