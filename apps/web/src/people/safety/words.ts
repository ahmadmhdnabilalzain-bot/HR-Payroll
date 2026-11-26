/** The words of the Safety and cover screens (English only, like Team). */
export const T = {
  insurance: { title: "Health insurance",
    lede: "Who is covered, the card (number masked) and when cover " +
      "renews. A register only.",
    person: "Person", status: "Status", card: "Card", renewal: "Renewal",
    all: "All", pending: "Card pending", ended: "Cover ended",
    covered: "Covered", empty: "Nobody here.",
    back: "Health insurance", insurer: "Insurer", starts: "Cover starts",
    ends: "Cover ended", renews: "Renews", cover: "Cover",
    notIssued: "Not issued yet", issuedNow: "Issued (number masked)",
    issue: "Mark card issued", place: "Works at", job: "Job",
    issuedMsg: "Card marked issued for {name}.",
    undone: "Card issue undone." },
  incidents: { title: "Safety incidents",
    lede: "A log of what happened, how serious it was and what was done.",
    incident: "Incident", severity: "Severity", status: "Status",
    when: "Date and place", open: "Open", all: "All",
    empty: "No incidents. Report one here when it happens.",
    back: "Safety incidents", what: "What happened", involved: "Involved",
    reportedBy: "Reported by", date: "Date", place: "Place",
    actions: "Actions taken", noActions: "No action recorded yet.",
    record: "Record action taken", close: "Close incident",
    recordedMsg: "Action recorded for {title}.",
    closedMsg: "{title} closed.", undone: "Undone.",
    reported: "Reported", details: "Details",
    scope: "Only what happened at work is logged here. Nothing is " +
      "sent to any authority from this page." },
  iloe: { title: "ILOE insurance",
    person: "Person", status: "Status", note: "Detail", all: "All",
    due: "Due", subscribed: "Subscribed", exempt: "Exempt",
    empty: "Nobody here." },
  policies: { title: "Policies",
    lede: "The HR policies, the version in force and who has read them.",
    policy: "Policy", version: "Version", effective: "In force from",
    owner: "Owner", read: "Read", all: "All",
    toRead: "Not all read", empty: "No policies.",
    back: "Policies", about: "About", acks: "Read and acknowledged",
    history: "Versions", current: "In force", before: "Replaced",
    summary: "What it covers", person: "Person", record: "Record as read",
    recordedMsg: "Recorded as read and acknowledged for {name}.",
    undone: "Undone.", notYet: "Not yet", joinedAfter: "Joined since " +
      "this version",
    ackNote: "Recording a read here is a note by HR. It is not a " +
      "signature." },
  report: { title: "Safety incidents report",
    month: "Month", low: "Low", medium: "Medium", high: "High",
    total: "Total", open: "Still open", figure: "Incidents logged",
    note: "Severity is the word HR gives each incident. Open means " +
      "action is still to be taken or the incident is not yet closed. " +
      "Nothing here is sent to any authority." },
};

/** "{n}" style fill, as in team/words.ts. */
export function fill(text: string, v: Record<string, string | number>)
  : string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
}
