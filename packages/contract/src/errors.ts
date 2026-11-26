import { z } from "zod";
import { CHANNEL_ERROR_STATUS } from "./errors-channels";
import { TIME_ERROR_STATUS } from "./errors-time";
import { HR_ERROR_STATUS } from "./errors-hr";

/**
 * Plan 6 (approvals, receipts, expenses). Claim problem codes
 * (CLAIM_PROBLEM_CODES) travel inside a CLAIM_PROBLEMS body and are
 * not API codes.
 */
const EXPENSE_ERROR_STATUS = {
  RECEIPT_BASE64_INVALID: 400,
  NOT_AN_APPROVER: 403,
  APPROVER_NEEDED_LATER: 403,
  APPROVAL_NOT_PENDING: 409,
  APPROVAL_STEP_CHANGED: 409,
  CHAIN_VERSION_CONFLICT: 409,
  CATEGORY_CODE_TAKEN: 409,
  POLICY_VERSION_CONFLICT: 409,
  CLAIM_NOT_EDITABLE: 409,
  CLAIM_NOT_CANCELLABLE: 409,
  RECEIPT_TOO_LARGE: 413,
  RECEIPT_TYPE_NOT_ALLOWED: 415,
  RECEIPT_QUOTA_EXCEEDED: 429,
  NO_ELIGIBLE_APPROVER: 422,
  CHAIN_INVALID: 422,
  RECEIPT_TYPE_MISMATCH: 422,
  POLICY_INVALID: 422,
  CANCEL_NOTE_REQUIRED: 422,
  CLAIM_PROBLEMS: 422,
  EXCLUDED_CLAIM_INVALID: 422,
} as const;

/** Plan 7 (files, documents, library, letters, Emiratisation). */
const DOCUMENT_ERROR_STATUS = {
  FILE_EMPTY: 400,
  FILE_BASE64_INVALID: 400,
  SALARY_LETTER_NEEDS_HR: 403,
  FILE_NOT_AVAILABLE: 409,
  DOCUMENT_SLOT_EXISTS: 409,
  VERSION_NOT_CURRENT: 409,
  VERSION_NOT_DRAFT: 409,
  TEMPLATE_NOT_PUBLISHED: 409,
  FILE_TOO_LARGE: 413,
  FILE_TYPE_NOT_ALLOWED: 415,
  MALFORMED_PLACEHOLDER: 422,
  UNKNOWN_MERGE_FIELD: 422,
  MERGE_VALUE_MISSING: 422,
  ARABIC_NOT_REVIEWED: 422,
  NOT_ARABIC_TEMPLATE: 422,
  EMPLOYEE_REQUIRED: 422,
  OVERRIDE_NOT_ALLOWED: 422,
  PDF_RENDERER_UNAVAILABLE: 503,
} as const;

/**
 * Every code an HTTP error body can carry, with its status. Internal
 * codes (MIGRATION_NAME, AUDIT_SENSITIVE_DATA, CANONICAL_NUMBER) are
 * not API codes and never reach a response. Pay-run problem codes
 * (EMPLOYEE_NOT_IN_PERIOD, ENTERED_AMOUNTS_REQUIRED,
 * SETTLEMENT_INPUT_REQUIRED) travel inside a PAY_RUN_PROBLEMS body.
 */
export const ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  COMPANY_HEADER_REQUIRED: 400,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  INVITE_INVALID: 400,
  MFA_CODE_INVALID: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  TENANT_FORBIDDEN: 403,
  MFA_REQUIRED: 403,
  MFA_ENROLMENT_REQUIRED: 403,
  SOD_VIOLATION: 403,
  NOT_FOUND: 404,
  INVITE_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  ALREADY_MEMBER: 409,
  MFA_ALREADY_ENROLLED: 409,
  MFA_NOT_STARTED: 409,
  LAST_OWNER: 409,
  EMPLOYEE_ALREADY_LINKED: 409,
  EMPLOYEE_NUMBER_TAKEN: 409,
  LEAVE_OVERLAP: 409,
  LEAVE_NOT_PENDING: 409,
  LEAVE_NOT_CANCELLABLE: 409,
  ALREADY_CLOCKED_IN: 409,
  NOT_CLOCKED_IN: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  RUN_EXISTS_FOR_PERIOD: 409,
  RUN_NOT_DRAFT: 409,
  RUN_NOT_APPROVED: 409,
  RUN_INPUTS_CHANGED: 409,
  INVITE_USED: 410,
  INVITE_EXPIRED: 410,
  BASIC_COMPONENT_REQUIRED: 422,
  DUPLICATE_COMPONENT: 422,
  MANAGER_CYCLE: 422,
  LEAVE_CROSSES_YEAR: 422,
  INSUFFICIENT_BALANCE: 422,
  NO_EMPLOYEE_LINK: 422,
  PAY_RUN_PROBLEMS: 422,
  EMPLOYEE_DATA_UNREADABLE: 422,
  RUN_EMPTY: 422,
  EMPLOYEE_NOT_IN_PERIOD: 422,
  ENTERED_AMOUNTS_REQUIRED: 422,
  SETTLEMENT_INPUT_REQUIRED: 422,
  SALARY_MISSING: 422,
  COMPANY_WPS_SETTINGS_MISSING: 422,
  EMPLOYEE_BANK_MISSING: 422,
  SIF_GENERATION_FAILED: 422,
  ENGINE_REFUSED: 422,
  PAYLOAD_TOO_LARGE: 413,
  ACCOUNT_LOCKED: 423,
  ...TIME_ERROR_STATUS,
  INTERNAL: 500,
  ...HR_ERROR_STATUS,
  ...EXPENSE_ERROR_STATUS,
  ...CHANNEL_ERROR_STATUS,
  ...DOCUMENT_ERROR_STATUS,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export const ERROR_CODES = Object.keys(ERROR_STATUS) as [
  ErrorCode,
  ...ErrorCode[],
];

export const ErrorCodeSchema = z.enum(ERROR_CODES);

const Strings = z.union([z.string(), z.array(z.string())]);

/**
 * Error detail: strings, string lists, or lists of flat objects of
 * strings and string lists (e.g. `problems` of a PAY_RUN_PROBLEMS
 * body: `[{ employeeId, code, missing: ["basic"] }]`). Never values a
 * caller may not see (salary amounts, IBANs, ids of protected data).
 */
export const ErrorDetail = z.record(
  z.string(),
  z.union([Strings, z.array(z.record(z.string(), Strings))]),
);
export type ErrorDetail = z.infer<typeof ErrorDetail>;

export const ApiErrorBody = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    requestId: z.string(),
    detail: ErrorDetail.optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;
