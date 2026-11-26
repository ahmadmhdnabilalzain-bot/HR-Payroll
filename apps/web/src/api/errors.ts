import {
  ApiErrorBody,
  ERROR_STATUS,
  type ErrorCode,
  type PayRunProblem,
} from "./contract";

export type ErrorDetail = Record<string, string | string[]>;

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
 * The contract's error detail holds only strings, so each pay-run
 * problem travels as one JSON string (an ask to Plan 3: let detail
 * carry PayRunProblem objects). Unreadable entries are skipped loudly.
 */
function decodeProblems(detail: ErrorDetail): PayRunProblem[] {
  const raw = detail["problems"];
  if (raw === undefined) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.flatMap((s) => {
    try {
      return [JSON.parse(s) as PayRunProblem];
    } catch {
      console.error("unreadable pay-run problem", s);
      return [];
    }
  });
}

export function encodeProblems(ps: readonly PayRunProblem[]): string[] {
  return ps.map((p) => JSON.stringify(p));
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
