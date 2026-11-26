import type { EnNamespace } from "../types";
import { timeErrors } from "./errors-time";

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
  EMPLOYEE_ALREADY_LINKED: "This person is already linked to a user " +
    "account.",
  MANAGER_CYCLE: "A person cannot report to someone who reports to them.",
  EMPLOYEE_DATA_UNREADABLE: "Some saved employee data could not be " +
    "read. Ask support to check it.",
  RUN_EMPTY: "This pay run has no employees. Add people first.",
  // Plan 6: approvals, receipts and expense claims.
  RECEIPT_BASE64_INVALID: "The receipt file could not be read. Try " +
    "uploading it again.",
  NOT_AN_APPROVER: "You are not an approver for this step.",
  APPROVER_NEEDED_LATER: "You are needed for a later step, so someone " +
    "else must approve this one.",
  APPROVAL_NOT_PENDING: "This approval is already closed.",
  APPROVAL_STEP_CHANGED: "This approval moved on meanwhile. Refresh and " +
    "check it again.",
  CHAIN_VERSION_CONFLICT: "Someone else changed the approval chain. " +
    "Refresh and try again.",
  CATEGORY_CODE_TAKEN: "An expense category already uses this code.",
  POLICY_VERSION_CONFLICT: "Someone else changed the expense policy. " +
    "Refresh and try again.",
  CLAIM_NOT_EDITABLE: "This claim can no longer be changed.",
  CLAIM_NOT_CANCELLABLE: "This claim can no longer be cancelled.",
  RECEIPT_TOO_LARGE: "The receipt is larger than 5 MB.",
  RECEIPT_TYPE_NOT_ALLOWED: "Receipts must be JPEG, PNG or PDF files.",
  NO_ELIGIBLE_APPROVER: "Nobody else can approve this. Add another " +
    "owner, HR user or approver first.",
  CHAIN_INVALID: "The approval chain is not valid. Check the tiers and " +
    "approvers.",
  RECEIPT_TYPE_MISMATCH: "The file type does not match its contents.",
  POLICY_INVALID: "The expense policy is not valid. Check the marked " +
    "rows.",
  CANCEL_NOTE_REQUIRED: "Add a note to cancel an approved claim.",
  CLAIM_PROBLEMS: "The claim has problems. Fix the marked items.",
  RECEIPT_QUOTA_EXCEEDED: "Too many receipts uploaded today. Try again " +
    "tomorrow or ask HR to raise the limit.",
  EXCLUDED_CLAIM_INVALID: "Only approved claims waiting for payment can " +
    "be left out of a run.",
  ...timeErrors,
  // Plan 8 (hiring, onboarding, tasks, exits, goals).
  TASK_TRANSITION: "This task cannot move to that status.",
  REQUISITION_NOT_OPEN: "This requisition is not open.",
  CANDIDATE_EXISTS: "A candidate with this email already exists.",
  APPLICATION_EXISTS: "This candidate already applied here.",
  APPLICATION_CLOSED: "This application is closed.",
  SCORECARD_EXISTS: "You already sent a scorecard for this.",
  APPLICATION_NOT_AT_OFFER: "Move the application to the offer stage.",
  OFFER_EXISTS: "This application already has a live offer.",
  OFFER_NOT_APPROVED: "The offer is not approved yet.",
  OFFER_EXPIRED: "The offer expired before this response date.",
  OFFER_NOT_WITHDRAWABLE: "This offer can no longer be withdrawn.",
  OFFER_NOT_ACCEPTED: "Only an accepted offer can become a hire.",
  EXIT_EXISTS: "This person already has an open exit.",
  EXIT_NOT_APPROVED: "Approve the exit first.",
  EXIT_NOT_OPEN: "This exit is no longer open.",
  EXIT_ACCESS_REVOKED: "Access was revoked; the exit stays.",
  SETTLEMENT_REQUIRED: "Compute the final settlement first.",
  EXIT_BEFORE_LAST_DAY: "Close the exit from the last working day.",
  CLEARANCE_OPEN: "Some clearance tasks are still open.",
  ACCESS_NOT_REVOKED: "Revoke the person's access first.",
  GOAL_CLOSED: "This goal is closed.",
  SETTLEMENT_STALE: "The salary changed; compute the settlement again.",
  ASSIGNEE_NOT_MEMBER: "The assignee is not a member here.",
  INTERVIEW_TIMES: "The interview must end after it starts.",
  INTERVIEWER_ROLE: "Interviewers must be owners, HR or managers.",
  EMPLOYMENT_TERMS_REQUIRED: "Set the employment terms first.",
  SALARY_REQUIRED: "Set a basic salary first.",
  // Plan 7: files, documents, library, letters, Emiratisation.
  FILE_EMPTY: "The file is empty.",
  FILE_BASE64_INVALID: "The file could not be read. Upload it again.",
  SALARY_LETTER_NEEDS_HR: "Only an owner or HR can issue letters that " +
    "show a salary.",
  FILE_NOT_AVAILABLE: "This file is already used or was uploaded by " +
    "someone else. Upload it again.",
  DOCUMENT_SLOT_EXISTS: "This employee already has a document of this " +
    "type. Add a new version instead.",
  VERSION_NOT_CURRENT: "A newer version exists. Open the latest one.",
  VERSION_NOT_DRAFT: "Only a draft version can be published.",
  TEMPLATE_NOT_PUBLISHED: "This template has no published version yet.",
  FILE_TOO_LARGE: "The file is larger than 10 MB.",
  FILE_TYPE_NOT_ALLOWED: "Only PDF, PNG and JPEG files can be uploaded.",
  MALFORMED_PLACEHOLDER: "A placeholder in the template is not written " +
    "correctly.",
  UNKNOWN_MERGE_FIELD: "The template uses a field that does not exist.",
  MERGE_VALUE_MISSING: "Some details the letter needs are missing.",
  ARABIC_NOT_REVIEWED: "This Arabic version needs a native review before " +
    "it can be issued.",
  NOT_ARABIC_TEMPLATE: "Native review applies to Arabic templates only.",
  EMPLOYEE_REQUIRED: "Choose an employee for this letter.",
  OVERRIDE_NOT_ALLOWED: "This value cannot be changed here.",
  PDF_RENDERER_UNAVAILABLE: "Letters cannot be created right now. Try " +
    "again later.",
  RATE_LIMITED: "Too many requests in a short time. Wait a minute and " +
    "try again.",
  PDF_RENDERER_BUSY: "Many letters are being prepared. Try again in a " +
    "few seconds.",
  ACK_NOT_REQUIRED: "This document does not ask for an acknowledgement.",
  FILE_QUOTA_EXCEEDED: "Today's upload limit is reached. Try again " +
    "tomorrow.",
} satisfies EnNamespace;
