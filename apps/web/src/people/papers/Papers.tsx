import { useDemo } from "../../demo/state";
import type { ViewProps } from "../../views";
import { NotFound, Outside } from "./Outside";
import { canWork } from "./model";
import { Calendar } from "./Calendar";
import { Compliance } from "./Compliance";
import { Emiratisation } from "./Emiratisation";
import { LetterRecord, Letters } from "./Letters";
import { Pension } from "./Pension";
import { RequestRecord, Requests } from "./Requests";
import { VisaRecord, Visas } from "./Visas";
import { WarningRecord, Warnings } from "./Warnings";
import { hrefOf } from "../../demo/route";

/**
 * People papers: `#/people/papers/<screen>[/<id>]`. HR and the
 * General manager only (the guard is here, because People's own
 * visibility check does not cover these paths).
 */
export function Papers(p: ViewProps) {
  const { state } = useDemo();
  if (!canWork(state)) return <Outside />;
  const [, screen, id] = p.rest;
  switch (screen) {
    case "requests":
      return id === undefined ? <Requests /> : <RequestRecord id={id} />;
    case "letters":
      return id === undefined ? <Letters /> : <LetterRecord id={id} />;
    case "visas":
      return id === undefined ? <Visas /> : <VisaRecord id={id} />;
    case "warnings":
      return id === undefined ? <Warnings /> : <WarningRecord id={id} />;
    case "calendar": return <Calendar />;
    case "compliance": return <Compliance />;
    case "emiratisation": return <Emiratisation />;
    case "pension": return <Pension />;
    default:
      return <NotFound what="page" back="People"
        href={hrefOf("people")} />;
  }
}
