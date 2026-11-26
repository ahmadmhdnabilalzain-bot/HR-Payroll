import { useState } from "react";
import type { EmploymentEndView } from "../../demo/data/moves-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList, KeyValues } from "../../ui/templates";
import { dayText } from "../words";
import { Dot } from "./Dot";
import { useActor } from "./view";
import s from "./moves.module.css";

/** The facts of one resignation, as a key-value grid. */
export function EndingDetails(p: { end: EmploymentEndView }) {
  const { data } = useDemo();
  const e = p.end;
  const by = data.people.person(e.acceptedBy.employeeId);
  return (
    <KeyValues items={[
      { label: "Resignation received", value: e.submittedOn.display },
      { label: "Last working day", value: e.lastWorkingDay.display },
      { label: "Notice", value: e.noticeText },
      { label: "Accepted by", value: `${e.acceptedBy.name}, ` +
        `${by?.role.en ?? ""}, ${e.acceptedBy.on.display}` },
      { label: "Reason given", value: e.reason }]} />
  );
}

/** The list template wants a string; undefined gives a row without a
 * link (so its buttons are not inside an anchor). Template gap. */
const NO_LINK = undefined as unknown as string;

interface Row {
  id: string;
  employeeId: string;
  name: string;
  lastDay: string;
  state: "ended" | "waiting";
  mine: boolean;
}

/**
 * End employment (P16): resignations on record, and a sheet to record
 * a new one. A new resignation goes to the General manager; until then
 * it says it is waiting, and can be withdrawn.
 */
export function Endings() {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const staff = data.people.people().filter((x) => x.status === "active" ||
    x.status === "probation");
  const gm = data.people.person(data.people.personas().gmId);
  const rows: Row[] = [
    ...state.newEndings.map((n): Row => ({ id: n.id,
      employeeId: n.employeeId, lastDay: n.lastDay, state: "waiting",
      name: data.people.person(n.employeeId)?.name.en ?? "", mine: true })),
    ...data.moves.endings().map((e): Row => ({ id: e.employeeId,
      employeeId: e.employeeId, name: e.personName,
      lastDay: e.lastWorkingDay.iso, state: "ended", mine: false }))];
  return (
    <>
      <FilterList title="End employment" rows={rows}
        lede="Resignations on record, and one more to record."
        rowKey={(r) => r.id} searchText={(r) => r.name}
        rowHref={(r) => r.mine ? NO_LINK
          : hrefOf("people", "moves", "leavers", r.employeeId)}
        columns={[
          { key: "n", label: "Person", render: (r) => r.name },
          { key: "d", label: "Last working day",
            render: (r) => dayText(r.lastDay, "en") },
          { key: "s", label: "Status", end: true, render: (r) => r.mine ? (
            <span className={s.itemAct}>
              <Dot tone="warn">Waiting for {gm?.name.en}</Dot>
              <button type="button" className={`${b.btn} ${b.quiet}`}
                onClick={() => {
                  dispatch({ type: "ending-undo", id: r.id });
                  toast.show(`${r.name}: resignation withdrawn`);
                }}>Withdraw</button>
            </span>
          ) : <Dot tone="neutral">On record</Dot> }]}
        empty="No resignations on record."
        actions={
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>Record a resignation</button>
        } />
      <ApprovalForm open={open} title="Record a resignation"
        maker={actor.name} checker={gm?.name.en ?? ""}
        submitLabel="Send to the General manager"
        onClose={() => setOpen(false)}
        fields={[
          { key: "who", label: "Person", kind: "select", required: true,
            options: [{ value: "", label: "Choose a person" },
              ...staff.map((x) => ({ value: x.id, label: x.name.en }))] },
          { key: "last", label: "Last working day", kind: "date",
            required: true, help: "At least 30 days of notice is usual." },
          { key: "reason", label: "Reason given", kind: "textarea" }]}
        onSubmit={(v) => {
          const who = v["who"] ?? "";
          const last = v["last"] ?? "";
          if (who === "") return "Choose the person who is leaving.";
          if (last <= data.moves.asOf) {
            return "The last working day must be after today.";
          }
          if (rows.some((r) => r.employeeId === who)) {
            return "A resignation is already on record for this person.";
          }
          dispatch({ type: "ending-new", draft: { employeeId: who,
            submittedOn: data.moves.asOf, lastDay: last,
            reason: v["reason"] ?? "", by: actor.id,
            checkerId: data.people.personas().gmId } });
          toast.show("Resignation sent to " + (gm?.name.en ?? ""));
          return null;
        }} />
    </>
  );
}
