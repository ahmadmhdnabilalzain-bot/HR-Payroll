# Project Ledger

The record of the owner's decisions, standing instructions and the future
plan. **Append only.** New entries go at the bottom of their section, dated.
When something changes, add a new entry saying what it replaces; never
rewrite history.

Section 1 and 2 are the owner's words (quoted or closely paraphrased).
Section 3 is Claude's calls: the owner can overrule any of them. Keeping
them apart is deliberate.

## 1. Owner decisions (the owner's words)

| Date | Decision |
|---|---|
| 2026-11-25 | "I wanna create an App for companies that is basically for HR and Payroll." Research the top competitors, then build something superior. |
| 2026-11-25 | "In UAE these are the ones": Yomly, HONO, Bayzat, GulfHR, ZenHR, NeuralHR.AI, StackHX, Zoho Payroll + Zoho People, Darwinbox, SAP. |
| 2026-11-25 | "Yea we target SME." |
| 2026-11-25 | "Yes you will build." The v2 design is approved as the basis. |
| 2026-11-25 | On the lawyer, bank contact and pilot customers: "I built a whole ERP earlier and I am selling it to a company now and didn't do any of the stuff you mentioned in point 2 or 3." They are not required before building. |
| 2026-11-25 | Before building: "I need the advisor to prove to me the list of features he will build, why they will make us superior technically, and how we will dominate the market." |
| 2026-11-25 | "We are doing HR and payroll. Not a full ERP." (also recorded in section 2) |
| 2026-11-25 | "What about Keka": Keka is added to the competitor set. |
| 2026-11-25 | "We won't exclude these except insurance": expense management, accounts payable and spend, corporate cards, project billing, task manager, intranet and chat are **in scope**; insurance stays out. Supersedes the HR-and-payroll-only fence. |
| 2026-11-25 | On the six uniqueness candidates: "You can add all those, but definitely not enough." The six are accepted into the plan; the owner wants more ideas. |
| 2026-11-25 | "Think of stuff related to KPIs, hiring, training, company guidelines, approvals flow, audit readiness, etc." More uniqueness ideas wanted in these areas and beyond. |
| 2026-11-25 | Asked for the combined list of all competitors' features (`docs/superpowers/specs/2026-11-25-combined-feature-list.md`). |

## 2. Standing instructions (the owner's words)

| Date | Instruction |
|---|---|
| 2026-11-25 | "The advisor needs to lead the research and propose the plan." Nothing is built until the owner approves. |
| 2026-11-25 | "Always use agents in parallel in need." |
| 2026-11-25 | "Always check with the advisor before taking a decision." |
| 2026-11-25 | "I rely on you in the technical matters." |
| 2026-11-25 | "Use all relative skills needed." |
| 2026-11-25 | "The code built in an organized way, no long lines, it should be always easy to debug, and always the repo should be updated with a ready handover." (`docs/engineering-standards.md`, `HANDOVER.md`) |
| 2026-11-25 | "All my decisions and instructions and future plan goes to the ledger." |
| 2026-11-25 | Use Firecrawl by default for external data and research tasks when suitable. (Not saved to memory: no memory tool in this session.) |
| 2026-11-25 | "We are doing HR and payroll. Not a full ERP." Scope fence recorded in the advisor's proof. |

## 3. Claude's calls (the owner can overrule)

| Date | Call | Reason |
|---|---|---|
| 2026-11-25 | Lawyer, bank and pilots become an optional verification track, not gates. | Follows the owner's decision above. |
| 2026-11-25 | Every statutory value in code carries a source URL and a status (`sourced` or `unsourced`); unsourced values have no default. | With no lawyer, checkable sources replace sign-off. |
| 2026-11-25 | Real customer payroll and any "verified compliant" claim wait until the rules are sourced. The owner decides when. | Wrong pay harms real employees. |
| 2026-11-25 | Files-only v1 (no salary payments), mainland UAE first, TypeScript and PostgreSQL. | See design doc sections 4 and 6. |
| 2026-11-25 | Develop on branch `claude/quirky-wozniak-b7xkvr`; no pull request unless asked. | Session branch rule. |
| 2026-11-25 | Advisor's uniqueness candidates: the six are now accepted by the owner (see section 1); they remain bets until each is demoed. | Owner asked what could make us unique. |
| 2026-11-25 | Superseded: the HR-and-payroll-only fence and the F17 expense cut are reversed. New order: core first, HR-adjacent next, finance modules last. | Cards and payments need licensed partners, so they come last and depend on partnerships. |
| 2026-11-25 | Correction: Zoho People includes leave management from its second plan and attendance from its third, at low per-user prices. The earlier "Zoho gates leave and attendance" differentiator is withdrawn. | Read from Zoho's own pricing page. |

## 4. Future plan (current)

Each item gets its own plan under `docs/superpowers/plans/`.

1. Plan 1: payroll engine (money type, pay-run calculation with trace,
   proration, gratuity rule-pack, case library and runner).
2. Plan 2: WPS (SIF) generator and validator, once the layout is sourced
   from two or more documents that agree.
3. Plan 3: data model, API, tenancy and security baseline.
4. Plan 4: web app (Arabic and English).
5. Later: M2 and M3 items; then adjacent modules (expenses, tasks,
   intranet and chat), then finance modules (accounts payable, spend,
   cards, project billing) which need licensed partners.
6. A master feature list (parity, adjacent modules, unique items) is the
   gate to Plan 1; the owner is shaping it with more ideas.

## 5. Open items

- Owner has not yet reviewed the advisor's proof
  (`docs/superpowers/specs/2026-11-25-advisor-proof.md`); no code until then.
- Primary text of Ministerial Resolution 340 of 2026 not read (MOHRE page
  failed through the proxy).
- Unsourced statutory values: overtime premiums, leave pay beyond sick
  leave, GPSSA rates, deduction caps, proration divisor.
- SIF layout not verified against a bank document.
- Bayzat and ZenHR pricing: quote-only or not published.
