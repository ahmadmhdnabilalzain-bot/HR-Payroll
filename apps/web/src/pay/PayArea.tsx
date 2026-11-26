import { Suspense, type ReactNode } from "react";
import { useDemo } from "../demo/state";
import { canSeePayRecords } from "./derive";
import { CorrectionRecord, Corrections } from "./Corrections";
import { FineRecord, Fines } from "./Fines";
import { LoanRecord, Loans } from "./Loans";
import { Loading, Outside } from "./parts";
import { PastRuns, RunRecord } from "./PastRuns";
import { RevisionRecord, Revisions } from "./Revisions";
import { PayElements, PayGroups } from "./Rules";
import { SettlementRecord, Settlements } from "./Settlements";

/**
 * WP6's screens, routed under the pay run (`#/pay-run/<area>/<id>`,
 * the hash id stays `pay-run`). The pay run's own steps keep their
 * paths; PayRun.tsx hands any other first segment here.
 */
export const PAY_AREAS = ["loans", "revisions", "corrections",
  "settlements", "runs", "fines", "groups", "elements"] as const;
export type PayAreaId = (typeof PAY_AREAS)[number];

export const isPayArea = (x: string | undefined): x is PayAreaId =>
  PAY_AREAS.some((a) => a === x);

function screen(area: PayAreaId, id: string | undefined): ReactNode {
  switch (area) {
    case "loans": return id === undefined ? <Loans /> : <LoanRecord id={id} />;
    case "revisions": return id === undefined ? <Revisions />
      : <RevisionRecord id={id} />;
    case "corrections": return id === undefined ? <Corrections />
      : <CorrectionRecord id={id} />;
    case "settlements": return id === undefined ? <Settlements />
      : <SettlementRecord id={id} />;
    case "runs": return id === undefined ? <PastRuns />
      : <RunRecord id={id} />;
    case "fines": return id === undefined ? <Fines /> : <FineRecord id={id} />;
    case "groups": return <PayGroups />;
    case "elements": return <PayElements />;
  }
}

export function PayArea(p: { rest: string[] }) {
  const { state } = useDemo();
  const [area, id] = p.rest;
  if (!isPayArea(area)) return null;
  return (
    canSeePayRecords(state.role) ? (
      <Suspense fallback={<Loading />}>{screen(area, id)}</Suspense>
    ) : <Outside />
  );
}
