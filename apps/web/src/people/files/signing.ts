import type { DemoData } from "../../demo/data/types";
import type { DemoState } from "../../demo/state";
import { actorOf, esignRows, waitingFor } from "../esign/model";

/**
 * Papers waiting for the viewer's own signature (the register's count).
 * The register itself is D5's (people/esign/model.ts); this keeps the
 * P35 area's count on the same model.
 */
export const waitingSigns = (d: DemoData, s: DemoState): number =>
  waitingFor(esignRows(d, s), actorOf(d, s)).length;
