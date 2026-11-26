import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import type { AccessData } from "./data";
import { NotFound } from "./Users";
import { Status, stampText, useActor } from "./ui";
import s from "./access.module.css";

const BTN2 = `${b.btn} ${b.secondary} ${s.tap}`;
const BTNQ = `${b.btn} ${b.quiet} ${s.tap}`;
const hookHref = (...r: string[]): string =>
  hrefOf("setup", "connections", "hooks", ...r);

/** S30: keys other software uses to read data. Always masked. */
export function Keys(p: { d: AccessData }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const revoked = (id: string): boolean => state.keysRevoked[id] !== undefined;
  /** Revoke and restore both write to the audit trail (append only:
   * an undo adds a "restored" entry, it never removes one). */
  const log = (k: { id: string; name: string }, on: boolean): void =>
    dispatch({ type: "audit-append", entry: {
      action: on ? "access.api-key-revoked" : "access.api-key-restored",
      area: "access", actorId: personFor(data, state.role),
      on: data.payCalendar().asOf,
      subject: { kind: "api-key", id: k.id, label: k.name },
      summary: `${actor.name} ${on ? "revoked" : "restored"} the API ` +
        `key "${k.name}".` } });
  const restore = (k: { id: string; name: string }): void => {
    dispatch({ type: "key-restore", id: k.id });
    log(k, false);
  };
  return (
    <FilterList title="API keys"
      lede="Keys let other software read data. Each one is read only and is
        always shown masked."
      rows={p.d.keys} rowKey={(k) => k.id}
      searchText={(k) => `${k.name} ${k.scopesText}`}
      segments={[{ id: "all", label: "All", match: () => true },
        { id: "active", label: "Active", match: (k) => !revoked(k.id) },
        { id: "revoked", label: "Revoked", match: (k) => revoked(k.id) }]}
      columns={[{ key: "n", label: "Name", render: (k) => k.name },
        { key: "k", label: "Key", render: (k) => (
          <span className={s.mono} dir="ltr">{k.masked}</span>) },
        { key: "s", label: "Can", render: (k) => k.scopesText },
        { key: "u", label: "Last used", render: (k) => k.lastUsedText },
        { key: "c", label: "Calls, 30 days", end: true,
          render: (k) => k.callsLast30Days },
        { key: "a", label: "Status", end: true, render: (k) => {
          const r = state.keysRevoked[k.id];
          return r === undefined ? (
            <span className={s.itemEnd}>
              <Status tone="ok">Active</Status>
              <button type="button" className={BTN2}
                onClick={() => {
                  dispatch({ type: "key-revoke", id: k.id,
                    stamp: actor.stamp() });
                  log(k, true);
                  toast.show(`${k.name} revoked. Written to the audit ` +
                    "trail.", () => restore(k));
                }}>Revoke</button>
            </span>
          ) : (
            <span className={s.itemEnd}>
              <Status tone="none">Revoked by {r.by}, {r.on}</Status>
              <button type="button" className={BTNQ}
                onClick={() => restore(k)}>Undo</button>
            </span>
          );
        } }]}
      empty="No keys here." />
  );
}

/** S31: where events are sent, and whether the last one got through. */
export function Hooks(p: { d: AccessData }) {
  return (
    <FilterList title="Webhooks"
      lede="Webhooks tell other systems when something happens here."
      rows={p.d.hooks} rowKey={(h) => h.id}
      rowHref={(h) => hookHref(h.id)} searchText={(h) => h.name}
      columns={[{ key: "n", label: "Name", render: (h) => h.name },
        { key: "e", label: "Sends", render: (h) =>
          h.events.map(eventText).join(", ") },
        { key: "s", label: "Last delivery", render: (h) => (
          <Status tone={h.status === "failing" ? "danger" : "ok"}>
            {h.status === "failing" ? "Failing" : "Working"}
          </Status>) },
        { key: "t", label: "Last at", end: true, render: (h) =>
          h.deliveries.at(-1)?.atText ?? "No events yet" }]}
      empty="No webhooks yet." />
  );
}

const EVENT: Record<string, string> = {
  "payrun.approved": "Pay run: approval given",
  "employee.created": "New starter added",
};
const eventText = (id: string): string => EVENT[id] ?? id;

const OUTCOME: Record<string, string> = { delivered: "Delivered",
  retried: "Delivered on retry", failed: "Not delivered" };

export function HookRecord(p: { d: AccessData; id: string; tab: string;
  onTab(t: string): void }) {
  const h = p.d.hooks.find((x) => x.id === p.id);
  const { state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  if (h === undefined) {
    return <NotFound back={hrefOf("setup", "connections", "hooks")} />;
  }
  return (
    <RecordTabs title={h.name}
      lede={h.statusText}
      back={{ label: "Webhooks", href: hrefOf("setup", "connections",
        "hooks") }}
      stats={[{ label: "Status", value: h.status === "failing"
        ? "Failing" : "Working" },
      { label: "Deliveries", value: h.deliveries.length },
      { label: "Sends", value: h.events.map(eventText).join(", ") }]}
      tab={p.tab === "settings" ? "settings" : "deliveries"}
      onTab={p.onTab}
      tabs={[{ id: "deliveries", label: "Deliveries", render: () => (
        <ul className={s.panel}>
          {[...h.deliveries].reverse().map((x) => {
            const again = state.hooksResent[x.id];
            return (
              <li key={x.id} className={s.item}>
                <span className={s.itemMain}>
                  <span>{eventText(x.eventAction)}, {x.atText}</span>
                  <small>
                    {x.note} {x.attempts > 1
                      ? `${x.attempts} attempts.` : ""}
                    {again !== undefined && ` Sent again by ${
                      stampText(again)} (the demo sends nothing outside
                      your browser).`}
                  </small>
                </span>
                <span className={s.itemEnd}>
                  <Status tone={x.outcome === "failed" ? "danger"
                    : "ok"}>{OUTCOME[x.outcome]}</Status>
                  {x.outcome === "failed" && (again === undefined ? (
                    <button type="button" className={BTN2}
                      onClick={() => {
                        dispatch({ type: "hook-resend", id: x.id,
                          stamp: actor.stamp() });
                        toast.show("Queued to send again. The demo sends " +
                          "nothing outside your browser.", () => dispatch(
                          { type: "hook-unresend", id: x.id }));
                      }}>Send again</button>
                  ) : (
                    <button type="button" className={BTNQ}
                      onClick={() => dispatch({ type: "hook-unresend",
                        id: x.id })}>Undo</button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>) },
      { id: "settings", label: "Settings", render: () => (
        <KeyValues items={[{ label: "Address", value: (
          <span className={s.mono} dir="ltr">{h.url}</span>) },
        { label: "Signing secret", value: (
          <span className={s.mono} dir="ltr">{h.secretMasked}</span>) },
        { label: "Sends", value: h.events.map(eventText).join(", ") },
        { label: "Added", value: `${h.createdText} by ${
          p.d.names[h.createdById] ?? ""}` }]} />) }]} />
  );
}
