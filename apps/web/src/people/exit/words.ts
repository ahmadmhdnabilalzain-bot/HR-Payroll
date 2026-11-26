/** The words of the exit interview screens (English only, like Team). */
export const X = {
  title: "Exit interviews",
  lede: "A short talk with each person who is leaving: why, and what " +
    "would have kept them.",
  all: "All", planned: "Planned", held: "Held",
  person: "Person", interview: "Interview", reason: "Main reason",
  status: "Status", heldOn: "Held", plannedOn: "Planned for",
  notYet: "Not recorded yet", empty: "No exit interviews yet.",
  summary: "Reasons for leaving",
  noSummary: "No interviews held yet.",
  basis: (n: number): string => n === 1
    ? "From 1 interview held. The bank has one leaver in this sample."
    : `From ${n} interviews held.`,
  schedule: "Schedule an interview", scheduleGo: "Schedule",
  scheduleNote: "The interview is with the HR manager. Nothing is sent.",
  when: "Date", needBoth: "Choose a person and a date.",
  notPast: "Choose today or a later day.",
  scheduled: (n: string): string => `Interview planned with ${n}.`,
  form: "Interview form", about: "About", mainReason: "Main reason",
  comment: "Anything else", none: "Nothing noted",
  heldBy: "Held by", fromRecord: "As written on the resignation",
  sampleKept: "The sample interview keeps only the main reason. Plan a " +
    "new one to fill in the form.",
  save: "Save the interview", saved: "Interview saved.",
  reopen: "Reopen the form", onlyHr: "The HR manager fills in this form.",
  lastDay: "Last working day", notSet: "Not set", interviewer: "Interviewer",
};
