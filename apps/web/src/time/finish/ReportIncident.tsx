import { useState } from "react";
import type { Severity } from "../../demo/data/finish-types";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { Status, Stack } from "../../people/papers/Status";
import type { Tone } from "../../people/papers/words";
import { dayText } from "../../people/words";
import { incidentStatus } from "../../people/safety/common";
import s from "../../people/team/team.module.css";
import b from "../../ui/button.module.css";
import { ApprovalForm, FilterList } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { F, fill } from "./words";

const W = F.report;
const STATUS = { open: [W.withHr, "warn"], "action-taken":
  [W.actionTaken, "info"], closed: [W.closed, "ok"] } as const;

/**
 * E14, Report a safety incident (My pages): three answers, and the
 * report lands in HR's Safety incidents log. HR rates and closes it;
 * the employee sees where it stands and can take it back.
 */
export function ReportIncident() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const me = personFor(data, state.role);
  const hrId = data.people.personas().hrId;
  const hr = data.people.person(hrId)?.name.en ?? "HR";
  const places = data.finish.places();
  const place = (id: string): string => places.find((p) => p.id === id)
    ?.label ?? id;
  const mine = state.incidentReports.filter((r) => !r.withdrawn &&
    r.reporterId === me);
  const sev = (v: Severity): string => data.finish.severities
    .find((x) => x.value === v)?.label ?? v;
  const take = (id: string): void => {
    dispatch({ type: "finish-incident-withdraw", id });
    toast.show(W.taken, () => dispatch({ type: "finish-incident-restore",
      id }));
  };
  return (
    <>
      <FilterList title={W.title} lede={W.lede} rows={mine}
        rowKey={(r) => r.id}
        columns={[
          { key: "w", label: W.what, render: (r) => (
            <Stack main={r.what} sub={`${dayText(r.reportedOn, "en")}, ` +
              place(r.place)} />) },
          { key: "v", label: W.severity, render: (r) => sev(r.severity) },
          { key: "s", label: W.status, render: (r) => {
            const [word, tone] = STATUS[incidentStatus("open",
              state.safetyMarks, r.id)];
            return <Status word={word} tone={tone as Tone} />;
          } },
          { key: "x", label: "", end: true, render: (r) => (
            <button type="button"
              className={`${b.btn} ${b.quiet} ${s.tall}`}
              aria-label={`${W.takeBack}: ${r.what}`}
              onClick={() => take(r.id)}>{W.takeBack}</button>) },
        ]}
        empty={W.empty}
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setOpen(true)}>{W.add}</button>)} />
      <section className={s.after}>
        <p className={s.note}>{data.finish.reportNote}</p>
      </section>
      <ApprovalForm key={state.nextFinish} open={open} title={W.form}
        maker={data.people.person(me)?.name.en ?? ""} checker={hr}
        submitLabel={W.submit} onClose={() => setOpen(false)}
        fields={[
          { key: "what", label: W.whatField, kind: "textarea",
            required: true, help: W.whatHelp },
          { key: "place", label: W.whereField, kind: "select",
            required: true, options: places.map((p) => ({ value: p.id,
              label: p.label })), initial: places[0]?.id ?? "" },
          { key: "sev", label: W.sevField, kind: "select", required: true,
            options: data.finish.severities.map((x) => ({ value: x.value,
              label: `${x.label}: ${x.help}` })), initial: "low" },
        ]}
        onSubmit={(v) => {
          const input = { what: v["what"] ?? "", place: v["place"] ?? "",
            severity: (v["sev"] ?? "low") as Severity };
          const err = data.finish.checkReport(input);
          if (err !== null) return err;
          dispatch({ type: "finish-incident", draft: { ...input,
            reporterId: me, reportedOn: data.people.asOf } });
          toast.show(fill(W.sent, { name: hr }));
          return null;
        }} />
    </>
  );
}
