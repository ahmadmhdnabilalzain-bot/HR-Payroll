import { useState } from "react";
import b from "../ui/button.module.css";
import { ApprovalForm, FilterList } from "../ui/templates";
import { Stack, Status } from "../people/papers/Status";
import { accessRows } from "../people/requests/model";
import { useRequests } from "../people/requests/useRequests";
import { ACCESS_STATUS, VERB } from "../people/requests/words";

/** E15: ask for a role you do not have; IT and HR decide. */
export function MyAccess() {
  const p = useRequests();
  const [open, setOpen] = useState(false);
  const roles = p.data.requests.requestableRoles;
  const mine = accessRows(p.data, p.state).filter((r) =>
    r.employeeId === p.me);
  return (
    <>
      <FilterList title="Request access"
        lede={"Ask for a role you need for your work. HR or IT decides, " +
          "and your request shows who and when."}
        rows={mine} rowKey={(r) => r.id}
        columns={[
          { key: "r", label: "Role", render: (r) => r.roleLabel },
          { key: "w", label: "Why", render: (r) => r.reason },
          { key: "o", label: "Asked on", render: (r) => p.when(r.raisedOn) },
          { key: "s", label: "Status", render: (r) => {
            const [word, tone] = ACCESS_STATUS[r.status];
            return <Stack main={<Status word={word} tone={tone} />}
              sub={r.step !== null ? p.byLine(VERB[r.status] ?? word, r.step)
                : ""} />;
          } },
        ]}
        empty="You have not asked for any access. Use the button to start."
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>Request a role</button>
        )} />
      <ApprovalForm key={p.state.nextReq} open={open}
        title="Request a role" maker={p.nameOf(p.me)}
        checker={p.nameOf(p.data.requests.ownerId)}
        submitLabel="Send request" onClose={() => setOpen(false)}
        fields={[
          { key: "role", label: "Role", kind: "select", required: true,
            options: roles.map((x) => ({ value: x.id, label: x.label })),
            initial: roles[0]?.id ?? "" },
          { key: "reason", label: "Why you need it", kind: "textarea",
            required: true },
        ]}
        onSubmit={(v) => {
          p.dispatch({ type: "req-new", draft: { kind: "access",
            employeeId: p.me, raisedOn: p.data.requests.asOf,
            values: { role: v["role"] ?? "", reason: v["reason"] ?? "" },
            by: p.me, role: p.state.role } });
          p.toast.show("Access request sent.");
          return null;
        }} />
    </>
  );
}
