import { dispatchDue } from "../channels/dispatch";
import { deliverDueWebhooks } from "../webhooks/deliver";
import type { HandlerDeps } from "../deps";
import type { Enter } from "../http/context";

/** One background job: run once per `main.ts jobs` call. */
export interface Job {
  name: string;
  run(enter: Enter, deps: HandlerDeps): Promise<Record<string, number>>;
}

/**
 * Jobs that `main.ts jobs` runs once and exits (an external scheduler
 * calls it; none is set up, Ruling 3).
 */
export const JOBS: readonly Job[] = [
  { name: "notification-dispatch", run: async (enter, deps) =>
    ({ ...await dispatchDue(enter, deps) }) },
  { name: "webhook-delivery", run: async (enter, deps) =>
    ({ ...await deliverDueWebhooks(enter, deps) }) },
];
