import {
  ApiErrorBody,
  ERROR_STATUS,
  PayRunProblem,
  type ErrorCode,
  type ErrorDetail,
} from "./contract";

export type { ErrorDetail };

/** Codes that never come from the server. */
export type ClientCode = "NETWORK" | "CONTRACT_MISMATCH";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly detail: ErrorDetail;
  /** Decoded from `detail.problems` on PAY_RUN_PROBLEMS, else empty. */
  readonly problems: PayRunProblem[];

  constructor(
    code: string,
    message: string,
    o: { status?: number; requestId?: string | null; detail?: ErrorDetail },
  ) {
    super(`${code}: ${message}`);
    this.name = "ApiError";
    this.code = code;
    this.status = o.status ?? 0;
    this.requestId = o.requestId ?? null;
    this.detail = o.detail ?? {};
    this.problems = decodeProblems(this.detail);
  }
}

/**
 * `detail.problems` of a PAY_RUN_PROBLEMS body is a list of objects.
 * An entry that is not a PayRunProblem is a contract mismatch: it is
 * reported loudly and left out rather than half-read.
 */
function decodeProblems(detail: ErrorDetail): PayRunProblem[] {
  const raw = detail["problems"];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: unknown) => {
    const r = PayRunProblem.safeParse(item);
    if (r.success) return [r.data];
    console.error("pay-run problem not in contract", item);
    return [];
  });
}

/** An error response body to an ApiError; a bad body is a mismatch. */
export function errorFromBody(status: number, body: unknown): ApiError {
  const parsed = ApiErrorBody.safeParse(body);
  if (!parsed.success) {
    return new ApiError("CONTRACT_MISMATCH", "error body not in contract",
      { status, detail: { status: String(status) } });
  }
  const e = parsed.data.error;
  return new ApiError(e.code, e.message, {
    status, requestId: e.requestId, detail: e.detail ?? {},
  });
}

/** Builds the body the server would send for this code. */
export function errorBody(
  code: ErrorCode,
  message: string,
  requestId: string,
  detail?: ErrorDetail,
): { status: number; body: ApiErrorBody } {
  const error = { code, message, requestId,
    ...(detail === undefined ? {} : { detail }) };
  return { status: ERROR_STATUS[code], body: { error } };
}

export function isApiError(e: unknown, code?: string): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}
