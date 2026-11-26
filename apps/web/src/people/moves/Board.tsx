import { useState } from "react";
import type {
  CandidateStage,
  HiringCandidate,
} from "../../demo/data/moves-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList, Sheet } from "../../ui/templates";
import { dayText } from "../words";
import { Dot } from "./Dot";
import { Interviews } from "./Interviews";
import { requestHref, requestOfRequisition } from "../hiring/model";
import { nextStage, stageNow, STAGE_WORD, stepWho, useActor,
  type Tone } from "./view";
import s from "./moves.module.css";

const OPEN: CandidateStage[] = ["applied", "screening", "interview",
  "offer"];
const isOpen = (x: CandidateStage): boolean => OPEN.includes(x);

const TONE: Record<CandidateStage, Tone> = { applied: "neutral",
  screening: "neutral", interview: "info", offer: "info", hired: "ok",
  rejected: "neutral", withdrawn: "neutral" };

/**
 * Hiring: candidates by stage (P11). The stage filter is the board's
 * columns; every move is a button with an undo (drag is not needed).
 * A move records who, their role and the demo's date.
 */
export function Board() {
  const { data, state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const rows = data.moves.candidates();
  const at = (c: HiringCandidate): CandidateStage => stageNow(c, state);
  const move = (c: HiringCandidate, to: CandidateStage): void => {
    dispatch({ type: "move-step", key: `stage:${c.id}`, step: {
      value: to, from: at(c), by: actor.id, role: actor.role,
      on: actor.on } });
    toast.show(`${c.name}: ${STAGE_WORD[to]}`, () =>
      dispatch({ type: "move-undo", key: `stage:${c.id}` }));
  };
  const undo = (c: HiringCandidate): void =>
    dispatch({ type: "move-undo", key: `stage:${c.id}` });
  const chosen = rows.find((c) => c.id === open) ?? null;
  const step = chosen === null ? undefined
    : state.moveSteps[`stage:${chosen.id}`];
  const after = chosen === null ? null : nextStage(at(chosen));
  const position = chosen === null ? null
    : requestOfRequisition(data, state, chosen.requisitionId);
  const seg = (id: string, label: string, f: (x: CandidateStage) => boolean) =>
    ({ id, label, match: (c: HiringCandidate) => f(at(c)) });
  return (
    <>
      <FilterList title="Candidates" rows={rows}
        lede={data.moves.summary().text}
        rowKey={(c) => c.id}
        searchText={(c) => `${c.name} ${c.requisitionTitle} ${c.source}`}
        segments={[seg("process", "Open", isOpen),
          seg("interview", "Interview", (x) => x === "interview"),
          seg("offer", "Offer", (x) => x === "offer"),
          seg("finished", "Finished", (x) => !isOpen(x))]}
        columns={[
          { key: "n", label: "Candidate", render: (c) => (
            <button type="button" className={s.nameLink}
              onClick={() => setOpen(c.id)}>{c.name}</button>
          ) },
          { key: "r", label: "Role", render: (c) => c.requisitionTitle },
          { key: "s", label: "Stage", render: (c) => (
            <Dot tone={TONE[at(c)]}>{STAGE_WORD[at(c)]}</Dot>
          ) },
          { key: "x", label: "Next step", render: (c) =>
            state.moveSteps[`stage:${c.id}`] !== undefined
              ? `Moved ${dayText(actor.on, "en")}` : c.nextStep },
          { key: "a", label: "Action", end: true, render: (c) => {
            const st = at(c);
            const nx = nextStage(st);
            if (state.moveSteps[`stage:${c.id}`] !== undefined) {
              return (
                <button type="button" className={`${b.btn} ${b.quiet}`}
                  onClick={() => undo(c)}>Undo</button>
              );
            }
            if (nx !== null) {
              return (
                <button type="button" className={`${b.btn} ${b.secondary}`}
                  onClick={() => move(c, nx)}>
                  Move to {STAGE_WORD[nx]}
                  <span className="visually-hidden"> for {c.name}</span>
                </button>
              );
            }
            if (st === "offer") {
              return (
                <a className={s.tapLink}
                  href={hrefOf("people", "moves", "offers",
                  ...(c.offerId === null ? [] : [c.offerId]))}>
                  {c.offerId === null ? "Offers" : "Open offer"}
                </a>
              );
            }
            return null;
          } }]}
        empty="Nobody here. Move a candidate on, or choose another stage." />
      <Sheet open={chosen !== null} title={chosen?.name ?? ""}
        onClose={() => setOpen(null)}>
        {chosen !== null && (
          <div className={s.sheetStack}>
            <p className={s.quiet}>
              {chosen.requisitionTitle}. Applied {chosen.appliedOn.display}
              , through {chosen.source.toLowerCase()}.
            </p>
            <p>{chosen.note}</p>
            {position !== null && (
              <p className={s.quiet}>
                Position: <a className={s.tapLink}
                  href={requestHref(position.id)}>{`${position.title}, ` +
                  `${position.number}: job description, criteria and ` +
                  "timeline"}</a>
              </p>
            )}
            <Interviews list={chosen.interviews} />
            {step !== undefined && (
              <p className={s.quiet}>
                Moved to {STAGE_WORD[at(chosen)]} by {stepWho(data, step)}.
              </p>
            )}
            <div className={s.panelActions}>
              {step !== undefined ? (
                <button type="button" className={`${b.btn} ${b.secondary}`}
                  onClick={() => undo(chosen)}>Undo the move</button>
              ) : (
                <>
                  {after !== null && (
                    <button type="button" className={`${b.btn} ${b.primary}`}
                      onClick={() => move(chosen, after)}>
                      Move to {STAGE_WORD[after]}
                    </button>
                  )}
                  {isOpen(at(chosen)) && (
                    <button type="button"
                      className={`${b.btn} ${b.secondary}`}
                      onClick={() => move(chosen, "rejected")}>
                      Not taken forward
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
