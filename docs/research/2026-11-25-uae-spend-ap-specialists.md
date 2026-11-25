# UAE spend, card and AP specialists (snippet-level, unverified)

| Firm | Offers | Licence model | Payroll link |
|---|---|---|---|
| Qashio | Cards, bill pay, reimbursements, AP automation | NymCard named as issuer | Approved reimbursements can join next payroll |
| Alaan | Prepaid cards, spend controls, business account (Ruya) | NymCard issuer; CBUAE in-principle SVF and RPS approval Sep 2026 | Not found |
| Pemo | Cards, spend management, Shariah account (Ruya) | NymCard BaaS; in-principle SVF approval Jul 2026 | Not found |
| Wafeq | Accounting, bills, VAT, e-invoicing (accredited provider) | Not a card issuer | Not found |
| Payhawk | No UAE launch found | n/a | n/a |

Accounting connectors seen: Zoho Books, QuickBooks, Xero, Wafeq.

## Regulation notes

- CBUAE retail payment services regulation (C 15/2021): issuing payment
  instruments needs a licence. Stored value facilities are separate.
- E-invoicing: Peppol PINT AE, five-corner model through an accredited
  provider. Go-live dates conflict across sources; unverified.

## Decision for the build (Claude's call)

- Integrate, do not become, a card issuer or fund holder. Partner with a
  licensed issuer later; do not seek SVF or RPS licences early.
- Integrate e-invoicing through an accredited provider; build the
  buyer-side receive and match workflow only.
- Build the part rivals lack: reimbursements flowing into payroll,
  claim approvals tied to HR records, role-based limits, Arabic UI.
- These items are Plan 5 and later, not Plan 2.
