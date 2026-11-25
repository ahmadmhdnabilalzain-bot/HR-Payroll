# Combined Competitor Feature List (HR and payroll only)

The union of what the competitors list, for the owner. Compiled 25 Nov 2026.

**Who lists it**: Bz Bayzat, Zo Zoho (Payroll and People), Zn ZenHR,
Nr NeuralHR.AI, Ke Keka. These five were read directly on their own pages
(vendor claims). Yomly, HONO, GulfHR, StackHX, Darwinbox and SAP are from
researcher reports on search snippets; they add little beyond this list.

**Plan status**
- **In plan**: already in the advisor's proof (`F1` to `F36`).
- **New**: not yet in the plan; proposed with a milestone. Needs the
  owner's OK, because it grows scope.
- **Out**: outside the HR-and-payroll fence; integrate or export only.

M1 = pilot-ready, M2 = launch parity, M3 = expand.

## A. Core HR and records

| Feature | Lists it | Status |
|---|---|---|
| Employee database, contracts, salary breakdown | all | In plan (F1) |
| Org chart and hierarchy | Bz, Zn | New, M2 |
| Document management with expiry alerts (Emirates ID, visa, passport, contract) | Bz, Zo, Zn, Nr | In plan (F12) |
| Employee self-service portal and mobile access | all | In plan (F16; native app F30) |
| Onboarding and offboarding workflows | Bz, Zo, Ke | New, M2 |
| Resignation and termination management, exit interviews | Zo | New, M3 |
| HR letters, salary certificates, NOCs with e-signing | Bz, Zo, Zn | In plan (F18) |
| Approval workflows and custom fields | Bz, Zo | In plan (F9); custom fields New, M2 |
| Roles, permissions, audit trail | Zo, Bz | In plan (F10, F11) |
| SSO (Google, Microsoft, Okta) and MFA | Bz, Zo | In plan (F22) |
| Multi-entity and cost centres | Zo, Bz, Ke | In plan (F31) |
| Company announcements and broadcast messages | Zo | New, M3 |
| HR help desk and request ticketing | Bz, Zo | New, M3 (HR requests only) |
| Employee engagement and pulse surveys | Zo | New, M3 |

## B. Leave, attendance and time

| Feature | Lists it | Status |
|---|---|---|
| Leave policies, accrual, custom leave types | Bz, Zo, Zn, Ke | In plan (F13) |
| Holiday calendar; compensatory off; special leave grants | Zo | New, M2 |
| Leave encashment calculation | Zo | New, M2 |
| Team calendar to avoid overlapping leave | Bz | New, M2 |
| Attendance by web, mobile, GPS, geofence | Bz, Zo, Zn, Ke | In plan (F14) |
| Biometric device integration (ZKTeco and similar) | Bz, Zo, Zn, Ke | In plan (F14) |
| Facial recognition and liveness check-in; kiosk | Bz, Zo | New, M3 |
| QR check-in | Zn | New, M2 |
| IP restriction; attendance regularization; hourly permissions | Zo | New, M2 |
| Overtime calculation and approval | Bz, Zo, Zn, Ke | In plan (F14); rules need sources |
| Shift scheduling, rosters, split shifts, rotation | Bz, Zo, Zn, Ke | In plan (F15) |
| Timesheets for payroll input | Zo, Ke | New, M3 |
| Ramadan hours and UAE public holidays | Nr | New, M2; rules need sources |

## C. Payroll

| Feature | Lists it | Status |
|---|---|---|
| Automated payroll calculation | all | In plan (F2) |
| Salary components, formulas, templates; custom pay cycles | Zo, Bz | In plan (F3); formulas New, M2 |
| Salary revisions, arrears, joiner arrears, unpaid-leave deduction and reversal | Zo | In plan (F3) |
| Prior-employment and previous-payroll data | Zo | New, M2 |
| Bonus, off-cycle and variable pay runs | Zo, Bz | New, M2 |
| Salary hold for selected employees | Zo | New, M2 |
| Pay-run approvals and reversal | Zo | In plan (F9, F3) |
| Loans and salary advances | Zo, Bz | In plan (F17) |
| Leave salary, air tickets, encashments as pay items | Bz, Ke | In plan (F35, F36) |
| Annual leave advance payout; sick leave payout rules | Ke | In plan (F36) |
| Air ticket entitlement tracking | Ke | In plan (F35) |
| Payslips (PDF, password protected), history | all | In plan (F8) |
| Payroll groups by entity, project, pay type, nationality | Ke | New, M2 |
| 100+ payroll and report templates | Bz | New, M3 |
| Multi-currency payroll | Bz, Zn | In plan (F32) |
| Payroll analytics, plan versus actual, forecast | Ke, Bz | New, M3 |
| AI anomaly checks before a run | Ke, Nr, Bz | In plan (F29, M3) |
| Parallel payroll runs during onboarding | Ke | In plan (F7) |

## D. UAE compliance

| Feature | Lists it | Status |
|---|---|---|
| WPS (SIF) file generation and validation | all | In plan (F6) |
| Bank advice file | Zo | In plan (F6) |
| Direct WPS submission through bank connections | Bz, Zn | Out for now (owner decision O1, needs a licensed partner) |
| Gratuity and end-of-service, liability report | all | In plan (F4, F19) |
| Final settlement | Bz, Zo | In plan (F4) |
| GPSSA pension and other GCC schemes (ADPF, GOSI, SPF, SIO, PIFSS, GRSIA) | Zo, Ke | GPSSA in plan (F5); other schemes M3 |
| DIFC DEWS summary | Zo | In plan (F33) |
| Emiratisation and Nafis tracking | Nr, Bz | In plan (F23) |
| Visa and Emirates ID lifecycle tracking | Nr, Bz | Expiry alerts in plan (F12); full lifecycle New, M3 |
| WPS and GOSI compliance reports | Zn | In plan (F19) |
| Automatic labour-law updates | Bz, Ke | In plan (rule-packs, section 6 of design) |
| Saudi payroll (Mudad, GOSI, Qiwa) | Nr, Bz, Zn | In plan (F34), M3 |
| ILOE tracking, compliance calendar | none read | In plan (F24, F25): our additions |
| UAE data hosting | Ke, Nr | In plan (design section 6) |

## E. Reporting and integrations

| Feature | Lists it | Status |
|---|---|---|
| Standard reports and custom report builder | Zo, Zn | In plan (F19); builder New, M3 |
| Payroll journal and accounting sync | Zo, Bz, Ke, Zn | In plan (F20) |
| Accounting tools: Zoho Books, QuickBooks, Xero, NetSuite, Odoo, SAP B1, Dynamics | Zo, Bz, Ke, Zn | F20 starts with three; rest New, M3 |
| ERP integration (SAP, Oracle, Dynamics) | Bz, Ke | New, M3 |
| API and webhooks | Zo (top plan only) | In plan (F21) |
| Slack, Teams, Zoom connectors | Zn, Nr | New, M3 |

## F. Talent (HR scope, later)

| Feature | Lists it | Status |
|---|---|---|
| Recruiting and ATS, offer letters, interview scheduling | Zn, Bz, Nr, Ke | In plan (F27) |
| Performance: goals, OKRs, 360 feedback, appraisals | Zo, Bz, Zn, Ke | In plan (F28) |
| Compensation planning and salary packages | Zo | New, M3 |
| Learning management | Zo, Db, SAP | New, M3 |
| Workforce planning and HR analytics | Zo, Ke | New, M3 |

## G. AI and service

| Feature | Lists it | Status |
|---|---|---|
| Policy Q&A knowledge hub | Bz, Nr, Zo | In plan (F29) |
| Ask-anything assistant over people data | Ke, Nr, HONO | In plan (F29) |
| AI reports and insights | Bz, Ke | In plan (F29) |
| AI resume screening | Nr, Zn, Bz | In plan (F27) |
| Named customer success managers, premium SLAs, in-person support | Ke | New: service model, set after the cost model |
| Migration and implementation team | Bz, Ke | New: service model, same |

## H. Adjacent modules (in scope by owner decision, built after the core)

Expense management (Bz, Ke, Zo, Yomly): M3. Task manager (Bz): M3.
Intranet, chat and announcements (Zo People Plus): M3. Project operations
and billing (Ke): M4. Accounts payable and spend, corporate cards, global
payouts (Bz): M4, and **they need licensed partners** (card issuing,
payments), so they depend on partnerships, not only code.

**Still out:** insurance (brokerage and benefits administration), and
India payroll.

## Count

About 95 distinct features across sections A to G. Of these, roughly 36
were already in the plan (F1 to F36), and the rest are the "New" rows above,
mostly placed in M2 and M3. Section H is built after the core, except insurance and India payroll, which stay out.
