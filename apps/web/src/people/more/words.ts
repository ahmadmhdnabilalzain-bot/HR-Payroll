/** The words of the extra People screens (English; Arabic stays hidden). */
export const M = {
  hire: {
    title: "New employee",
    lede: "People who accepted an offer, and anyone you add by hand. HR " +
      "makes the record and the General manager signs it off.",
    add: "Add employee",
    person: "Person",
    start: "Starts",
    status: "Status",
    toAdd: "To add",
    waiting: "Waiting for sign-off",
    signed: "Signed off",
    declined: "Declined",
    all: "All",
    inProgress: "To do",
    done: "Done",
    addRecord: "Add record",
    takeBack: "Take back",
    signOff: "Sign off",
    decline: "Decline",
    undo: "Undo",
    asGm: "View as General manager",
    asGmHelp: "A record waits for the General manager. Switch to sign it off.",
    submit: "Send for sign-off",
    form: "New employee record",
    fromOffer: "From the accepted offer {no}",
    empty: "No one to add. When a candidate accepts an offer they appear " +
      "here, or use Add employee.",
    nextTitle: "After sign-off",
    joinsOn: "Joins the staff list on {date}",
    by: "{who}, {date}",
    sent: "Sent to {name} for sign-off",
    taken: "Taken back",
    signedToast: "Signed off: {name}",
    declinedToast: "Declined: {name}",
    checklist: "Joiner checklist",
    name: "Full name",
    uae: "UAE national",
    department: "Department",
    job: "Job title",
    grade: "Grade",
    place: "Place",
    basic: "Monthly basic pay (AED)",
    basicBand: "Pay for grade {g} runs {band}.",
    basicHelp: "It must sit in the band for the grade.",
    startOn: "Start date",
    probation: "Probation (months)",
    choose: "Choose",
    yes: "Yes",
    no: "No",
    pensionNote: "Pension for UAE nationals is not computed in this demo.",
    notAmount: "Enter the basic pay as an amount, for example 15000.",
  },
};

/** Fill {name} placeholders. */
export function fill(text: string, v: Record<string, string | number>)
  : string {
  return text.replace(/\{(\w+)\}/g, (_m, k: string) => String(v[k] ?? ""));
}
