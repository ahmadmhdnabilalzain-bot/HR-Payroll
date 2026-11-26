import { Suspense } from "react";
import { useDemo } from "../demo/state";
import { TimeOff } from "../timeoff/TimeOff";
import type { ViewProps } from "../views";
import { Against } from "./Against";
import { Balances } from "./Balances";
import { Outside } from "./Outside";
import { More } from "./more/More";
import { Crew, CrewRecord, Overtime, OvertimeRecord } from "./Overtime";
import { Punches } from "./Punches";
import { Register, RegisterRecord } from "./Register";
import { Plan, Roster } from "./Roster";
import { SLUG_ROLES } from "./routes";
import { Today } from "./Today";
import { loadTimeSource } from "../demo/data/time-load";
import { W } from "./words";

// Start loading the Time data at app start; it is its own chunk.
void loadTimeSource();

function Page(p: { rest: string[] }) {
  const [slug, a, b] = p.rest;
  switch (slug) {
    case "attendance": return <Today />;
    case "register": return a === undefined ? <Register />
      : <RegisterRecord id={a} />;
    case "against": return <Against />;
    case "punches": return <Punches />;
    case "overtime":
      if (a === "crew") return b === undefined ? <Crew />
        : <CrewRecord id={b} />;
      return a === undefined ? <Overtime /> : <OvertimeRecord id={a} />;
    case "roster": return <Roster />;
    case "plan": return <Plan />;
    case "balances": return <Balances />;
    default: return <Outside />;
  }
}

/**
 * `#/time-off`: the Time off view as it was. `#/time-off/<page>`: the
 * Time areas around it (attendance, overtime, rosters, balances).
 */
export function TimeRouter(p: ViewProps) {
  const { state } = useDemo();
  const slug = p.rest[0];
  if (slug === undefined) return <TimeOff rest={p.rest} />;
  if (slug === "more") return <More rest={p.rest} />;
  const roles = SLUG_ROLES[slug];
  if (roles === undefined || !roles.includes(state.role)) {
    return <Outside />;
  }
  return (
    <Suspense fallback={<p role="status" className="visually-hidden">
      {W.loading}</p>}>
      <Page rest={p.rest} />
    </Suspense>
  );
}
