import {
  ERROR_STATUS,
  type ApiErrorBody,
  type ErrorCode,
  type ErrorDetail,
} from "@payroll/contract";
import { EngineError } from "@payroll/engine";
import { ZodError } from "zod";

type Detail = ErrorDetail;

/** An error that becomes an HTTP response with a stable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly detail: Detail | undefined;

  constructor(code: ErrorCode, message?: string, detail?: Detail) {
    super(message ?? MESSAGES[code] ?? code.toLowerCase().replace(/_/g,
      " "));
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.detail = detail;
  }
}

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: "The request failed validation",
  UNAUTHENTICATED: "Sign in first",
  INVALID_CREDENTIALS: "Email, password or code is wrong",
  ACCOUNT_LOCKED: "Too many failed sign-ins; try again later",
  COMPANY_HEADER_REQUIRED: "The X-Company-Id header is required",
  TENANT_FORBIDDEN: "You are not a member of this company",
  FORBIDDEN: "Your role cannot do this",
  MFA_REQUIRED: "Sign in with your authenticator code first",
  MFA_ENROLMENT_REQUIRED: "Set up an authenticator app first",
  NOT_FOUND: "Not found",
  INTERNAL: "Something went wrong",
  ENGINE_REFUSED: "The payroll engine refused this input",
};

function zodDetail(err: ZodError): Detail {
  const fields = err.issues.map((i) => i.path.map(String).join("."));
  return { fields: [...new Set(fields)],
    issues: err.issues.map((i) => i.code) };
}

/** Maps any thrown value to a status and body. Never echoes values. */
export function toErrorResponse(
  err: unknown,
  requestId: string,
): { status: number; body: ApiErrorBody } {
  const e = classify(err);
  const error: ApiErrorBody["error"] = { code: e.code,
    message: e.message, requestId };
  if (e.detail !== undefined) error.detail = e.detail;
  return { status: e.status, body: { error } };
}

/**
 * Zod 4's ZodError is not an `Error`, and Hono's onError only sees
 * `Error`s, so handlers' throws pass through this first.
 */
export function asError(err: unknown): Error {
  if (err instanceof ZodError) return classify(err);
  return err instanceof Error ? err : new ApiError("INTERNAL");
}

/** Contract refinements that name their own API code. */
const REFINE_CODES: readonly ErrorCode[] = ["OVERRIDE_NOT_ALLOWED"];

/** The code every issue names through `params.apiCode`, if one. */
function refineCode(err: ZodError): ErrorCode | null {
  const codes = new Set(err.issues.map((i) =>
    (i as { params?: { apiCode?: unknown } }).params?.apiCode));
  const [only] = [...codes];
  return codes.size === 1 && REFINE_CODES.includes(only as ErrorCode)
    ? only as ErrorCode : null;
}

function classify(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof ZodError) {
    return new ApiError(refineCode(err) ?? "VALIDATION_FAILED", undefined,
      zodDetail(err));
  }
  if (err instanceof EngineError) {
    return new ApiError("ENGINE_REFUSED", undefined,
      { engineCode: err.code });
  }
  return new ApiError("INTERNAL");
}
