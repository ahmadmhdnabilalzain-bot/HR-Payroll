import type { ViewProps } from "../../views";
import { Outside, useAllowed } from "../team/common";
import { Appraisals } from "./Appraisals";
import { Goals } from "./Goals";
import { Performance } from "./Performance";
import { Probation } from "./Probation";

/**
 * `#/people/growth/<screen>`: appraisals (and a cycle after it),
 * goals, performance and probation. HR and the General manager only.
 */
export function Growth(p: ViewProps) {
  const allowed = useAllowed();
  if (!allowed) return <Outside />;
  switch (p.rest[0]) {
    case "goals": return <Goals />;
    case "performance": return <Performance />;
    case "probation": return <Probation />;
    default: return <Appraisals cycleId={p.rest[1]} />;
  }
}
