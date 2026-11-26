import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import type { ViewProps } from "../../views";
import { Board } from "./Board";
import { Endings } from "./Ending";
import { Joiners } from "./Joiners";
import { Leavers } from "./Leavers";
import { Missing } from "./Missing";
import { Offers } from "./Offers";
import { Transfers } from "./Transfers";
import { Requisitions, Vacancies } from "./Requisitions";
import { PageHead } from "../../ui/templates";
import s from "./moves.module.css";

/**
 * Hiring, joining and leaving: `#/people/moves/<screen>/<id>`. HR and
 * the General manager only; any other role (a deep link, a role
 * switch on the page) falls back to a plain "outside your view".
 */
export function Moves(p: ViewProps) {
  const { state } = useDemo();
  const [, screen, id] = p.rest;
  if (state.role !== "hr" && state.role !== "gm") {
    return (
      <div className={s.frame}>
        <PageHead title="Outside your view"
          lede="Hiring, joining and leaving are for HR and the General manager."
          back={{ label: "People", href: hrefOf("people") }} />
      </div>
    );
  }
  switch (screen) {
    case "joiners": return <Joiners id={id} />;
    case "leavers": return <Leavers id={id} />;
    case "offers": return <Offers id={id} />;
    case "transfers": return <Transfers />;
    case "end": return <Endings />;
    case "board": return <Board />;
    case "requisitions": return <Requisitions />;
    case "vacancies": return <Vacancies />;
    default: return <Missing what="page" />;
  }
}
