import {
  ApiErrorBody,
  ERROR_STATUS,
  type ErrorCode,
  type ErrorDetail as ContractErrorDetail,
  type PayRunProblem,
} from "./contract";

export type ErrorDetail = ContractErrorDetail;

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
 * Pay-run problems arrive as objects in `detail.problems` (the contract
 * now allows them); older JSON-string entries are still read.
 * Unreadable entries are skipped loudly.
 */
function isProblem(v: unknown): v is PayRunProblem {
  const p = v as Partial<PayRunProblem> | null;
  return typeof v === "object" && p !== null &&
    typeof p.employeeId === "string" && typeof p.code === "string" &&
    Array.isArray(p.missing);
}

function decodeProblems(detail: ErrorDetail): PayRunProblem[] {
  const raw = detail["problems"];
  if (raw === undefined) return [];
  const list: unknown[] = Array.isArray(raw) ? raw : [raw];
  return list.flatMap((item) => {
    try {
      const v: unknown = typeof item === "string" ? JSON.parse(item) : item;
      if (!isProblem(v)) throw new Error("not a problem");
      return [v];
    } catch {
      console.error("unreadable pay-run problem");
      return [];
    }
  });
}

export function encodeProblems(ps: readonly PayRunProblem[])
  : PayRunProblem[] {
  return ps.map((p) => ({ employeeId: p.employeeId, code: p.code,
    missing: [...p.missing] }));
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
