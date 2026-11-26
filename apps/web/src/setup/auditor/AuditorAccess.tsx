import { useState, type FormEvent } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { useLocale } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/t";
import type { AuditData } from "../../reports/inspection/data";
import { useAuditDataSoft } from "../../reports/inspection/load";
import a from "../../reports/inspection/audit.module.css";
import b from "../../ui/button.module.css";
import { Sheet, KeyValues, RecordTabs } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { Loading, Status, stampText } from "../access/ui";
import type { Stamp } from "../access/state";

const ROLE_KEY: Record<string, MessageKey> = { hr: "shell.roleHr",
  gm: "shell.roleGm", it: "shell.roleIt", manager: "shell.roleManager",
  employee: "shell.roleEmployee" };

/** Who is acting, for the stamp on every change. */
function useStamp(asOfText: string): { make(): Stamp; canGrant: boolean } {
  const { data, state } = useDemo();
  const { t } = useLocale();
  const name = data.employee(personFor(data, state.role)).name.en;
  const role = t(ROLE_KEY[state.role] ?? "shell.roleHr");
  return { make: () => ({ by: name, role, on: asOfText }),
    canGrant: state.role === "gm" || state.role === "it" };
}

function GrantSheet(p: { d: AuditData; open: boolean; onClose(): void;
  title: string; mode: "grant" | "end-date" }) {
  const { d } = p;
  const { state, dispatch } = useDemo();
  const toast = useToast();
  const who = useStamp(d.asOfText);
  const g = state.auditorGrant;
  const [v, setV] = useState({ name: "", firm: "", email: "",
    from: d.asOfIso, to: g?.toIso ?? "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, x: string): void => {
    setV({ ...v, [k]: x });
    setError(null);
  };
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (p.mode === "grant") {
      if (v.name.trim() === "") return setError("Enter the auditor's name.");
      if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) {
        return setError("Enter the auditor's e-mail, for example " +
          "name@firm.example.");
      }
    }
    const from = p.mode === "grant" ? v.from : g?.fromIso ?? v.from;
    const problem = d.problem(from, v.to);
    if (problem !== null) return setError(problem);
    if (p.mode === "grant") {
      dispatch({ type: "auditor-grant", grant: { name: v.name.trim(),
        firm: v.firm.trim(), email: v.email.trim(), fromIso: v.from,
        toIso: v.to, stamp: who.make() } });
      toast.show(`Read-only access given to ${v.name.trim()} until ${
        d.dateText(v.to)}.`, () => dispatch({ type: "auditor-ungrant" }));
    } else if (g !== null) {
      const id = `aud-chg-${state.nextAuditor}`;
      dispatch({ type: "auditor-end-date", toIso: v.to,
        stamp: who.make() });
      toast.show(`Access now ends ${d.dateText(v.to)}.`, () => dispatch(
        { type: "auditor-end-date-undo", toIso: g.toIso, id }));
    }
    p.onClose();
  };
  const fill = (): void => {
    setV({ name: d.sample.name, firm: d.sample.firm, email: d.sample.email,
      from: d.sample.fromIso, to: d.sample.toIso });
    setError(null);
  };
  return (
    <Sheet open={p.open} title={p.title} onClose={p.onClose}>
      <form className={a.form} onSubmit={submit} noValidate>
        {p.mode === "grant" && (
          <>
            <button type="button" className={`${b.btn} ${b.secondary} ${
              a.tap}`} onClick={fill}>Fill from the engagement letter
            </button>
            <label className={a.field}><span>Auditor's name</span>
              <input value={v.name} autoComplete="off"
                onChange={(e) => set("name", e.target.value)} /></label>
            <label className={a.field}><span>Firm</span>
              <input value={v.firm} autoComplete="off"
                onChange={(e) => set("firm", e.target.value)} /></label>
            <label className={a.field}><span>E-mail</span>
              <input type="email" value={v.email} autoComplete="off"
                onChange={(e) => set("email", e.target.value)} /></label>
            <label className={a.field}><span>Access starts</span>
              <input type="date" value={v.from}
                onChange={(e) => set("from", e.target.value)} /></label>
          </>
        )}
        <label className={a.field}><span>Access ends</span>
          <input type="date" value={v.to}
            onChange={(e) => set("to", e.target.value)} />
          <small>Required. {d.maxNote}</small></label>
        <p className={a.sub}>Role: {d.sample.roleLabel}. The auditor can
          read, never change.</p>
        {error !== null && <p className={a.error} role="alert">{error}</p>}
        <div className={a.formActions}>
          <button type="submit" className={`${b.btn} ${b.primary} ${a.tap}`}>
            {p.mode === "grant" ? "Give access" : "Save the end date"}
          </button>
          <button type="button" className={`${b.btn} ${b.quiet} ${a.tap}`}
            onClick={p.onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

function List(p: { items: string[]; empty?: string }) {
  return p.items.length === 0 ? <p className={a.empty}>{p.empty}</p> : (
    <ul className={a.panel}>
      {p.items.map((x) => <li key={x} className={a.row}>{x}</li>)}
    </ul>
  );
}

/** S25: give an outside auditor read-only access that ends on a date. */
export function AuditorAccess() {
  const d = useAuditDataSoft();
  const { state, dispatch } = useDemo();
  const toast = useToast();
  const [sheet, setSheet] = useState<"grant" | "end-date" | null>(null);
  const who = useStamp(d?.asOfText ?? "");
  if (d === null) return <Loading />;
  const g = state.auditorGrant;
  const status = g === null ? null : state.auditorEnded !== null ? "ended"
    : d.status(g.fromIso, g.toIso);
  const word = status === null ? "No auditor" : status === "ended"
    ? "Ended" : d.statusText[status];
  const tone = status === "active" ? "ok" : status === null ? "none"
    : "warn";
  const actions = g === null ? (
    <button type="button" className={`${b.btn} ${b.primary} ${a.tap}`}
      disabled={!who.canGrant} onClick={() => setSheet("grant")}>
      Give access</button>
  ) : status === "active" ? (
    <>
      <a className={`${b.btn} ${b.primary} ${a.tap}`}
        href={hrefOf("reports", "inspection", "room")}>
        Open the auditor's view</a>
      <button type="button" className={`${b.btn} ${b.secondary} ${a.tap}`}
        disabled={!who.canGrant} onClick={() => setSheet("end-date")}>
        Change end date</button>
      <button type="button" className={`${b.btn} ${b.secondary} ${a.tap}`}
        disabled={!who.canGrant} onClick={() => {
          dispatch({ type: "auditor-end", stamp: who.make() });
          toast.show("Access ended.",
            () => dispatch({ type: "auditor-reinstate" }));
        }}>End access now</button>
    </>
  ) : (
    <>
      <button type="button" className={`${b.btn} ${b.secondary} ${a.tap}`}
        disabled={!who.canGrant} onClick={() => setSheet("end-date")}>
        Change end date</button>
      {status === "ended" && (
        <button type="button" className={`${b.btn} ${b.quiet} ${a.tap}`}
          disabled={!who.canGrant}
          onClick={() => dispatch({ type: "auditor-reinstate" })}>
          Undo ending</button>
      )}
    </>
  );
  const views = state.auditorViews;
  return (
    <>
      <RecordTabs title="Auditor access"
        lede={`Give an outside auditor read-only access for a set time. ${
          who.canGrant ? "" : "The General manager or the IT manager gives " +
          "access; you can see it here."}`.trim()}
        stats={[{ label: "Status", value: (
          <Status tone={tone}>{word}</Status>) },
        { label: "Access ends", value: g === null ? "Not set"
          : d.dateText(g.toIso) },
        { label: "Pages viewed", value: views.length }]}
        actions={actions}
        tabs={[{ id: "access", label: "Access", render: () => (
          <div className={a.stack}>
            {g === null ? (
              <p className={a.empty}>No auditor has access. Give access for
                a named person and an end date; the person can only read.
              </p>
            ) : (
              <KeyValues items={[{ label: "Person", value: g.name },
                { label: "Firm", value: g.firm },
                { label: "E-mail", value: g.email },
                { label: "Role", value: d.sample.roleLabel },
                { label: "Window", value: d.windowText(g.fromIso, g.toIso) },
                { label: "Looks at", value: d.sample.scope },
                { label: "Given by", value: stampText(g.stamp) }]} />
            )}
            <div className={a.lists}>
            <section>
              <h2 className={a.sectionTitle}>Can open</h2>
              <List items={d.sample.can} />
            </section>
            <section>
              <h2 className={a.sectionTitle}>Cannot</h2>
              <List items={d.sample.cannot} />
            </section>
            {state.auditorChanges.length > 0 && (
              <section>
                <h2 className={a.sectionTitle}>Changes</h2>
                <List items={state.auditorChanges.map((c) =>
                  `${c.what}: ${stampText(c.stamp)}`)} />
              </section>
            )}
            </div>
          </div>) },
        { id: "log", label: "View log", render: () => (
          <section>
            <p className={a.sub}>Every page the auditor opens is written
              here with the auditor's name. The log only grows.</p>
            {views.length === 0 ? (
              <p className={a.empty}>No views yet. Open the auditor's view
                and each page you open is logged here.</p>
            ) : (
              <ul className={a.panel} aria-label="View log">
                {[...views].reverse().map((x) => (
                  <li key={x.id} className={a.row}>
                    <span className={a.main}><span>{x.label}</span>
                      <small className={a.sub}>Opened by {x.by}</small>
                    </span>
                    <span className={a.end}>View {x.n}, {x.on}</span>
                  </li>
                ))}
              </ul>)}
          </section>) }]} />
      {sheet !== null && (
        <GrantSheet d={d} open title={sheet === "grant"
          ? "Give auditor access" : "Change the end date"}
        mode={sheet} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
