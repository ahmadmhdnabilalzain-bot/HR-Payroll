import { useState } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { FilterList, PageHead } from "../../ui/templates";
import { PackBody } from "./Pack";
import { RemediesList } from "./Remedies";
import { useAuditData } from "./load";
import s from "./audit.module.css";

type View = { page: string; month: string };

/**
 * The auditor's view, as a preview. The demo has no auditor sign-in,
 * so a person acting as the auditor opens pages here; each page opened
 * is written to the view log under the auditor's name. Read only.
 */
export function Room() {
  const d = useAuditData();
  const { state, dispatch } = useDemo();
  const g = state.auditorGrant;
  const [view, setView] = useState<View | null>(null);
  const status = g === null ? null : state.auditorEnded !== null ? "ended"
    : d.status(g.fromIso, g.toIso);
  if (g === null || status !== "active") {
    return (
      <div className={s.page}>
        <PageHead title="Auditor's view" back={{ label: "Inspection pack",
          href: hrefOf("reports", "inspection") }} />
        <div className={s.gate}>
          <p role="status">{g === null ? "No auditor has access."
            : status === "ended" ? "Access was ended by a person."
              : status === "expired" ? "Access has expired."
                : "Access has not started yet."} The auditor sees
            nothing until access is active.</p>
          <a className={`${b.btn} ${b.primary} ${s.tap}`}
            href={hrefOf("setup", "auditor")}>Open auditor access</a>
        </div>
      </div>
    );
  }
  const open = (page: string, month: string): void => {
    const monthLabel = d.months.find((m) => m.key === month)?.label ?? "";
    const label = d.pages.find((x) => x.id === page)?.label ?? page;
    dispatch({ type: "auditor-view", page, by: g.name, on: d.asOfText,
      label: page === "pack" ? `${label}, ${monthLabel}` : label });
    setView({ page, month });
  };
  const at = view ?? null;
  return (
    <div className={s.page}>
      <PageHead title="Auditor's view"
        back={{ label: "Inspection pack",
          href: hrefOf("reports", "inspection") }}
        lede={`${g.name}, ${g.firm}. Read only. Access ends ${
          d.dateText(g.toIso)}. Every page opened here is written to the ` +
          "view log under this name."} />
      {at === null ? (
        <div className={s.gate}>
          <p>Choose a page to open. Each one is logged.</p>
          <ul className={s.choices}>
            {d.pages.map((x, i) => (
              <li key={x.id}>
                <button type="button" className={`${b.btn} ${
                  i === 0 ? b.primary : b.secondary} ${s.tap}`}
                onClick={() => open(x.id, d.months.at(-1)!.key)}>
                  Open {x.label.toLowerCase()}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <ul className={s.months} aria-label="Pages">
            {d.pages.map((x) => (
              <li key={x.id}>
                <button type="button" className={`${s.month} ${s.tap}`}
                  aria-pressed={at.page === x.id}
                  onClick={() => open(x.id, at.month)}>{x.label}</button>
              </li>
            ))}
          </ul>
          {at.page === "pack" && (
            <>
              <ul className={s.months} aria-label="Month">
                {d.months.map((m) => (
                  <li key={m.key}>
                    <button type="button" className={`${s.month} ${s.tap}`}
                      aria-pressed={at.month === m.key}
                      onClick={() => open("pack", m.key)}>{m.label}</button>
                  </li>
                ))}
              </ul>
              <PackBody pack={d.packs[at.month]!} />
            </>
          )}
          {at.page === "errors" && <RemediesList d={d} />}
          {at.page === "trail" && (
            <FilterList title="Audit trail"
              lede="Every action, oldest first, with its fingerprint."
              rows={d.trail} rowKey={(r) => r.id}
              searchText={(r) => `${r.who} ${r.action} ${r.summary}`}
              columns={[{ key: "w", label: "What happened", render: (r) =>
                r.summary }, { key: "u", label: "Who", render: (r) => r.who },
              { key: "t", label: "When", end: true, render: (r) => r.when }]}
              empty="No entries." />
          )}
        </>
      )}
    </div>
  );
}
