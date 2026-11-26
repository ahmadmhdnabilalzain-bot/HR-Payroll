import { hrefOf } from "../../demo/route";
import { NotFound } from "../papers/Outside";
import { Outside } from "../team/common";
import { useAllowed } from "./common";
import { Iloe } from "./Iloe";
import { Incidents } from "./Incidents";
import { Insurance } from "./Insurance";
import { Policies } from "./Policies";

/**
 * `#/people/safety/<screen>[/<id>]`: health insurance, incidents, ILOE
 * and policy versions (People, Papers and safety). HR and the
 * General manager only; the registry guards the same.
 */
export function Safety(p: { rest: string[] }) {
  const ok = useAllowed();
  if (!ok) return <Outside />;
  const [screen, ...rest] = p.rest;
  switch (screen) {
    case "insurance": return <Insurance rest={rest} />;
    case "incidents": return <Incidents rest={rest} />;
    case "iloe": return <Iloe />;
    case "policies": return <Policies rest={rest} />;
    default:
      return <NotFound what="page" back="People"
        href={hrefOf("people")} />;
  }
}
