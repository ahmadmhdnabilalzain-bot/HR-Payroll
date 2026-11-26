import { AS_OF } from "./calendar";
import { DEMO_EMAIL_DOMAIN } from "./roster";
import { payCalendar } from "./summaries";
import type { DemoCompany } from "./types";
import { plural } from "./display";
import { APPROVAL_RULES, accessUsers } from "./wp9";
import { holidays } from "./wpd-templates";
import { shortDateText } from "./wp3";

/**
 * WPE connections (S32 decisions by WhatsApp, S33 email in, S34
 * calendar feeds). FICTIONAL sample data. Nothing is connected in a
 * browser-only demo, and every page says so first. Addresses end in
 * .test, tokens are shown masked, and the sample messages are built
 * from existing records and are never sent or received.
 */

export type ConnectPageId = "whatsapp" | "email-in" | "calendar";

export interface ConnectItem {
  key: string;
  label: string;
  value: string;
  help: string;
  /** The values a person may pick; null means read only. */
  choices: readonly string[] | null;
}

export interface ConnectGroup { title: string; items: ConnectItem[] }

export interface ConnectPage {
  id: ConnectPageId;
  title: string;
  lede: string;
  /** Said at the top: what is and is not connected. */
  notice: string;
  groups: ConnectGroup[];
}

export const ON_OFF = ["On", "Off"] as const;

const NOTICE = "Nothing is connected yet. No message is sent or received.";

const item = (key: string, label: string, value: string, help: string,
  choices: readonly string[] | null = null): ConnectItem =>
  ({ key, label, value, help, choices });

const nameOf = (c: DemoCompany, id: string): string =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;

const roleCount = (c: DemoCompany, roleId: string): string =>
  plural(accessUsers(c).filter((u) => u.roleIds.includes(roleId)).length,
    "person", "people");

function whatsapp(c: DemoCompany): ConnectPage {
  const pending = c.leaveRequests.find((r) => r.status === "pending");
  const sample = pending === undefined ? "No leave request is waiting."
    : `Leave: ${nameOf(c, pending.employeeId)} asks for leave from ` +
      `${shortDateText(pending.startDate)} to ` +
      `${shortDateText(pending.endDate)}. Reply YES to agree or NO to ` +
      "decline.";
  const rule = (id: string, label: string, how: string): ConnectItem => {
    const r = APPROVAL_RULES.find((x) => x.id === id)!;
    return item(`wa:${id}`, label, "Off", `${r.text} ${how}`, ON_OFF);
  };
  return { id: "whatsapp", title: "Decisions by WhatsApp",
    lede: "Let a manager answer a request from their phone.",
    notice: NOTICE,
    groups: [
      { title: "Switch", items: [item("wa:switch", "Decisions by WhatsApp",
        "Off", "Off until the company's own number is connected.",
        ON_OFF)] },
      { title: "Which requests can be answered by message", items: [
        rule("leave", "Leave", `${roleCount(c, "line-manager")} would ` +
          "get these."),
        rule("expense-small", "Small expense claims",
          "Short and clear, so a message is enough."),
        item("wa:expense-large", "Large expense claims", "On screen only",
          "These go to the General manager, who sees the receipt and " +
          "the amount on screen."),
        item("wa:pay-run", "Pay run", "On screen only",
          "A pay run is signed off on screen, where the checks are " +
          "shown. It is never answered by message."),
      ] },
      { title: "What the message says", items: [
        item("wa:sample", "Sample message", "Not sent", `${sample} ` +
          "Built from a request on this page."),
        item("wa:record", "Every answer is recorded", "Always",
          "Who answered, in which role and when go in the audit trail, " +
          "as for an answer on screen."),
      ] },
    ] };
}

function emailIn(c: DemoCompany): ConnectPage {
  const noIban = c.employees.find((e) => e.cases.includes("missing-iban"));
  const sick = c.leaveRequests.find((r) => r.leaveTypeId === "lt-sick");
  const gone = c.employees.find((e) => e.leavingDate !== null);
  const samples: ConnectItem[] = [
    ...(noIban === undefined ? [] : [item("em:iban",
      `Bank letter from ${noIban.fullName}`, "Bank details",
      `Goes to ${noIban.fullName}. The IBAN in the letter is checked ` +
      "before it is saved. Pay held for a missing account is released " +
      "only then.")]),
    ...(sick === undefined ? [] : [item("em:sick",
      `Medical certificate from ${nameOf(c, sick.employeeId)}`,
      "Leave request", `Goes to ${nameOf(c, sick.employeeId)}, sick ` +
      `leave from ${shortDateText(sick.startDate)}. Attached to the ` +
      "request.")]),
    ...(gone === undefined ? [] : [item("em:resign",
      `Resignation letter from ${gone.fullName}`, "End of employment",
      `Goes to ${gone.fullName}. Starts the exit steps for HR to ` +
      "confirm.")]),
  ];
  return { id: "email-in", title: "Email in to records",
    lede: "Send a letter or certificate to one address and it lands on " +
      "the right record.", notice: NOTICE,
    groups: [
      { title: "Address", items: [
        item("em:address", "Receiving address",
          `hr@inbox.${DEMO_EMAIL_DOMAIN}`,
          "An example address on a .test domain. It does not exist."),
        item("em:switch", "Email in", "Off",
          "Off until a real address is set up for the company.", ON_OFF),
        item("em:senders", "Who may send", "Company only",
          `Only senders at @${DEMO_EMAIL_DOMAIN} are read; others are ` +
          "held for HR to look at.", ["Company only", "Anyone"]),
      ] },
      { title: "Where a message goes", items: [
        item("em:rule-bank", "Bank letter", "Bank details",
          "The person's bank details. Checked as an IBAN before it is " +
          "saved."),
        item("em:rule-sick", "Medical certificate", "Leave request",
          "Matched on the sender and the dates."),
        item("em:rule-other", "Anything else", "Held for HR",
          "A person decides. Nothing is filed by guess."),
      ] },
      { title: "Sample messages, not received", items: samples },
    ] };
}

function calendar(c: DemoCompany): ConnectPage {
  const cal = payCalendar(c);
  const leave = c.leaveRequests.filter((r) => r.status === "pending" ||
    r.status === "approved").length;
  const docs = c.documents.filter((d) => d.daysLeft >= 0).length;
  const hols = holidays(c).filter((h) => h.state === "upcoming").length;
  const dates = cal.items.filter((x) => x.key !== "asOf").length;
  const feed = (id: string, label: string, n: number, who: string,
    tail: string, what: string): ConnectItem => item(`cal:${id}`, label,
    "Off", `${plural(n, "event", "events")}: ${what}. For ${who}. ` +
    `Address https://calendar.${DEMO_EMAIL_DOMAIN}/feeds/${id}/` +
    `${"*".repeat(8)}${tail}`, ON_OFF);
  return { id: "calendar", title: "Calendar feeds",
    lede: "Show leave, holidays and dates in a phone or desktop " +
      "calendar.", notice: NOTICE.replace("No message is sent or received.",
      "No feed is published."),
    groups: [
      { title: "Feeds", items: [
        feed("leave", "Team leave", leave, "managers and HR", "7c1d",
          "leave booked or waiting"),
        feed("holidays", "Public holidays", hols, "everyone",
          "02ae", "upcoming holidays"),
        feed("documents", "Document renewals", docs, "HR only",
          "9b40", "visas, Emirates IDs and passports still valid"),
        feed("pay", "Pay dates", dates, "HR and the General manager",
          "e5f3", "cut-off, sign-off, file and payday"),
      ] },
      { title: "About a feed", items: [
        item("cal:read", "Read only", "Always", "A calendar can read a " +
          "feed. It cannot change anything in the records."),
        item("cal:share", "Who can read it", "Link holders",
          "Anyone with the address can read it, so keep it secret. Turn " +
          "a feed off to stop it, then on again for a new address."),
        item("cal:asof", "Built on", shortDateText(AS_OF),
          "Counts are as of the date above."),
      ] },
    ] };
}

/** The three connection pages, built from the existing records. */
export function connectPages(c: DemoCompany): ConnectPage[] {
  return [whatsapp(c), emailIn(c), calendar(c)];
}

/** A page by id. */
export const connectPage = (c: DemoCompany, id: ConnectPageId)
  : ConnectPage => connectPages(c).find((p) => p.id === id)!;
