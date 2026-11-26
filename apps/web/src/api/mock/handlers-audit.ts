import { pageOf, verifyChain } from "./audit";
import type { Handler } from "./context";

const DEFAULT_LIMIT = 50;

export const AUDIT_HANDLERS = {
  listAuditEvents: (c, r) => {
    const q = r.query ?? {};
    const before = q["before"] === undefined ? undefined
      : Number(q["before"]);
    const limit = q["limit"] === undefined ? DEFAULT_LIMIT
      : Number(q["limit"]);
    return pageOf(c.s.audit, before, limit);
  },
  verifyAudit: (c) => verifyChain(c.s.audit),
} satisfies Record<string, Handler>;
