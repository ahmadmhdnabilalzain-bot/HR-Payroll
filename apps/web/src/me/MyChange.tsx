import { useState } from "react";
import b from "../ui/button.module.css";
import { ApprovalForm, FilterList } from "../ui/templates";
import { changeRows } from "../people/requests/model";
import { Stack, Status } from "../people/papers/Status";
import { useRequests } from "../people/requests/useRequests";
import { CHANGE_STATUS, VERB } from "../people/requests/words";

/**
 * E06: change my details (and add or remove a dependant). The form goes
 * to HR's queue of profile change requests; the list shows what HR did,
 * by whom and when.
 */
export function MyChange() {
  const p = useRequests();
  const [open, setOpen] = useState(false);
  const fields = p.data.requests.changeFields;
  const mine = changeRows(p.data, p.state).filter((r) =>
    r.employeeId === p.me);
  return (
    <>
      <FilterList title="Change my details"
        lede={"Ask HR to change a detail on your record, or to add or " +
          "remove a dependant. HR may ask to see a document first."}
        rows={mine} rowKey={(r) => r.id}
        columns={[
          { key: "f", label: "What", render: (r) => r.field },
          { key: "n", label: "New value", render: (r) => r.proposed },
          { key: "r", label: "Asked on", render: (r) => p.when(r.raisedOn) },
          { key: "s", label: "Status", render: (r) => {
            const [word, tone] = CHANGE_STATUS[r.status];
            return <Stack main={<Status word={word} tone={tone} />}
              sub={r.step !== null ? p.byLine(VERB[r.status] ?? word, r.step)
                : ""} />;
          } },
        ]}
        empty="You have not asked for a change. Use the button to start."
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>Ask for a change</button>
        )} />
      <ApprovalForm key={p.state.nextReq} open={open}
        title="Ask for a change" maker={p.nameOf(p.me)}
        checker={p.nameOf(p.data.requests.ownerId)}
        submitLabel="Send to HR" onClose={() => setOpen(false)}
        fields={[
          { key: "field", label: "What should change", kind: "select",
            required: true, options: fields.map((f) => ({ value: f.id,
              label: f.label })), initial: fields[0]?.id ?? "" },
          { key: "proposed", label: "The new value", kind: "text",
            required: true, help: "For a dependant: the name and the " +
              "relationship." },
          { key: "note", label: "Anything HR should know",
            kind: "textarea" },
        ]}
        onSubmit={(v) => {
          p.dispatch({ type: "req-new", draft: { kind: "profile",
            employeeId: p.me, raisedOn: p.data.requests.asOf,
            values: { field: v["field"] ?? "", proposed: v["proposed"] ?? "",
              note: v["note"] ?? "" }, by: p.me, role: p.state.role } });
          p.toast.show("Change sent to HR.");
          return null;
        }} />
    </>
  );
}
