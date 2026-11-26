import { hrefOf } from "../../demo/route";
import b from "../../ui/button.module.css";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { visaRows, type VisaRow } from "./model";
import { NotFound } from "./Outside";
import s from "./papers.module.css";
import { Stack, Status } from "./Status";
import { usePapers } from "./usePapers";
import { VISA_STATUS } from "./words";

const LIST = hrefOf("people", "papers", "visas");

/** P42: visa and Emirates ID cases. */
export function Visas() {
  const p = usePapers();
  const rows = visaRows(p.data, p.state);
  return (
    <FilterList title="Visas and government cases"
      lede="Renewals in progress, soonest expiry first. Government fees
        are not shown: the demo has no fee schedule."
      rows={rows} rowKey={(v) => v.id}
      searchText={(v) => `${v.kind} ${p.nameOf(v.employeeId)}`}
      rowHref={(v) => hrefOf("people", "papers", "visas", v.id)}
      segments={[
        { id: "open", label: "Open", match: (v) =>
          v.status !== "completed" },
        { id: "done", label: "Done", match: (v) =>
          v.status === "completed" },
        { id: "all", label: "All", match: () => true },
      ]}
      columns={[
        { key: "k", label: "Case", render: (v) => (
          <Stack main={v.kind} sub={p.nameOf(v.employeeId)} />) },
        { key: "e", label: "Expires", render: (v) =>
          v.expiresOn === null ? "" : p.when(v.expiresOn) },
        { key: "n", label: "Next step", render: (v) =>
          v.next === null ? "None" : v.next.label },
        { key: "s", label: "Status", render: (v) => {
          const [word, tone] = VISA_STATUS[v.status];
          return <Status word={word} tone={tone} />;
        } },
      ]}
      empty="No cases open. A renewal starts when a document is near its
        expiry." />
  );
}

function stageWhen(p: ReturnType<typeof usePapers>, g: VisaRow["stages"][0])
  : string {
  if (g.step !== null) return p.byLine("Done", g.step);
  if (g.done) return g.date === null ? "Done" : p.when(g.date);
  return g.date === null ? "Not booked" : `Booked for ${p.when(g.date)}`;
}

/** One case: its steps, and the next one to mark done. */
export function VisaRecord(props: { id: string }) {
  const p = usePapers();
  const v = visaRows(p.data, p.state).find((x) => x.id === props.id);
  if (v === undefined) {
    return <NotFound what="case" back="Visas" href={LIST} />;
  }
  const [word] = VISA_STATUS[v.status];
  const start = v.status === "to-start";
  const next = v.next;
  const actions = start ? (
    <button type="button" className={`${b.btn} ${b.primary}`}
      onClick={() => p.record(v.id, "in-progress",
        "Renewal started.", v.startStep)}>Start renewal</button>
  ) : next !== null ? (
    <button type="button" className={`${b.btn} ${b.primary}`}
      onClick={() => p.record(`${v.id}#${String(next.index)}`, "done",
        `${next.label} marked done.`, null)}>
      Mark done: {next.label}</button>
  ) : undefined;
  return (
    <RecordTabs title={v.kind} back={{ label: "Visas", href: LIST }}
      lede={`${p.nameOf(v.employeeId)}, ${p.roleOf(v.employeeId)}`}
      stats={[{ label: "Status", value: word },
        { label: "Expires", value: v.expiresOn === null ? "Not set"
          : p.when(v.expiresOn) },
        { label: "Days left", value: v.daysLeft === null ? "None"
          : String(v.daysLeft) }]}
      actions={actions}
      tabs={[
        { id: "steps", label: "Steps", render: () => (
          <ol className={s.steps}>
            {v.stages.map((g) => (
              <li key={g.index}>
                <span className={s.dot} aria-hidden="true"
                  data-tone={g.done ? "ok" : g === next ? "info"
                    : "quiet"} />
                <span>{g.label}</span>
                <span className={s.stepWhen}>{stageWhen(p, g)}</span>
              </li>
            ))}
          </ol>) },
        { id: "details", label: "Details", render: () => (
          <div className={s.block}>
            <KeyValues items={[
              { label: "Person", value: <a className={s.link}
                href={hrefOf("people", v.employeeId)}>
                {p.nameOf(v.employeeId)}</a> },
              { label: "Fees", value: v.feesNote },
            ]} />
          </div>) },
      ]} />
  );
}
