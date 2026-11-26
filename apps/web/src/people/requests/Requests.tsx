import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { Outside } from "../../shell/Outside";
import { NotFound } from "../papers/Outside";
import { AccessQueue, AccessRecord } from "./Access";
import { ChangeRecord, Changes } from "./Changes";
import { HelpDesk, TicketRecord } from "./HelpDesk";
import { canWork, canWorkAccess } from "./model";
import { SplitRecord, Splits } from "./Splits";
import { Entitlements, Travel, TravelRecord } from "./Travel";

/**
 * `#/people/requests/<screen>[/<id>]` (map rows P32, P36, P37, E15's
 * queue and H11). The guard is the registry's; the check here keeps a
 * role that reaches the path some other way out of the queues.
 */
export function Requests(p: { rest: string[] }) {
  const { state } = useDemo();
  const [, screen, id] = p.rest;
  const access = screen === "access" || screen === "splits";
  if (!(access ? canWorkAccess(state) : canWork(state))) return <Outside />;
  switch (screen) {
    case "changes":
      return id === undefined ? <Changes /> : <ChangeRecord id={id} />;
    case "travel":
      return id === undefined ? <Travel />
        : id === "entitlements" ? <Entitlements />
          : <TravelRecord id={id} />;
    case "helpdesk":
      return id === undefined ? <HelpDesk /> : <TicketRecord id={id} />;
    case "access":
      return id === undefined ? <AccessQueue /> : <AccessRecord id={id} />;
    case "splits":
      return id === undefined ? <Splits /> : <SplitRecord id={id} />;
    default:
      return <NotFound what="page" back="People" href={hrefOf("people")} />;
  }
}
