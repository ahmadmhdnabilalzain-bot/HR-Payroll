/**
 * Plan 6 route ids not yet served while the plan was built task by
 * task. The conformance and leak suites skip these; the conformance
 * suite asserts the list is empty now that every route is served.
 */
export const PLAN6_PENDING: ReadonlySet<string> = new Set([]);
