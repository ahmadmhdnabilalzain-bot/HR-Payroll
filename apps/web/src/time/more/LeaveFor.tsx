import { useState } from "react";
import { useDemo } from "../../demo/state";
import { requestRows } from "../../demo/time-off";
import { useLocale } from "../../i18n/LocaleProvider";
import { rangeText } from "../../people/words";
import { Status } from "../../people/team/common";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { useNames } from "../../people/files/common";
import f from "../../people/files/files.module.css";
import { mayTake } from "../../timeoff/eligibility";
import { M } from "./words";

const W = M.record;

/** T03: HR records leave for someone, as a request to their manager. */
export function LeaveFor() {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const names = useNames();
  const [open, setOpen] = useState(false);
  const rows = requestRows(data, state).filter((r) => r.isNew &&
    r.note.startsWith("Recorded by HR"));
  const people = data.people.people().filter((x) => x.status !== "left" &&
    x.status !== "joining");
  const hr = data.people.personas().hrId;
  const types = data.people.leaveTypes();
  const reasons = data.people.reasons();
  return (
    <>
      <FilterList title={W.title} lede={`${W.lede}`} rows={rows}
        rowKey={(r) => r.id} searchText={(r) => names.name(r.employeeId)}
        segments={[{ id: "all", label: "All", match: () => true }]}
        columns={[
          { key: "p", label: W.person, render: (r) => (
            <span className={f.stack}><span>{names.name(r.employeeId)}</span>
              <small>{names.title(r.employeeId)}</small></span>) },
          { key: "l", label: W.leave, render: (r) =>
            `${types.find((t) => t.id === r.leaveTypeId)?.name[lang] ?? ""}, ${
              rangeText(r.startDate, r.endDate, lang)}` },
          { key: "d", label: W.days, end: true, render: (r) =>
            String(r.halves / 2) },
          { key: "s", label: W.status, render: (r) => (
            <Status tone={r.state === "booked" ? "ok"
              : r.state === "waiting" ? "open" : "plain"}>
              {W[r.state]}</Status>) },
        ]}
        empty={W.empty}
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>{W.button}</button>)} />
      <ApprovalForm key={state.nextRequest} open={open} title={W.title}
        maker={names.name(hr)} checker={W.manager}
        submitLabel={W.submit} onClose={() => setOpen(false)}
        fields={[
          { key: "who", label: W.person, kind: "select", required: true,
            options: people.map((x) => ({ value: x.id,
              label: x.name[lang] })), initial: people[0]?.id ?? "" },
          { key: "type", label: W.type, kind: "select", required: true,
            options: types.map((x) => ({ value: x.id, label: x.name[lang] })),
            initial: "lt-annual" },
          { key: "from", label: W.from, kind: "date", required: true },
          { key: "to", label: W.to, kind: "date", required: true },
          { key: "reason", label: W.reason, kind: "select", required: true,
            options: reasons.map((x) => ({ value: x.key,
              label: x.text[lang] })), initial: reasons[0]?.key ?? "" },
        ]}
        onSubmit={(v) => {
          const from = v["from"] ?? "";
          const to = v["to"] ?? "";
          if (from === "" || to === "") return W.needDates;
          if (to < from) return W.order;
          const who = v["who"] ?? "";
          const count = data.people.countDays(from, to);
          if (count.halves === 0) return W.noDays;
          const type = (v["type"] ?? "lt-annual") as "lt-annual";
          const kind = types.find((t) => t.id === type);
          if (kind !== undefined && !mayTake(kind, data.people.person(who))) {
            return W.notFor(kind.name[lang], names.name(who),
              kind.rule.who?.[lang] ?? "");
          }
          const checker = data.people.approverOf(who);
          dispatch({ type: "request-leave", draft: { employeeId: who,
            leaveTypeId: type, startDate: from, endDate: to,
            halves: count.halves, reasonKey: v["reason"] ?? "",
            note: `Recorded by HR for ${names.name(who)}`,
            requestedOn: data.people.asOf, checkerId: checker } });
          toast.show(W.sent(names.name(checker)));
          return null;
        }} />
    </>
  );
}
