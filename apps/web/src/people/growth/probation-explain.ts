import {
  text,
  type Explanation,
} from "../../components/explain/types";
import type { ProbationEvaluationView } from "../../demo/data/team-types";
import { fill } from "../team/words";
import { G } from "./words";

const dayOf = (iso: string): number => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86_400_000;
};

/**
 * The working behind "decide by": the engine gave the date; the panel
 * shows what it came from. The notice length is read back from the two
 * dates, so nothing is typed here. Rule status says "as we read it".
 */
export function decideByExplanation(x: ProbationEvaluationView,
  scope: string): Explanation {
  const g = G.prob;
  const gap = dayOf(x.probationEnd.iso) - dayOf(x.decideBy.iso);
  return {
    id: `probation-decide-by:${x.employeeId}`,
    title: g.exTitle, subject: x.employeeName,
    summary: fill(g.exSummary, { date: x.decideBy.display,
      end: x.probationEnd.display }),
    result: { label: g.exResult, value: text(x.decideBy.display) },
    inputs: [
      { label: g.exJoined, value: text(x.joiningDate.display),
        from: g.exFrom },
      { label: g.exEnds, value: text(x.probationEnd.display),
        from: g.exFrom }],
    rules: [{ text: g.exRule, status: "secondary",
      statusLabel: g.exStatus, citation: g.exCite }],
    steps: [
      { text: fill(g.exStep1, { joined: x.joiningDate.display,
        end: x.probationEnd.display }) },
      { text: fill(g.exStep2, { n: gap }), value: text(x.decideBy.display) }],
    notComputed: [], scope };
}
