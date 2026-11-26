import { useState } from "react";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { PageHead } from "../ui/templates";
import s from "../people/requests/requests.module.css";
import tpl from "../ui/templates/templates.module.css";

interface Card {
  id: string;
  title: string;
  steps: string[];
  href: string;
  go: string;
  /** Who it is for: everyone, or the HR side only. */
  hr?: boolean;
}

const CARDS: readonly Card[] = [
  { id: "leave", title: "Ask for leave",
    steps: ["Open My leave.", "Press Request leave and pick the dates.",
      "Your manager decides. You see who decided and when."],
    href: hrefOf("me", "leave"), go: "Open My leave" },
  { id: "payslip", title: "Read my payslip",
    steps: ["Open My payslips and choose the month.",
      "Press a figure to see how it was worked out."],
    href: hrefOf("me", "payslips"), go: "Open My payslips" },
  { id: "change", title: "Change my details",
    steps: ["Open Change my details.",
      "Say what should change and the new value.",
      "HR may ask for a document before updating your record."],
    href: hrefOf("me", "change-details"), go: "Change my details" },
  { id: "letter", title: "Get a letter",
    steps: ["Open My requests and letters.",
      "Press Ask for a letter, choose which one and what it is for.",
      "The General manager signs it. The status shows where it is."],
    href: hrefOf("me", "hr-requests"), go: "Ask for a letter" },
  { id: "ask", title: "Ask HR a question",
    steps: ["Open My requests and letters and press Ask HR a question.",
      "Open the ticket later to read the reply and answer back."],
    href: hrefOf("me", "hr-requests"), go: "Ask HR" },
  { id: "access", title: "Ask for a role",
    steps: ["Open Request access and press Request a role.",
      "Say why you need it. HR or IT decides."],
    href: hrefOf("me", "access-request"), go: "Request access" },
  { id: "calendar", title: "See leave, holidays and payday",
    steps: ["Open My calendar and change the month with the arrows.",
      "Waiting leave carries the word waiting."],
    href: hrefOf("me", "calendar"), go: "Open My calendar" },
  { id: "run", title: "Check and sign off the pay run", hr: true,
    steps: ["Open Pay run and fix the items marked Stops pay.",
      "The maker sends it; the checker signs it off.",
      "Then the salary file is ready to send."],
    href: hrefOf("pay-run", "review"), go: "Open the pay run" },
  { id: "tickets", title: "Answer an HR ticket", hr: true,
    steps: ["Open HR help desk and choose a ticket.",
      "Write the reply and press Send reply.",
      "Press Mark solved when the question is answered."],
    href: hrefOf("people", "requests", "helpdesk"), go: "Open the help desk" },
  { id: "changes", title: "Update a record after a change request",
    hr: true, steps: ["Open Profile change requests.",
      "Ask for proof if the change needs a document.",
      "Press Update the record. Every step names who and when."],
    href: hrefOf("people", "requests", "changes"), go: "Open the requests" },
  { id: "reset", title: "Send a sign-off back to waiting", hr: true,
    steps: ["Open Sign-off splits and resets and choose the item.",
      "Press Send back to waiting and give a reason.",
      "The toast offers an undo."],
    href: hrefOf("people", "requests", "splits"), go: "Open splits" },
];

/** H12: a plain help centre: short how-to cards, no videos. */
export function MyHelp() {
  const { state } = useDemo();
  const [q, setQ] = useState("");
  const staff = state.role === "employee" || state.role === "manager";
  const shown = CARDS.filter((c) => (c.hr !== true || !staff) &&
    `${c.title} ${c.steps.join(" ")}`.toLowerCase()
      .includes(q.trim().toLowerCase()));
  return (
    <div className={tpl.page}>
      <PageHead title="Help"
        lede={"Short how-to cards for the things people ask most. Each " +
          "one has a link that takes you to the right page."} />
      <div className={s.stack}>
        <label className={s.field}>
          <span>Search help</span>
          <input type="search" className={s.search} value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="For example: payslip, letter, leave" />
        </label>
        {shown.length === 0 ? (
          <p className={s.muted}>No card matches. Try one word, such as
            leave or letter.</p>
        ) : (
          <div className={s.cards}>
            {shown.map((c) => (
              <article key={c.id} className={s.card}>
                <h2>{c.title}</h2>
                <ol>
                  {c.steps.map((x) => <li key={x}>{x}</li>)}
                </ol>
                <a className={s.link} href={c.href}>{c.go}</a>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
