import type { IncidentView } from "../../demo/data/safety-types";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { History, type HistoryItem } from "../papers/History";
import { Stack, Status } from "../papers/Status";
import { Outside } from "../team/common";
import { incidentStatus, safetyHref, useSafety, type Safety } from "./common";
import { fill, T } from "./words";

const W = T.incidents;

const STATUS_WORD = { open: "Open", "action-taken": "Action taken",
  closed: "Closed" } as const;
const STATUS_TONE = { open: "warn", "action-taken": "info",
  closed: "ok" } as const;
const SEVERITY_TONE = { low: "quiet", medium: "warn", high: "danger" } as
  const;

/** P48, Safety incidents: the log. */
export function Incidents(p: { rest: string[] }) {
  const sf = useSafety();
  const rows = sf.data.safety.incidents();
  if (p.rest[0] !== undefined) {
    return <Record row={rows.find((x) => x.id === p.rest[0]) ?? null}
      sf={sf} />;
  }
  const st = (x: IncidentView) => incidentStatus(x.status, sf.marks, x.id);
  return (
    <FilterList title={W.title} lede={W.lede} rows={rows}
      rowKey={(x) => x.id}
      searchText={(x) => `${x.title} ${x.involvedName} ${x.placeText}`}
      rowHref={(x) => safetyHref("incidents", x.id)}
      segments={[
        { id: "all", label: W.all, match: () => true },
        { id: "open", label: W.open, match: (x) => st(x) !== "closed" },
      ]}
      columns={[
        { key: "t", label: W.incident, render: (x) => (
          <Stack main={x.title} sub={x.display.when} />) },
        { key: "v", label: W.severity, render: (x) => (
          <Status word={x.severityWord} tone={SEVERITY_TONE[x.severity]} />) },
        { key: "w", label: "Involved", render: (x) => x.involvedName },
        { key: "s", label: W.status, render: (x) => (
          <Status word={STATUS_WORD[st(x)]} tone={STATUS_TONE[st(x)]} />) },
      ]}
      empty={W.empty} />
  );
}

function historyOf(r: IncidentView, sf: Safety): HistoryItem[] {
  const out: HistoryItem[] = [{ text: `${W.reported} by ` +
    `${r.reportedByName}, ${r.happenedOn.display}`, tone: "info" }];
  for (const a of r.actions) {
    out.push({ text: `${a.text} (${a.byName})`, when: a.on.display,
      tone: "ok" });
  }
  const act = sf.marks[`inc:${r.id}`];
  if (act !== undefined) {
    out.push({ text: sf.byLine(act.status === "closed"
      ? "Closed" : "Action recorded", act), tone: "ok" });
  }
  return out;
}

function Record(p: { row: IncidentView | null; sf: Safety }) {
  const r = p.row;
  if (r === null) return <Outside />;
  const status = incidentStatus(r.status, p.sf.marks, r.id);
  const next = status === "open" ? "action-taken"
    : status === "action-taken" ? "closed" : null;
  const go = (): void => {
    if (next === null) return;
    p.sf.mark(`inc:${r.id}`, next, next === "closed"
      ? fill(W.closedMsg, { title: r.title })
      : fill(W.recordedMsg, { title: r.title }));
  };
  return (
    <RecordTabs title={r.title} lede={W.scope}
      back={{ label: W.back, href: safetyHref("incidents") }}
      stats={[{ label: W.severity, value: r.severityWord },
        { label: W.status, value: STATUS_WORD[status] },
        { label: W.date, value: r.happenedOn.display }]}
      actions={next === null ? undefined : (
        <button type="button" className={`${b.btn} ${b.primary}`}
          onClick={go}>{next === "closed" ? W.close : W.record}</button>)}
      tabs={[
        { id: "details", label: W.details, render: () => (
          <KeyValues items={[
            { label: W.what, value: r.what },
            { label: W.involved, value: r.involvedName },
            { label: W.reportedBy, value: r.reportedByName },
            { label: W.place, value: r.placeText },
            { label: W.date, value: r.happenedOn.display }]} />) },
        { id: "actions", label: W.actions, render: () => (
          <>
            {r.actions.length === 0 && p.sf.marks[`inc:${r.id}`] ===
              undefined && <p>{W.noActions}</p>}
            <History items={historyOf(r, p.sf)} />
          </>) },
      ]} />
  );
}
