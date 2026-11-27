import { useState } from "react";
import type { HiringRequisition } from "../../demo/data/moves-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList, KeyValues, Sheet } from "../../ui/templates";
import { Dot } from "./Dot";
import { requestHref, requestOfRequisition } from "../hiring/model";
import { reqNow, REQ_WORD, stepWho, useActor, type ReqNow,
  type Tone } from "./view";
import s from "./moves.module.css";

const TONE: Record<ReqNow, Tone> = { open: "ok", "on-hold": "warn",
  filled: "neutral" };

const band = (r: HiringRequisition) => (
  <>
    <Money value={r.basicMin.value} size="sm" />
    {" to "}
    <Money value={r.basicMax.value} size="sm" />
  </>
);

/** Hiring: requisitions (P10). Hold and reopen record who and when. */
export function Requisitions() {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const rows = data.moves.requisitions();
  const set = (r: HiringRequisition, to: ReqNow): void => {
    dispatch({ type: "move-step", key: `req:${r.id}`, step: { value: to,
      from: reqNow(r, state), by: actor.id, role: actor.role,
      on: actor.on } });
    toast.show(`${r.title}: ${REQ_WORD[to].toLowerCase()}`, () =>
      dispatch({ type: "move-undo", key: `req:${r.id}` }));
  };
  const r = rows.find((x) => x.id === open) ?? null;
  const step = r === null ? undefined : state.moveSteps[`req:${r.id}`];
  const now = r === null ? "open" : reqNow(r, state);
  return (
    <>
      <FilterList title="Open positions" rows={rows}
        lede="Roles the company has asked to fill."
        rowKey={(x) => x.id}
        searchText={(x) => `${x.title} ${x.departmentText} ${x.locationText}`}
        segments={[{ id: "all", label: "All", match: () => true },
          { id: "open", label: "Open", match: (x) => reqNow(x, state) ===
            "open" },
          { id: "hold", label: "On hold", match: (x) => reqNow(x, state) ===
            "on-hold" },
          { id: "filled", label: "Filled", match: (x) => reqNow(x, state) ===
            "filled" }]}
        columns={[
          { key: "t", label: "Role", render: (x) => (
            <button type="button" className={s.nameLink}
              onClick={() => setOpen(x.id)}>{x.title}</button>
          ) },
          { key: "d", label: "Department", render: (x) => x.departmentText },
          { key: "p", label: "Place", render: (x) => x.locationText },
          { key: "o", label: "Openings", render: (x) =>
            `${x.openingsLeft} of ${x.openings} open` },
          { key: "s", label: "Status", end: true, render: (x) => (
            <Dot tone={TONE[reqNow(x, state)]}>
              {REQ_WORD[reqNow(x, state)]}
            </Dot>
          ) }]}
        empty="No open positions match." />
      <Sheet open={r !== null} title={r?.title ?? ""}
        onClose={() => setOpen(null)}>
        {r !== null && (
          <div className={s.sheetStack}>
            <KeyValues items={[
              { label: "Department", value: r.departmentText },
              { label: "Place", value: r.locationText },
              { label: "Hiring manager", value: r.hiringManagerName },
              { label: "Opened", value: r.openedOn.display },
              { label: "Reason", value: r.reason === "backfill"
                ? "Replaces someone who left" : "A new role" },
              { label: "Basic pay band", value: band(r) },
              { label: "Advertised", value: r.published ? "Yes" : "No" }]} />
            <p className={s.quiet}>{r.note}</p>
            {step !== undefined && (
              <p className={s.quiet}>
                {REQ_WORD[now]} by {stepWho(data, step)}.
              </p>
            )}
            <div className={s.panelActions}>
              <a className={`${b.btn} ${b.secondary}`}
                href={hrefOf("people", "moves", "board")}>See candidates</a>
              {requestOfRequisition(data, state, r.id) !== null && (
                <a className={`${b.btn} ${b.secondary}`}
                  href={requestHref(requestOfRequisition(data, state,
                    r.id)!.id)}>Open the request</a>
              )}
              {step !== undefined ? (
                <button type="button" className={`${b.btn} ${b.quiet}`}
                  onClick={() => dispatch({ type: "move-undo",
                    key: `req:${r.id}` })}>Undo</button>
              ) : now === "open" ? (
                <button type="button" className={`${b.btn} ${b.secondary}`}
                  onClick={() => set(r, "on-hold")}>Put on hold</button>
              ) : now === "on-hold" ? (
                <button type="button" className={`${b.btn} ${b.primary}`}
                  onClick={() => set(r, "open")}>Reopen</button>
              ) : null}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

/** Vacancies (P13): what is advertised, and who has applied. */
export function Vacancies() {
  const { data } = useDemo();
  const cands = data.moves.candidates();
  const rows = data.moves.vacancies();
  return (
    <FilterList title="Advertised jobs" rows={rows}
      lede="Roles that are open and advertised now."
      rowKey={(x) => x.id}
      searchText={(x) => `${x.title} ${x.departmentText} ${x.locationText}`}
      rowHref={() => hrefOf("people", "moves", "board")}
      columns={[
        { key: "t", label: "Role", render: (x) => x.title },
        { key: "d", label: "Department", render: (x) => x.departmentText },
        { key: "p", label: "Place", render: (x) => x.locationText },
        { key: "b", label: "Basic pay band", render: band },
        { key: "c", label: "Candidates", end: true, render: (x) =>
          cands.filter((c) => c.requisitionId === x.id).length }]}
      empty="Nothing is advertised. Request a hire to start hiring." />
  );
}
