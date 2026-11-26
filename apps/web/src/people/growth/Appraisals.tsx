import type { AppraisalView } from "../../demo/data/team-types";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import { FilterList } from "../../ui/templates";
import { growthHref, profileHref, Status, useMe } from "../team/common";
import { fill } from "../team/words";
import { G } from "./words";
import s from "../team/team.module.css";

type Tone = "ok" | "open" | "plain";
const TONE: Record<AppraisalView["status"], Tone> = {
  "not-started": "plain", "self-done": "open", finalised: "ok" };
const WORD: Record<AppraisalView["status"], string> = {
  "not-started": G.appraisals.notStarted,
  "self-done": G.appraisals.waiting, finalised: G.appraisals.finalised };

/**
 * P60, Appraisals and cycles: the open cycle first, the closed ones one
 * click away. HR can send one reminder to everyone who has not started;
 * it is recorded with who and when, and can be undone.
 */
export function Appraisals(p: { cycleId?: string | undefined }) {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const me = useMe();
  const cycles = data.team.cycles();
  const cycle = cycles.find((c) => c.id === p.cycleId) ??
    cycles.find((c) => c.status === "open") ?? cycles[0];
  if (cycle === undefined) return null;
  const rows = data.team.appraisals(cycle.id);
  const g = G.appraisals;
  const waiting = rows.filter((a) => a.status === "not-started").length;
  const reminder = state.reminders[cycle.id];
  const mayRemind = state.role === "hr" && cycle.status === "open";
  const remind = (): void => {
    dispatch({ type: "team-remind", cycleId: cycle.id, byId: me.id,
      on: data.people.asOf });
    toast.show(fill(waiting === 1 ? g.remindedOne : g.reminded,
      { n: waiting }),
    () => dispatch({ type: "team-unremind", cycleId: cycle.id }));
  };
  const lede = cycle.status === "open"
    ? `${cycle.progressText}. ${fill(g.open, { self: cycle.selfDueOn.display,
      mgr: cycle.managerDueOn.display, close: cycle.closesOn.display })}`
    : `${cycle.progressText}. ${fill(g.closed,
      { close: cycle.closesOn.display })}`;
  const present = (["not-started", "self-done", "finalised"] as const)
    .filter((k) => rows.some((a) => a.status === k));
  return (
    <FilterList title={g.title} lede={lede} rows={rows}
      rowKey={(a) => a.id}
      searchText={(a) => `${a.employeeName} ${a.title} ${a.reviewerName}`}
      rowHref={(a) => profileHref(a.employeeId)}
      segments={[{ id: "all", label: g.all, match: () => true },
        ...present.map((k) => ({ id: k, label: WORD[k],
          match: (a: AppraisalView) => a.status === k }))]}
      actions={(
        <>
          <nav className={s.cycles} aria-label={g.cycle}>
            {cycles.map((c) => (
              <a key={c.id} href={growthHref("appraisals", c.id)}
                aria-current={c.id === cycle.id ? "page" : undefined}>
                {c.name}
              </a>
            ))}
          </nav>
          {mayRemind && reminder === undefined && waiting > 0 && (
            <button type="button" className={`${b.btn} ${b.primary} ${s.tall}`}
              onClick={remind}>
              {waiting === 1 ? g.remindOne : fill(g.remind, { n: waiting })}
            </button>
          )}
          {reminder !== undefined && (
            <span className={s.total}>
              {fill(g.remindedOn, { date: formatDate(reminder.on, lang),
                name: data.people.person(reminder.byId)?.name.en ?? "" })}
              <button type="button" className={`${b.btn} ${b.quiet} ${s.tall}`}
                onClick={() => dispatch({ type: "team-unremind",
                  cycleId: cycle.id })}>{g.undo}</button>
            </span>
          )}
        </>
      )}
      columns={[
        { key: "p", label: g.person, render: (a) => (
          <span className={s.name}>
            <span>{a.employeeName}</span>
            <span className={s.sub}>{a.title}</span>
          </span>) },
        { key: "s", label: g.status, render: (a) => (
          <Status tone={TONE[a.status]}>{WORD[a.status]}</Status>) },
        { key: "r", label: g.rating, render: (a) => (
          <span className={s.name}>
            <span>{a.rating === null
              ? (a.selfRating === null ? g.unrated
                : fill(g.self, { n: a.selfRating }))
              : `${a.rating}, ${a.ratingText}`}</span>
            {a.salaryOutcome !== null && (
              <span className={s.sub}>
                {g.payUp}
                <Money value={a.salaryOutcome.increase.value} size="sm"
                  tween={false} />
                {fill(g.payFrom, { date: a.salaryOutcome.effectiveOn
                  .display })}
              </span>
            )}
          </span>) },
        { key: "v", label: g.reviewer, render: (a) => a.reviewerName },
      ]}
      empty={g.empty} />
  );
}
