import { HttpFailure, type HttpResponse, type SendOutcome } from "./ports";

/**
 * Maps an HTTP answer to an outcome: 2xx with an id is sent; 401, 403
 * and 422 (any other 4xx) are permanent; 429 and 5xx are retried.
 */
export function outcomeOf(res: HttpResponse, id: string | null)
  : SendOutcome {
  if (res.status >= 200 && res.status < 300 && id !== null) {
    return { status: "sent", providerMessageId: id };
  }
  const retryable = res.status === 429 || res.status >= 500;
  return { status: "failed", retryable, code: `HTTP_${res.status}` };
}

/** No HTTP answer (timeout, network, TLS): worth a retry. */
export function transportFailure(e: unknown): SendOutcome {
  if (e instanceof HttpFailure) {
    return { status: "failed", retryable: true, code: e.code };
  }
  throw e;
}

/** One string field of a JSON body, or null. */
export function jsonField(body: string, pick: (j: any) => unknown)
  : string | null {
  try {
    const v = pick(JSON.parse(body));
    return typeof v === "string" && v !== "" ? v : null;
  } catch {
    return null;
  }
}
