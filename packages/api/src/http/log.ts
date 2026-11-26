import type { Logger } from "../deps";

export interface RequestLine {
  requestId: string;
  method: string;
  routeId: string | null;
  status: number;
  ms: number;
  companyId: string | null;
  userId: string | null;
}

/** One line per request, exactly these keys: never a body or header. */
export function logRequest(log: Logger, line: RequestLine): void {
  log({
    requestId: line.requestId,
    method: line.method,
    routeId: line.routeId,
    status: line.status,
    ms: line.ms,
    companyId: line.companyId,
    userId: line.userId,
  });
}
