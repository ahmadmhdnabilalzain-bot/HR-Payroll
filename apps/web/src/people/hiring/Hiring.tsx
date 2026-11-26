import { useDemo } from "../../demo/state";
import { Outside } from "../../shell/Outside";
import { BudgetList, BudgetRecord } from "./Budget";
import { mayRaise } from "./model";
import { RequestForm } from "./RequestForm";
import { RequestList } from "./RequestList";
import { RequestRecord } from "./RequestRecord";

/**
 * Hiring: `#/people/hiring/budget[/<id>]` (HR and the General manager)
 * and `#/people/hiring/requests[/new[/<budget>]|/<id>]` (HR, the GM
 * and a manager for their own team). Every other role, and any deep
 * link a role may not open, gets a plain "outside your view".
 */
export function Hiring(p: { rest: string[] }) {
  const { state } = useDemo();
  const [screen, id, extra] = p.rest;
  const role = state.role;
  if (!mayRaise(role)) return <Outside />;
  if (screen === "budget") {
    if (role !== "hr" && role !== "gm") return <Outside />;
    return id === undefined ? <BudgetList /> : <BudgetRecord id={id} />;
  }
  if (screen === "requests") {
    if (id === "new") return <RequestForm budgetId={extra ?? null} />;
    return id === undefined ? <RequestList /> : <RequestRecord id={id} />;
  }
  return <Outside missing />;
}
