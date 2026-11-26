/** The words of the signature and document screens (English only). */
export const S = {
  title: "E-signatures",
  lede: "Letters and offers that need a signature. It shows " +
    "the steps: a typed name, who and when. No legal validity is claimed.",
  toSign: "To sign", signed: "Signed", all: "All", paper: "Paper",
  signer: "Signs", status: "Status", role: "Role", about: "About",
  notAsked: "Not asked yet", waiting: "Waiting for signature",
  closed: "Closed", empty: "Nothing to sign.", signing: "Signing",
  details: "Details", askedBy: "Asked by",
  ask: "Ask for a signature", asked: "Signature asked for.",
  sign: "Sign", done: "Signed.", undo: "Undo the signature",
  typeName: (n: string): string => `Type the full name: ${n}`,
  typeHelp: "A typed name stands for the signature.",
  mismatch: (n: string): string => `The name must read exactly ${n}.`,
  signedLine: (name: string, by: string): string =>
    `Signed by typing "${name}", recorded by ${by}.`,
  signedBefore: "Signed and issued. The letter shows who and when.",
  onlyGm: "Only the General manager signs this letter.",
  onlyHrOffer: "The candidate signs. HR can type the name to try it.",
  offerNote: "In the real flow the candidate gets a link. Here, type " +
    "their name to try the step.",
  closedLine: "This paper was withdrawn or declined; nothing to sign.",
  askFirst: "HR asks for the signature first.",
  sendFirst: "The offer is sent from Offers; then it can be signed here.",
};

export const D = {
  title: "Documents",
  lede: "Papers on file for each person, with every version kept.",
  person: "Person", paper: "Paper", version: "Version", file: "File",
  when: "Added", all: "All", expiring: "Added recently",
  upload: "Add a file", save: "Add the file", empty: "No papers.",
  type: "Type", choose: "Choose a file", noFile: "Choose a file first.",
  tooBig: "That file is over 5 MB.", versions: "Versions", about: "About",
  current: "Current", older: "Older",
  added: (v: number): string => `Added as version ${v}.`,
  note: "Why the new version", noteHelp: "For example: renewed passport.",
  remove: "Remove this version", open: "Open", onFile: "On file",
  inBrowser: "Kept in this browser tab only.",
  before: "On file before the demo", expires: "Expires",
  number: "Number (masked)", by: "Added by",
};
