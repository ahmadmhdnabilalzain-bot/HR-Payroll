import type { LetterKind } from "../../demo/data/papers-types";
import type { Role } from "../../demo/state";
import type {
  LetterStatus,
  RequestStatus,
  VisaStatus,
  WarningStatus,
} from "./model";

/**
 * The papers screens' own words (English; Arabic stays hidden until
 * a native speaker has read it). Plain words only: a status says who
 * did what, and when, and makes no claim about a rule or an authority.
 */
export type Tone = "warn" | "info" | "ok" | "quiet" | "danger";

export const REQUEST_STATUS: Record<RequestStatus, [string, Tone]> = {
  open: ["Waiting", "warn"], "in-progress": ["In progress", "info"],
  done: ["Done", "ok"], declined: ["Declined", "quiet"],
  withdrawn: ["Withdrawn", "quiet"],
};

export const LETTER_STATUS: Record<LetterStatus, [string, Tone]> = {
  draft: ["Draft", "quiet"], pending: ["For signature", "warn"],
  issued: ["Issued", "ok"], withdrawn: ["Withdrawn", "quiet"],
};

export const VISA_STATUS: Record<VisaStatus, [string, Tone]> = {
  "to-start": ["To start", "warn"], "in-progress": ["In progress", "info"],
  completed: ["Done", "ok"],
};

export const WARNING_STATUS: Record<WarningStatus, [string, Tone]> = {
  draft: ["Draft", "warn"], issued: ["Issued", "ok"],
  closed: ["Closed", "quiet"], discarded: ["Discarded", "quiet"],
};

export const LETTER_KIND: Record<LetterKind, string> = {
  "salary-certificate": "Salary certificate", noc: "No-objection letter",
  experience: "Experience letter",
};

export const ROLE_WORD: Record<Role, string> = { hr: "HR manager",
  gm: "General manager", manager: "Team manager", employee: "Employee" };

/** Request kinds a person can raise (value, label). */
export const REQUEST_KINDS: [string, string][] = [
  ["bank-details", "Update bank details"],
  ["letter", "Letter or certificate"], ["air-ticket", "Air ticket"],
  ["profile-change", "Change of personal details"], ["other", "Other"],
];

export const LETTER_KINDS: [LetterKind, string][] = [
  ["salary-certificate", "Salary certificate"],
  ["noc", "No-objection letter"], ["experience", "Experience letter"],
];

/** What a step is called in a history line ("Started by ..."). */
export const VERB: Record<string, string> = { "in-progress": "Started",
  done: "Marked done", declined: "Declined", withdrawn: "Withdrawn",
  pending: "Sent for signature", issued: "Issued", discarded: "Discarded" };

/** "1 day", "3 days", "today". */
export function waitText(days: number): string {
  if (days <= 0) return "Today";
  return days === 1 ? "1 day" : `${String(days)} days`;
}

/** Where a request's package link leads, for the "Open" link. */
export const LINK_LABEL: Record<string, string> = {
  "enter-iban": "Enter the bank details in the pay run",
};
