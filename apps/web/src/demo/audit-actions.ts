import type { AuditAddition } from "./audit-state";
import type { Approval, DemoData } from "./data/types";
import { approvalItems } from "./approvals";
import type { Action, DemoState } from "./state";
import { personFor } from "./time-off";

/**
 * The audit trail entry an action in the demo adds (or null). Pure:
 * the provider appends it next to the action, so every step that
 * matters (an IBAN, a sign off, leave, signing, a rule) writes one
 * line with who did it and what. Nothing here shows an amount or an
 * IBAN. An undo is a new entry too: the trail is append only.
 */
export function auditFor(a: Action, s: DemoState, d: DemoData):
  AuditAddition | null {
  const on = d.payCalendar().asOf;
  const actorId = personFor(d, s.role);
  const who = d.employee(actorId).name.en;
  const nameOf = (id: string): string => d.employee(id).name.en;
  const make = (action: string, area: AuditAddition["area"],
    subject: AuditAddition["subject"], summary: string): AuditAddition =>
    ({ action, area, actorId, on, subject, summary });
  const emp = (id: string): AuditAddition["subject"] =>
    ({ kind: "employee", id, label: nameOf(id) });
  switch (a.type) {
    case "iban": return make("pay.iban-saved", "pay", emp(a.employeeId),
      `${who} saved a bank account for ${nameOf(a.employeeId)}.`);
    case "unset-iban": return make("pay.iban-cleared", "pay",
      emp(a.employeeId), `${who} cleared the bank account for ` +
      `${nameOf(a.employeeId)}.`);
    case "decide":
    case "undecide": return decision(a, s, d, make, who);
    case "time-decide": return make(a.verdict === "accept"
      ? "time.overtime-accepted" : "time.overtime-declined", "time",
    { kind: "approval", id: a.id, label: "Overtime" },
    `${who} ${a.verdict === "accept" ? "accepted" : "declined"} ` +
      "overtime.");
    case "request-leave": return make("time.leave-requested", "time",
      emp(a.draft.employeeId), `${nameOf(a.draft.employeeId)} asked ` +
      "for time off.");
    case "withdraw-leave":
    case "restore-leave": return make(a.type === "withdraw-leave"
      ? "time.leave-withdrawn" : "time.leave-restored", "time",
    { kind: "leave-request", id: a.id, label: "Time off request" },
    `${who} ${a.type === "withdraw-leave" ? "withdrew" : "restored"} a ` +
      "time off request.");
    case "esign": return esign(a.entry, d, make);
    case "req-new": {
      const line = a.draft.kind === "ticket" ? a.draft.values["line"] : "";
      return line === undefined || line === "" ? null
        : make("people.payslip-question-asked", "people",
          emp(a.draft.employeeId), `${nameOf(a.draft.employeeId)} asked ` +
          `HR about a payslip line: ${line}.`);
    }
    case "req-new-undo": {
      const r = s.reqMade.find((x) => x.id === a.id);
      const line = r?.kind === "ticket" ? r.values["line"] : undefined;
      return r === undefined || line === undefined ? null
        : make("people.payslip-question-withdrawn", "people",
          emp(r.employeeId), `${nameOf(r.employeeId)} withdrew a ` +
          `payslip question: ${line}.`);
    }
    case "rule-edit": return make("setup.rule-changed", "setup",
      { kind: "rule", id: a.edit.key, label: a.edit.what },
      `${who} changed a rule: ${a.edit.what}.`);
    case "rule-undo": return make("setup.rule-change-undone", "setup",
      { kind: "rule", id: String(a.id), label: "Rule change" },
      `${who} undid a rule change.`);
    case "connect-edit": return make("setup.connection-changed", "setup",
      { kind: "connection", id: a.edit.key, label: a.edit.what },
      `${who} changed a connection: ${a.edit.what}.`);
    case "access-signoff": return make("access.review-signed-off",
      "access", { kind: "review", id: "access", label: "Access review" },
      `${who} signed off the access review.`);
    case "access-unsign": return make("access.review-sign-off-undone",
      "access", { kind: "review", id: "access", label: "Access review" },
      `${who} took back the access review sign off.`);
    case "salary-hold": return make("pay.salary-held", "pay",
      emp(a.hold.employeeId), `${who} held the pay of ` +
      `${nameOf(a.hold.employeeId)}.`);
    case "salary-release": return make("pay.salary-released", "pay",
      emp(a.employeeId), `${who} released the pay of ` +
      `${nameOf(a.employeeId)}.`);
    case "plan-signoff": return make("pay.plan-signed-off", "pay",
      { kind: "plan", id: "pay-plan", label: "Pay plan" },
      `${who} signed off the pay plan.`);
    case "check-mark": return make(`pay.check-${a.note.mark}`, "pay",
      { kind: "check", id: a.id, label: "Anomaly check" },
      `${who} marked a check on ${nameOf(a.employeeId)} as ` +
      `${a.note.mark === "reviewed" ? "reviewed" : "expected"}.`);
    case "check-unmark": return make("pay.check-mark-undone", "pay",
      { kind: "check", id: a.id, label: "Anomaly check" },
      `${who} took back a mark on a check on ${nameOf(a.employeeId)}.`);
    default: return null;
  }
}

type Make = (action: string, area: AuditAddition["area"],
  subject: AuditAddition["subject"], summary: string) => AuditAddition;

const CODES: Record<string, [string, string, string, string]> = {
  "pay-run": ["payrun", "signed off", "the pay run", "pay"],
  leave: ["leave", "booked", "time off", "time"],
  expense: ["expense", "signed off", "an expense claim", "pay"] };

function decision(a: Extract<Action, { type: "decide" | "undecide" }>,
  s: DemoState, d: DemoData, make: Make, who: string): AuditAddition {
  const item: Approval | undefined = approvalItems(d, s)
    .find((x) => x.id === a.id);
  const [code, yes, what, area] = CODES[item?.kind ?? "leave"]
    ?? CODES["leave"]!;
  const subject = { kind: "approval", id: a.id,
    label: item?.title.en ?? "Approval" };
  const area2 = area as AuditAddition["area"];
  if (a.type === "undecide") {
    return make(`${code}.decision-undone`, area2, subject,
      `${who} took back the decision on ${what}.`);
  }
  const ok = a.verdict === "approve";
  return make(`${code}.${ok ? "signed-off" : "declined"}`, area2, subject,
    `${who} ${ok ? yes : "declined"} ${what}` +
    (item?.employeeId ? ` for ${d.employee(item.employeeId).name.en}.`
      : "."));
}

function esign(e: Extract<Action, { type: "esign" }>["entry"],
  d: DemoData, make: Make): AuditAddition {
  const doc = d.esign.docs().find((x) =>
    x.id === (e.kind === "remind" ? e.target : e.docId));
  const subject = { kind: "document", id: doc?.id ??
    (e.kind === "remind" ? e.target : e.docId),
  label: doc?.title ?? "Joining pack" };
  const act = e.kind === "sign" ? (e.verdict === "signed" ? "signed"
    : "declined to sign") : e.kind === "undo" ? "took back a signature on"
    : "sent a signing reminder for";
  const code = e.kind === "sign" ? `people.document-${e.verdict}`
    : e.kind === "undo" ? "people.signature-undone"
      : "people.signing-reminder";
  return make(code, "people", subject, `${e.name} ${act} ` +
    `${subject.label}.`);
}
