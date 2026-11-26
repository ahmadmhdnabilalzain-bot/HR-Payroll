import { Explainable } from "../../components/explain";
import { DRAFT_LABEL, NEXT_RUN_TEXT, REFERRAL_TERMS, type ReferralRow }
  from "../../demo/data/referrals";
import { markedIds } from "../../demo/referral-state";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { actorOf } from "../../setup/rules/actor";
import b from "../../ui/button.module.css";
import { useMaskText } from "../../ui/mask";
import { Money } from "../../ui/Money";
import { FilterList, StatusPill, type StatusTone } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { outstandingExplain } from "./explain";
import { useReferrals } from "./load";
import s from "./referrals.module.css";

const TONE: Record<ReferralRow["stage"], StatusTone> = {
  payable: "ok", probation: "neutral", open: "neutral", closed: "neutral" };

/** P22: bonuses and fees owed for hires, and where each one stands. */
export function Referrals() {
  const { rows, summary } = useReferrals();
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const mask = useMaskText();
  const actor = actorOf(data, state);
  const marked = markedIds(state);
  const sum = summary(marked);
  const label = (r: ReferralRow): string =>
    `${r.candidateName}, ${r.kindText.toLowerCase()}`;
  const mark = (r: ReferralRow): void => {
    dispatch({ type: "ref-mark", mark: { rowId: r.id, label: label(r),
      by: actor.who, role: state.role, on: actor.on } });
    toast.show(`Marked payable: ${label(r)}. A draft for the ` +
      `${NEXT_RUN_TEXT} run; nothing is added to the pay run.`,
    () => dispatch({ type: "ref-unmark", rowId: r.id, label: label(r) }));
  };
  const unmark = (r: ReferralRow): void => {
    dispatch({ type: "ref-unmark", rowId: r.id, label: label(r) });
    toast.show(`Mark taken back: ${label(r)}.`);
  };
  const markOf = (id: string) => state.referralMarks
    .find((m) => m.rowId === id);
  const word = (r: ReferralRow): { tone: StatusTone; text: string;
    sub: string } => {
    const m = markOf(r.id);
    if (m !== undefined) {
      return { tone: "done", text: "Marked payable", sub: `${m.by}, ` +
        `${formatDate(m.on, lang)}. Draft for ${NEXT_RUN_TEXT}` };
    }
    const sub = r.stage === "probation" && r.payableFrom !== null
      ? `Payable from ${r.payableFrom.display}, ${r.daysToPayable} days`
      : r.stage === "open" && r.payableFrom !== null
        ? `If hired on time, payable from ${r.payableFrom.display}`
        : r.stage === "payable" ? "The 90 days are done" : "";
    return { tone: TONE[r.stage], text: r.stageText, sub };
  };

  return (
    <FilterList title="Referrals and agencies"
      lede={`Bonuses for staff who referred a hire and fees for ` +
        `agencies, and when each is payable. ${DRAFT_LABEL}`}
      crumbs={[{ label: "People", href: "#/people" }]}
      meta={(
        <div className={s.meta}>
          <dl className={s.totals} aria-label="Totals">
            <div>
              <dt>Outstanding</dt>
              <dd><Explainable explanation={outstandingExplain(rows)}>
                <Money value={sum.outstanding} size="md" tween={false} />
              </Explainable></dd>
            </div>
            <div>
              <dt>Marked payable</dt>
              <dd><Money value={sum.marked} size="md" tween={false} /></dd>
            </div>
            <div>
              <dt>Not yet payable</dt>
              <dd><Money value={sum.notYet} size="md" tween={false} /></dd>
            </div>
          </dl>
          <p className={s.terms}>{mask(REFERRAL_TERMS)}</p>
        </div>
      )}
      rows={rows} rowKey={(r) => r.id}
      searchText={(r) => `${r.candidateName} ${r.sourceName} ` +
        `${r.roleText} ${r.kindText}`}
      segments={[
        { id: "all", label: "All", match: () => true },
        { id: "payable", label: "Payable",
          match: (r) => r.stage === "payable" },
        { id: "probation", label: "In 90 days",
          match: (r) => r.stage === "probation" },
        { id: "open", label: "Not hired",
          match: (r) => r.stage === "open" },
        { id: "closed", label: "Closed",
          match: (r) => r.stage === "closed" },
      ]}
      columns={[
        { key: "n", label: "Person", render: (r) => (
          <span className={s.person}>
            <span>{r.candidateName}</span>
            <small>{r.roleText}</small>
          </span>) },
        { key: "k", label: "Type", render: (r) => (
          <span className={s.person}>
            <span>{r.kindText}</span>
            <small>{r.sourceName}</small>
          </span>) },
        { key: "s", label: "Status", render: (r) => {
          const w = word(r);
          return (
            <span className={s.person}>
              <StatusPill tone={w.tone}>{w.text}</StatusPill>
              {w.sub !== "" && <small>{w.sub}</small>}
            </span>);
        } },
        { key: "a", label: "Amount", end: true, render: (r) => (
          <Money value={r.amount} size="sm" tween={false} />) },
      ]}
      rowActions={(r) => {
        const m = markOf(r.id);
        if (m !== undefined) {
          return (
            <button type="button" className={`${b.btn} ${b.quiet}`}
              onClick={() => unmark(r)}>Take back</button>);
        }
        return r.stage === "payable" ? (
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={() => mark(r)}>Mark payable</button>) : null;
      }}
      empty={"No referrals or agency hires yet. They appear here when a " +
        "candidate comes through a referral or an agency."} />
  );
}
