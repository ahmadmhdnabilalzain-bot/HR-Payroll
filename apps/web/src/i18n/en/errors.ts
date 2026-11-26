import type { EnNamespace } from "../types";

/** One message per API error code, plus client-only codes. */
export const errors = {
  generic: "Something went wrong. Try again.",
  NETWORK: "Could not reach the server. Check your connection and try " +
    "again.",
  CONTRACT_MISMATCH: "The server sent data this app does not understand. " +
    "Report this with the reference below.",
  VALIDATION_FAILED: "Some of the details are not valid. Check the " +
    "highlighted fields.",
  COMPANY_HEADER_REQUIRED: "Choose a company first.",
  IDEMPOTENCY_KEY_REQUIRED: "The request was incomplete. Try again.",
  INVITE_INVALID: "This invite link is not valid.",
  MFA_CODE_INVALID: "The authenticator code is not correct.",
  UNAUTHENTICATED: "Your session has ended. Sign in again.",
  INVALID_CREDENTIALS: "Email, password or code is not correct",
  FORBIDDEN: "Your role cannot do this.",
  TENANT_FORBIDDEN: "You are not a member of this company.",
  MFA_REQUIRED: "Sign in again with your authenticator code to continue.",
  MFA_ENROLMENT_REQUIRED: "Add an authenticator app to your account " +
    "first.",
  SOD_VIOLATION: "You cannot approve something you created. Another " +
    "person must approve it.",
  NOT_FOUND: "This item was not found. It may have been removed.",
  EMAIL_TAKEN: "This email already has an account.",
  ALREADY_MEMBER: "This person is already a member of the company.",
  MFA_ALREADY_ENROLLED: "An authenticator app is already added.",
  MFA_NOT_STARTED: "Start adding an authenticator app first.",
  EMPLOYEE_NUMBER_TAKEN: "Another employee already has this number.",
  LEAVE_OVERLAP: "These dates overlap another request for this person.",
  LEAVE_NOT_PENDING: "This request was already decided.",
  LEAVE_NOT_CANCELLABLE: "This request can no longer be cancelled.",
  ALREADY_CLOCKED_IN: "Already clocked in.",
  NOT_CLOCKED_IN: "Not clocked in.",
  IDEMPOTENCY_KEY_REUSED: "This form was already sent with other " +
    "details. Start the pay run again.",
  RUN_EXISTS_FOR_PERIOD: "A pay run already exists for this month.",
  RUN_NOT_DRAFT: "This pay run is no longer a draft.",
  RUN_NOT_APPROVED: "Approve the pay run before preparing its salary " +
    "file.",
  INVITE_USED: "This invite was already used.",
  INVITE_EXPIRED: "This invite has expired. Ask for a new one.",
  BASIC_COMPONENT_REQUIRED: "A basic salary component is required.",
  DUPLICATE_COMPONENT: "A salary component appears twice.",
  LEAVE_CROSSES_YEAR: "A request cannot cross into the next year. Split " +
    "it in two.",
  INSUFFICIENT_BALANCE: "Not enough leave balance for these dates.",
  NO_EMPLOYEE_LINK: "Your account is not linked to an employee.",
  PAY_RUN_PROBLEMS: "Some employees need more details before the pay " +
    "run can be created.",
  EMPLOYEE_NOT_IN_PERIOD: "This person is not employed in this month.",
  ENTERED_AMOUNTS_REQUIRED: "Enter this month's amounts for this person.",
  SETTLEMENT_INPUT_REQUIRED: "Enter the leaver's details.",
  COMPANY_WPS_SETTINGS_MISSING: "Add the company's WPS employer id and " +
    "bank routing code first.",
  EMPLOYEE_BANK_MISSING: "Some employees have no bank details.",
  SIF_GENERATION_FAILED: "The salary file could not be prepared.",
  ENGINE_REFUSED: "This case is not modelled yet, so nothing was " +
    "calculated.",
  ACCOUNT_LOCKED: "This account is locked after too many attempts. Try " +
    "again later.",
  INTERNAL: "The server had a problem. Try again.",
  INVITE_NOT_FOUND: "This invite was not found. Ask for a new one.",
  LAST_OWNER: "The company needs at least one owner. Make someone else " +
    "an owner first.",
  RUN_INPUTS_CHANGED: "Salaries or unpaid leave changed since this " +
    "draft was made. Void it and create the pay run again.",
  SALARY_MISSING: "This person has no salary set.",
  PAYLOAD_TOO_LARGE: "The request was too large.",
} satisfies EnNamespace;
