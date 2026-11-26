import type { HiringOffer } from "../../demo/data/moves-types";
import { useSwitchRole } from "../../demo/actions";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList, KeyValues, RecordTabs, type StatusTone }
  from "../../ui/templates";
import { Dot } from "./Dot";
import { Letter } from "./Letter";
import { Missing } from "./Missing";
import { offerNow, OFFER_SHORT, OFFER_WORD, stepWho, useActor, type OfferNow,
  type Tone } from "./view";

const TONE: Record<OfferNow, Tone> = { draft: "neutral", waiting: "warn",
  sent: "info", accepted: "ok", declined: "neutral" };

const hrefOffer = (id: string): string =>
  hrefOf("people", "moves", "offers", id);

const OFFER_TONE: Record<OfferNow, StatusTone> = { draft: "neutral",
  waiting: "warn", sent: "neutral", accepted: "ok", declined: "neutral" };

/** The one thing that happens next, said beside the buttons. */
const OFFER_NEXT: Record<OfferNow, string> = {
  draft: "The General manager signs off before the letter goes out.",
  waiting: "Waiting for the General manager to sign off.",
  sent: "Record the candidate's answer when it comes.",
  accepted: "The joiner checklist takes it from here.",
  declined: "The seat stays open." };

/** Offers and offer letters (P12). */
export function Offers(p: { id?: string | undefined }) {
  return p.id === undefined ? <OfferList /> : <OfferRecord id={p.id} />;
}

function OfferList() {
  const { data, state } = useDemo();
  const now = (o: HiringOffer): OfferNow => offerNow(o, state);
  return (
    <FilterList title="Offers" rows={data.moves.offers()}
      lede="Offer letters, from draft to the candidate's answer."
      rowKey={(o) => o.id} rowHref={(o) => hrefOffer(o.id)}
      searchText={(o) => `${o.candidateName} ${o.title} ${o.number}`}
      segments={[{ id: "all", label: "All", match: () => true },
        { id: "draft", label: "To send", match: (o) =>
          now(o) === "draft" || now(o) === "waiting" },
        { id: "sent", label: "Out", match: (o) => now(o) === "sent" },
        { id: "answered", label: "Answered", match: (o) =>
          now(o) === "accepted" || now(o) === "declined" }]}
      columns={[
        { key: "c", label: "Candidate", render: (o) => o.candidateName },
        { key: "t", label: "Role", render: (o) => o.title },
        { key: "n", label: "Letter", render: (o) => o.number },
        { key: "p", label: "Monthly pay", end: true,
          render: (o) => <Money value={o.gross} size="sm" /> },
        { key: "s", label: "Status", end: true, render: (o) => (
          <Dot tone={TONE[now(o)]}>{OFFER_WORD[now(o)]}</Dot>
        ) }]}
      empty="No offers yet. Move a candidate to Offer to prepare one." />
  );
}

function OfferRecord(p: { id: string }) {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const switchRole = useSwitchRole();
  const o = data.moves.offers().find((x) => x.id === p.id);
  if (o === undefined) return <Missing what="offer" />;
  const now = offerNow(o, state);
  const step = state.moveSteps[`offer:${o.id}`];
  const gm = data.people.person(data.people.personas().gmId);
  const joiner = data.moves.joiners().find((j) => j.candidateId ===
    o.candidateId);
  const go = (to: OfferNow, msg: string): void => {
    dispatch({ type: "move-step", key: `offer:${o.id}`, step: { value: to,
      from: now, by: actor.id, role: actor.role, on: actor.on } });
    toast.show(msg, () => dispatch({ type: "move-undo",
      key: `offer:${o.id}` }));
  };
  const btn = (kind: "primary" | "secondary" | "quiet", label: string,
    on: () => void) => (
    <button type="button" className={`${b.btn} ${b[kind]}`} onClick={on}>
      {label}
    </button>
  );
  const actions = (
    <>
      {step !== undefined && btn("quiet", "Undo", () =>
        dispatch({ type: "move-undo", key: `offer:${o.id}` }))}
      {now === "draft" && btn("primary", `Ask ${gm?.name.en ?? ""} to ` +
        "sign off", () => go("waiting", "Offer sent for sign-off"))}
      {now === "waiting" && actor.role === "gm" &&
        btn("primary", "Sign off and send", () =>
          go("sent", `Offer sent to ${o.candidateName}`))}
      {now === "waiting" && actor.role !== "gm" &&
        btn("secondary", "View as General manager", () => switchRole("gm"))}
      {now === "sent" && btn("primary", "Record accepted", () =>
        go("accepted", `${o.candidateName} accepted`))}
      {now === "sent" && btn("secondary", "Record declined", () =>
        go("declined", `${o.candidateName} declined`))}
      {now === "accepted" && joiner !== undefined && (
        <a className={`${b.btn} ${b.secondary}`}
          href={hrefOf("people", "moves", "joiners", joiner.id)}>
          Open joiner checklist
        </a>
      )}
    </>
  );
  return (
    <RecordTabs title={o.candidateName} lede={`${o.title}, ${o.number}`}
      back={{ label: "Offers", href: hrefOf("people", "moves", "offers") }}
      actions={actions}
      status={{ word: OFFER_SHORT[now], tone: OFFER_TONE[now] }}
      next={OFFER_NEXT[now]}
      history={[
        { what: "Prepared", when: o.preparedOn.display },
        ...(o.approvedBy === null ? [] : [{ what: "Signed off by " +
          o.approvedBy.name, when: o.approvedBy.on.display }]),
        ...(o.sentOn === null ? [] : [{ what: "Sent to the candidate",
          when: o.sentOn.display }]),
        ...(o.respondedOn === null ? [] : [{ what: "Answered",
          when: o.respondedOn.display }]),
        ...(step === undefined ? [] : [{ what: OFFER_WORD[now],
          when: `By ${stepWho(data, step)}` }])]}
      stats={[{ label: "Monthly pay", value: <Money value={o.gross}
        size="lg" /> }, { label: "Starts", value: o.joiningDate.display }]}
      tabs={[
        { id: "letter", label: "Letter", render: () => (
          <Letter lines={data.moves.letter(o.id)} /> ) },
        { id: "terms", label: "Pay and terms", render: () => (
          <KeyValues items={[
            { label: "Basic salary", value: <Money value={o.basic} /> },
            ...o.allowances.map((a) => ({ label: a.code === "conveyance"
              ? "Transport" : a.code[0]!.toUpperCase() + a.code.slice(1),
            value: <Money value={a.monthly} /> })),
            { label: "Total monthly pay", value: <Money value={o.gross} /> },
            { label: "Probation", value: `${o.probationMonths} months` }]} />
        ) },
        { id: "history", label: "History", render: () => (
          <KeyValues items={[
            { label: "Prepared", value: o.preparedOn.display },
            { label: "Signed off by", value: o.approvedBy === null
              ? (step?.value === "waiting"
                ? `Waiting for ${gm?.name.en ?? ""}` : "Not yet")
              : `${o.approvedBy.name}, ${o.approvedBy.on.display}` },
            { label: "Sent", value: o.sentOn?.display ?? "Not yet" },
            { label: "Open until", value: o.validUntil?.display ?? "None" },
            { label: "Answered", value: o.respondedOn?.display ?? "Not yet" },
            ...(step === undefined ? [] : [{ label: "In this demo",
              value: `${OFFER_WORD[now]}, by ${stepWho(data, step)}` }]),
            { label: "Note", value: o.note }]} />
        ) }]} />
  );
}
