import type { RequestStatus } from "../../demo/data/hiring-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import b from "../../ui/button.module.css";
import { FilterList } from "../../ui/templates";
import { Dot } from "../moves/Dot";
import type { Tone } from "../moves/view";
import {
  actsFor,
  mayRaise,
  requestHref,
  timelineOf,
  visibleRequests,
  type RequestNow,
} from "./model";

export const REQUEST_TONE: Record<RequestStatus, Tone> = {
  "with-hr": "info", changes: "warn", "with-gm": "info", open: "ok",
  "on-hold": "warn", declined: "neutral", withdrawn: "neutral",
  filled: "neutral" };

const REVIEW: readonly RequestStatus[] = ["with-hr", "changes", "with-gm"];
const OPEN: readonly RequestStatus[] = ["open", "on-hold"];

/** P10: every hiring request the role may see, newest first. */
export function RequestList() {
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const rows = [...visibleRequests(data, state)].reverse();
  const mine = (r: RequestNow): boolean =>
    actsFor(r, state.role, me).some((a) => a.primary);
  /** "In 21 days" to the offer target, or late, for open positions. */
  const plan = (r: RequestNow): string => {
    if (r.status !== "open") return "";
    const late = timelineOf(data, state, r).find((m) =>
      m.state === "overdue");
    if (late !== undefined) return `${late.label}: behind plan`;
    const n = data.hiring.daysLeft(r.signedOffIso, r.timeToFillDays);
    return n === null ? "" : n < 0 ? `${-n} days past the target`
      : `${n} days to fill`;
  };
  const manager = state.role === "manager";
  return (
    <FilterList title={manager ? "My hiring requests" : "Hiring requests"}
      rows={rows}
      lede={"Each request, from the first ask to the start date. " +
        "Questions and answers stay on the request, not in email."}
      rowKey={(r) => r.id}
      rowHref={(r) => requestHref(r.id)}
      searchText={(r) => `${r.title} ${r.number} ${r.departmentText} ` +
        r.raisedByName}
      segments={[
        ...(manager ? [{ id: "all", label: "All", match: () => true }] : []),
        { id: "me", label: "Waiting on me", match: mine },
        { id: "review", label: "In review", match: (r) =>
          REVIEW.includes(r.status) },
        { id: "open", label: "Open positions", match: (r) =>
          OPEN.includes(r.status) },
        { id: "closed", label: "Closed", match: (r) =>
          !REVIEW.includes(r.status) && !OPEN.includes(r.status) },
        ...(manager ? [] : [{ id: "all", label: "All",
          match: () => true }])]}
      columns={[
        { key: "t", label: "Role", render: (r) => r.title },
        { key: "n", label: "Request", render: (r) => r.number },
        { key: "d", label: "Department", render: (r) => r.departmentText },
        { key: "b", label: "Raised by", render: (r) => r.raisedByName },
        { key: "s", label: "Status", render: (r) => (
          <Dot tone={REQUEST_TONE[r.status]}>
            {data.hiring.statusText[r.status]}</Dot>
        ) },
        { key: "p", label: "Plan", render: plan },
        { key: "w", label: "Start", end: true, render: (r) =>
          r.start.display }]}
      actions={mayRaise(state.role) ? (
        <a className={`${b.btn} ${b.primary}`}
          href={hrefOf("people", "hiring", "requests", "new")}>
          Request a hire</a>
      ) : undefined}
      empty={"Nothing here. Choose another tab, or request a hire."} />
  );
}
