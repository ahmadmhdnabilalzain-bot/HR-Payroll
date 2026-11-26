import type { Tone } from "../papers/words";

/** The words of the letter-code and document-intake screens (English). */
export const V = {
  codesTitle: "Verifiable letters",
  codesLede: "Each salary certificate and no-objection letter carries a " +
    "short code. Another bank or landlord can enter it on the check " +
    "page. It shows who issued the letter, when and for whom. It never " +
    "shows a pay figure.",
  checkOpen: "Open the check page",
  all: "All", valid: "Valid", withdrawn: "Withdrawn",
  letter: "Letter", person: "Person", code: "Code", issued: "Issued",
  status: "Status",
  codesEmpty: "No letters carry a code yet. Sign and issue a letter " +
    "under Letters and its code appears here.",
  withdraw: "Withdraw this code", restore: "Restore this code",
  withdrawn1: "Code withdrawn. The check page now says so.",
  restored1: "Code restored.",
  notFound: "No letter found for this code.",
  back: "Verifiable letters",
  checkTitle: "Check a letter",
  checkLede: "Enter the code printed on the letter. Anyone can use this " +
    "page. It shows no pay figures.",
  codeLabel: "Letter code", codeHelp: "For example VL-7K2M-QX4R.",
  checkButton: "Check", checkEmpty: "Enter the code to check.",
  notFoundTitle: "Not found",
  notFoundBody: "No letter has this code. Check each character and try " +
    "again.",
  validTitle: "Valid", withdrawnTitle: "Withdrawn",
  preview: "What a bank sees",
  previewHelp: "This is the whole answer. There is no pay figure in it.",
  history: "History", details: "Details",
  intakeTitle: "Document intake",
  intakeLede: "Every document that came in: how, who took it, and which " +
    "record it was filed to.",
  drop: "Add a scanned document",
  intakeEmpty: "Nothing has come in. Add a scan with the button above.",
  file: "Document", source: "Source", receivedBy: "Taken in by",
  received: "Received", filedTo: "Filed to", from: "From",
  expires: "Expires",
  segAll: "All", segNew: "Added here", segOpen: "Not filed yet",
  expiryTitle: "Document expiry list",
  expiryLede: "Every dated paper on file, including scans taken in here. " +
    "Soonest first.",
  expiryEmpty: "No dated papers on file.",
  paper: "Paper", expiresOn: "Expires", left: "Time left",
  sheetTitle: "Add a scanned document",
  fileLabel: "Scanned file", fileHelp: "PDF or an image, up to 5 MB.",
  pickFile: "Drop a file here, or choose one",
  personLabel: "Belongs to", typeLabel: "Document type",
  expiryLabel: "Expiry date",
  expiryHelp: "Leave empty if the paper does not expire.",
  save: "Take in",
  needFile: "Choose a file first.", tooBig: "This file is over 5 MB.",
  needPerson: "Choose the person it belongs to.",
  taken: "Document taken in and filed.",
  undone: "Document taken out again.",
  hereNote: "The file is kept in this browser tab only. This page " +
    "does not read the text of a scan, and no legal validity is claimed.",
};

export const STATUS_TONE: Record<"valid" | "withdrawn", Tone> = {
  valid: "ok", withdrawn: "quiet" };

export function leftWord(days: number): [string, Tone] {
  if (days < 0) return ["Expired", "danger"];
  if (days <= 30) return ["Within 30 days", "warn"];
  if (days <= 90) return ["Within 90 days", "info"];
  return ["Valid", "ok"];
}
