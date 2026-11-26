import { useState } from "react";
import type { StaffMove } from "../../demo/data/moves-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList, KeyValues, Sheet } from
  "../../ui/templates";
import { dayText } from "../words";
import { Dot } from "./Dot";
import { useActor } from "./view";
import s from "./moves.module.css";

interface Row {
  id: string;
  mine: boolean;
  name: string;
  kind: "transfer" | "rejoin";
  effective: string;
  status: string;
  move: StaffMove | null;
  to: string;
}

const KIND = { transfer: "Transfer", rejoin: "Re-join" } as const;
const seatText = (t: string): string => t.replace(/, grade \d+$/, "");
/** "Teller, Al Ain branch": the role and the place, no department. */
function shortSeat(t: string): string {
  const parts = seatText(t).split(", ");
  return parts.length < 3 ? parts.join(", ")
    : `${parts[0]}, ${parts.slice(2).join(", ")}`;
}

/** Transfers and re-joins (P18): on record, and a form for a transfer. */
export function Transfers() {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const [form, setForm] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const gm = data.people.person(data.people.personas().gmId);
  const staff = data.people.people().filter((x) => x.status === "active" ||
    x.status === "probation");
  const places = [...new Set(staff.map((x) => x.branch.en))].sort();
  const rows: Row[] = [
    ...state.newMoves.map((n): Row => ({ id: n.id, mine: true,
      name: data.people.person(n.employeeId)?.name.en ?? "",
      kind: n.kind, effective: n.effectiveOn, move: null,
      status: `Waiting for ${gm?.name.en ?? ""}`,
      to: `${n.toDepartment}, ${n.toPlace}` })),
    ...data.moves.moves().map((m): Row => ({ id: m.id, mine: false,
      name: m.personName, kind: m.kind, effective: m.effectiveOn.iso,
      status: m.statusText, move: m, to: shortSeat(m.to.text) }))];
  const m = rows.find((x) => x.id === open)?.move ?? null;
  const offer = data.moves.offers().find((o) => o.id === m?.offerId);
  return (
    <>
      <FilterList title="Transfers and re-joins" rows={rows}
        lede="People who moved to another role or place, and who came back."
        rowKey={(r) => r.id} searchText={(r) => `${r.name} ${r.to}`}
        segments={[{ id: "all", label: "All", match: () => true },
          { id: "transfer", label: "Transfers", match: (r) =>
            r.kind === "transfer" },
          { id: "rejoin", label: "Re-joins", match: (r) =>
            r.kind === "rejoin" }]}
        columns={[
          { key: "n", label: "Person", render: (r) => r.move === null
            ? r.name : (
              <button type="button" className={s.nameLink}
                onClick={() => setOpen(r.id)}>{r.name}</button>
            ) },
          { key: "k", label: "Type", render: (r) => KIND[r.kind] },
          { key: "t", label: "Moves to", render: (r) => r.to },
          { key: "e", label: "Starts", render: (r) => dayText(r.effective,
            "en") },
          { key: "s", label: "Status", end: true, render: (r) => r.mine ? (
            <span className={s.itemAct}>
              <Dot tone="warn">{r.status}</Dot>
              <button type="button" className={`${b.btn} ${b.quiet}`}
                onClick={() => {
                  dispatch({ type: "staff-move-undo", id: r.id });
                  toast.show(`${r.name}: transfer withdrawn`);
                }}>Withdraw</button>
            </span>
          ) : <Dot tone={r.status === "Done" ? "ok" : "info"}>
            {r.status}</Dot> }]}
        empty="No moves on record."
        actions={
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setForm(true)}>Record a transfer</button>
        } />
      <Sheet open={m !== null} title={m?.personName ?? ""}
        onClose={() => setOpen(null)}>
        {m !== null && (
          <div className={s.sheetStack}>
            <KeyValues items={[
              { label: "Type", value: KIND[m.kind] },
              { label: "From", value: seatText(m.from.text) },
              { label: "To", value: seatText(m.to.text) },
              { label: "Starts", value: m.effectiveOn.display },
              { label: "Pay", value: offer !== undefined && m.kind ===
                "rejoin" ? <>New package <Money value={offer.gross} /> a
                month</> : m.payChangeText },
              ...(m.previousService === null ? [] : [{
                label: "Earlier service", value: m.previousService.text }]),
              { label: "Status", value: m.statusText }]} />
            <p className={s.quiet}>{m.note}</p>
            {m.employeeId !== null && (
              <div className={s.panelActions}>
                <a className={`${b.btn} ${b.secondary}`}
                  href={hrefOf("people", m.employeeId)}>Open profile</a>
              </div>
            )}
          </div>
        )}
      </Sheet>
      <ApprovalForm open={form} title="Record a transfer"
        maker={actor.name} checker={gm?.name.en ?? ""}
        submitLabel="Send to the General manager"
        onClose={() => setForm(false)}
        fields={[
          { key: "who", label: "Person", kind: "select", required: true,
            options: [{ value: "", label: "Choose a person" },
              ...staff.map((x) => ({ value: x.id, label: x.name.en }))] },
          { key: "dept", label: "New department", kind: "select",
            required: true, options: [{ value: "", label: "Choose" },
              ...data.people.departments().map((d) => ({ value: d.name.en,
                label: d.name.en }))] },
          { key: "place", label: "New place", kind: "select", required: true,
            options: [{ value: "", label: "Choose" },
              ...places.map((x) => ({ value: x, label: x }))] },
          { key: "on", label: "Starts on", kind: "date", required: true },
          { key: "note", label: "Reason", kind: "textarea" }]}
        onSubmit={(v) => {
          const who = v["who"] ?? "";
          if (who === "") return "Choose the person who is moving.";
          if ((v["on"] ?? "") <= data.moves.asOf) {
            return "The move must start after today.";
          }
          if (state.newMoves.some((n) => n.employeeId === who)) {
            return "A transfer is already waiting for this person.";
          }
          dispatch({ type: "staff-move-new", draft: { kind: "transfer",
            employeeId: who, effectiveOn: v["on"] ?? "",
            toDepartment: v["dept"] ?? "", toPlace: v["place"] ?? "",
            note: v["note"] ?? "", by: actor.id,
            checkerId: data.people.personas().gmId } });
          toast.show("Transfer sent to " + (gm?.name.en ?? ""));
          return null;
        }} />
    </>
  );
}
