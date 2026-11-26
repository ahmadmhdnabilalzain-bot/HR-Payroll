# Pending features (state at 2026-11-26, for the owner's scope decision)

Status words: LIVE IN DEMO = clickable in the hosted demo; BACKEND
ONLY = built and tested in the real system but no screen in the demo;
PARTIAL = built in part; NOT BUILT. Hour figures are rough estimates
for a browser-only demo scene, not promises.

## In the demo tonight (if approved)
Home (decisions), Pay run (4 steps, IBAN fix, maker/checker), Explain
why (gratuity, overtime, loan cap), People (list, profile, payslip), Time
off (request to manager inbox), Reports (CSV).

## Built in the real system, no screen in the demo (BACKEND ONLY)
| Feature | Demo scene possible | Estimate |
|---|---|---|
| Documents and letters (salary certificate, NOC, expiry alerts) | yes, printable letter in the browser | 3-4 h |
| Expenses with receipts and approval | yes, fake receipt upload | 3 h |
| Hiring pipeline, offers, onboarding and exit checklists | yes, board plus checklist | 3-4 h |
| Attendance, clock-in, overtime, rosters | yes, phone clock-in view | 3 h |
| Goals, KPIs, appraisals, training, surveys (Plan 10, not merged) | yes, goals and appraisal view | 3-4 h |
| Owner view, pre-pay gate, what-if replay (Plan 11, not merged) | yes: "what if I change this salary" with the real engine | 3 h |
| VAT, corporate tax, e-invoicing (Plan 12, not merged) | later, not relevant to this client | n/a |
| WhatsApp approvals, email-in, SSO, webhooks, API keys, calendar feeds | partly (approval by WhatsApp as a mock) | 2 h |
| Hash-chained audit trail | yes, a readable log view | 2 h |

## Partial
Meetings (behind a launch gate, telecom position unconfirmed), data
import and parallel run, intranet and team chat (Plan 17 tasks 1-6).

## Not built
- AI assistant and cited policy Q&A (Plan 17 tasks 7-11).
- Social and website insights (Plan 15). Finance modules: accounts
  payable, cards, project billing (Plan 16).
- Arabic screens reviewed by a native speaker (Arabic is hidden).
- Native mobile apps (the demo is a mobile-friendly website).
- Production hosting in the UAE, a penetration test, SOC 2 / ISO 27001,
  single sign-on screens, Keka data migration tooling.

## Honest limits of the live demo
Runs in the browser on fictional data; changes reset on reload; no
server; WebKit (Safari) not available for testing here, so the owner
checks once on a real iPhone.
