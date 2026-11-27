import type { AuditAddition } from "./audit-state";
import type { Approval, DemoData } from "./data/types";
import { approvalItems } from "./approvals";
import { bonusIdFor } from "./bonus-state";
import type { SandboxDraftSpec } from "./sandbox-state";
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
    case "policy-ack":
    case "policy-unack": {
      const p = d.policies.byId(a.policyId);
      const ack = a.type === "policy-ack";
      return make(ack ? "people.policy-acknowledged"
        : "people.policy-ack-undone", "people", { kind: "policy",
        id: a.policyId, label: p?.title ?? "Policy" },
      `${who} ${ack ? "acknowledged" : "took back the acknowledgement of"}` +
        ` ${p?.title ?? "a policy"}.`);
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
      `${who} took back the access review sign-off.`);
    case "salary-hold": return make("pay.salary-held", "pay",
      emp(a.hold.employeeId), `${who} held the pay of ` +
      `${nameOf(a.hold.employeeId)}.`);
    case "salary-release": return make("pay.salary-released", "pay",
      emp(a.employeeId), `${who} released the pay of ` +
      `${nameOf(a.employeeId)}.`);
    case "plan-signoff": return make("pay.plan-signed-off", "pay",
      { kind: "plan", id: "pay-plan", label: "Pay plan" },
      `${who} signed off the pay plan.`);
    case "bonus-new":
    case "bonus-remove":
    case "bonus-send":
    case "bonus-unsend":
    case "bonus-decide":
    case "bonus-undecide": return bonus(a, s, make, who);
    case "commission-prepare":
    case "commission-unprepare":
    case "commission-decide":
    case "commission-undecide": return commission(a, make, who);
    case "check-mark": return make(`pay.check-${a.note.mark}`, "pay",
      { kind: "check", id: a.id, label: "Anomaly check" },
      `${who} marked a check on ${nameOf(a.employeeId)} as ` +
      `${a.note.mark === "reviewed" ? "reviewed" : "expected"}.`);
    case "check-unmark": return make("pay.check-mark-undone", "pay",
      { kind: "check", id: a.id, label: "Anomaly check" },
      `${who} took back a mark on a check on ${nameOf(a.employeeId)}.`);
    case "sandbox-save": return make("pay.sandbox-plan-saved", "pay",
      SANDBOX, `${who} saved a draft pay plan from the sandbox: ` +
      `${sandboxWhat(a.plan.draft)}.`);
    case "sandbox-unsave": return make("pay.sandbox-plan-removed", "pay",
      SANDBOX, `${who} removed a draft pay plan from the sandbox.`);
    case "sandbox-discard": return make("pay.sandbox-discarded", "pay",
      SANDBOX, `${who} discarded a sandbox draft: ` +
      `${sandboxWhat(a.draft)}.`);
    case "sandbox-restore": return make("pay.sandbox-discard-undone",
      "pay", SANDBOX, `${who} took back the discard of a sandbox draft: ` +
      `${sandboxWhat(a.draft)}.`);
    case "ref-mark": return make("people.referral-marked-payable",
      "people", { kind: "referral", id: a.mark.rowId,
        label: a.mark.label },
      `${who} marked ${a.mark.label} payable, as a draft for the next ` +
      "run.");
    case "ref-unmark": return make("people.referral-mark-undone",
      "people", { kind: "referral", id: a.rowId, label: a.label },
      `${who} took back the payable mark on ${a.label}.`);
    case "hiring-raise":
    case "hiring-raise-undo":
    case "hiring-step":
    case "hiring-step-undo":
    case "hiring-message":
    case "hiring-message-undo":
    case "hiring-edit":
    case "hiring-edit-undo":
    case "budget-ask":
    case "budget-ask-undo":
    case "budget-decide":
    case "budget-undecide": return hiring(a, s, d, make, who);
    default: return null;
  }
}

const SANDBOX = { kind: "plan", id: "sandbox",
  label: "Pay-structure sandbox" };

/** What a draft is about, in words with no amount in them. */
function sandboxWhat(d: SandboxDraftSpec): string {
  const who = d.grade === null ? "everyone" : `grade G${d.grade}`;
  return d.kind === "housing-raise" ? `housing allowance for ${who}`
    : d.kind === "new-allowance" ? `a new allowance for ${who}`
      : "overtime rates";
}

type HiringAct = Extract<Action, { type: `hiring-${string}` |
  `budget-${string}` }>;

const STEP_CODE: Record<string, [string, string]> = {
  "with-hr": ["sent-again", "sent again"],
  "with-gm": ["sent-for-sign-off", "sent for sign-off"],
  open: ["signed-off", "signed off"], changes: ["changes-asked",
    "asked for changes to"], declined: ["declined", "declined"],
  "on-hold": ["put-on-hold", "put on hold"],
  withdrawn: ["withdrawn", "withdrew"], filled: ["filled", "marked filled"],
};

/** Hiring requests and budgets: one line each, never an amount. */
function hiring(a: HiringAct, s: DemoState, d: DemoData, make: Make,
  who: string): AuditAddition {
  const reqTitle = (id: string): string =>
    d.hiring.requests().find((r) => r.id === id)?.title ??
    d.hiring.jobTitle(s.hiringNew.find((x) => x.id === id)?.jobKey ?? "");
  const req = (id: string) => ({ kind: "hiring-request", id,
    label: `Hiring request, ${reqTitle(id)}` });
  const askOf = (id: string) => s.budgetAsks.find((x) => x.id === id);
  const budTitle = (budgetId: string | null, jobKey = ""): string =>
    d.hiring.budget().find((b) => b.id === budgetId)?.title ??
    d.hiring.jobTitle(jobKey);
  const askTitle = (id: string): string => {
    const x = askOf(id);
    const seed = d.hiring.budgetAsks().find((y) => y.id === id);
    return budTitle(x?.budgetId ?? seed?.budgetId ?? null, x?.jobKey);
  };
  const bud = (id: string, title: string) => ({ kind: "budget", id,
    label: `Hiring budget, ${title}` });
  switch (a.type) {
    case "hiring-raise": {
      const id = `hreq-new-${s.nextHiring}`;
      const t = d.hiring.jobTitle(a.draft.jobKey);
      return make("people.hiring-request-raised", "people",
        { kind: "hiring-request", id, label: `Hiring request, ${t}` },
        `${who} raised a hiring request for ${t}.`);
    }
    case "hiring-raise-undo": return make("people.hiring-request-undone",
      "people", req(a.id), `${who} took back the hiring request for ` +
      `${reqTitle(a.id)}.`);
    case "hiring-step": {
      const [code, verb] = a.step.from === "on-hold" &&
        a.step.to !== "withdrawn" ? ["resumed", "resumed"]
        : STEP_CODE[a.step.to] ?? ["changed", "changed"];
      return make(`people.hiring-${code}`, "people", req(a.step.requestId),
        `${who} ${verb} the hiring request for ` +
        `${reqTitle(a.step.requestId)}.`);
    }
    case "hiring-step-undo": {
      const st = s.hiringSteps.find((x) => x.id === a.id);
      const id = st?.requestId ?? "";
      return make("people.hiring-step-undone", "people", req(id),
        `${who} undid a step on the hiring request for ${reqTitle(id)}.`);
    }
    case "hiring-message": return make("people.hiring-message", "people",
      req(a.message.requestId), `${who} wrote in the hiring request for ` +
      `${reqTitle(a.message.requestId)}.`);
    case "hiring-message-undo": {
      const id = s.hiringMessages.find((x) => x.id === a.id)?.requestId
        ?? "";
      return make("people.hiring-message-removed", "people", req(id),
        `${who} took back a message on the hiring request for ` +
        `${reqTitle(id)}.`);
    }
    case "hiring-edit": return make("people.hiring-request-edited",
      "people", req(a.edit.requestId), `${who} edited the hiring request ` +
      `for ${reqTitle(a.edit.requestId)}.`);
    case "hiring-edit-undo": {
      const id = s.hiringEdits.find((x) => x.id === a.id)?.requestId ?? "";
      return make("people.hiring-edit-undone", "people", req(id),
        `${who} undid an edit to the hiring request for ${reqTitle(id)}.`);
    }
    case "budget-ask": {
      const t = budTitle(a.ask.budgetId, a.ask.jobKey);
      const id = `bask-new-${s.nextHiring}`;
      return a.ask.kind === "add"
        ? make("people.budget-position-added", "people", bud(id, t),
          `${who} added and signed off a budgeted position for ${t}.`)
        : a.ask.role === "gm" ? make("people.budget-changed", "people",
          bud(id, t), `${who} changed and signed off the hiring budget ` +
          `for ${t}.`)
          : make("people.budget-change-asked", "people", bud(id, t),
            `${who} asked to change the hiring budget for ${t}.`);
    }
    case "budget-ask-undo": return make("people.budget-ask-undone",
      "people", bud(a.id, askTitle(a.id)), `${who} took back a hiring ` +
      `budget change for ${askTitle(a.id)}.`);
    case "budget-decide": {
      const ok = a.decision.verdict === "signed-off";
      return make(`people.budget-${ok ? "signed-off" : "declined"}`,
        "people", bud(a.decision.askId, askTitle(a.decision.askId)),
        `${who} ${ok ? "signed off" : "declined"} a hiring budget change ` +
        `for ${askTitle(a.decision.askId)}.`);
    }
    case "budget-undecide": return make("people.budget-decision-undone",
      "people", bud(a.askId, askTitle(a.askId)), `${who} took back the ` +
      `decision on a hiring budget change for ${askTitle(a.askId)}.`);
  }
}

type Make = (action: string, area: AuditAddition["area"],
  subject: AuditAddition["subject"], summary: string) => AuditAddition;

/** Bonus runs: one entry per step and per undo; never an amount. */
function bonus(a: Extract<Action, { type: `bonus-${string}` }>,
  s: DemoState, make: Make, who: string): AuditAddition {
  const id = a.type === "bonus-new" ? bonusIdFor(s) : a.id;
  const label = a.type === "bonus-new" ? a.draft.label
    : s.bonusRuns.find((r) => r.id === id)?.label ?? "Bonus run";
  const subject = { kind: "bonus-run", id, label };
  const [code, text] = ((): [string, string] => {
    switch (a.type) {
      case "bonus-new": return ["bonus-prepared", "prepared"];
      case "bonus-remove": return ["bonus-removed", "removed the draft of"];
      case "bonus-send": return ["bonus-sent", "sent for sign-off"];
      case "bonus-unsend": return ["bonus-send-taken-back",
        "took back from sign-off"];
      case "bonus-decide": return a.decision.verdict === "signed"
        ? ["bonus-signed-off", "signed off"] : ["bonus-declined",
          "declined"];
      case "bonus-undecide": return ["bonus-decision-undone",
        "took back the decision on"];
    }
  })();
  return make(`pay.${code}`, "pay", subject,
    `${who} ${text} the bonus run: ${label}.`);
}

/** Commission statements: one entry per step and per undo. */
function commission(a: Extract<Action, { type: `commission-${string}` }>,
  make: Make, who: string): AuditAddition {
  const subject = { kind: "commission-month", id: a.month,
    label: "Sales commission statements" };
  const [code, text] = ((): [string, string] => {
    switch (a.type) {
      case "commission-prepare": return ["commission-prepared",
        "prepared"];
      case "commission-unprepare": return ["commission-unprepared",
        "took back"];
      case "commission-decide": return a.decision.verdict === "signed"
        ? ["commission-signed-off", "signed off"]
        : ["commission-declined", "declined"];
      case "commission-undecide": return ["commission-decision-undone",
        "took back the decision on"];
    }
  })();
  return make(`pay.${code}`, "pay", subject,
    `${who} ${text} the sales commission statements.`);
}

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
