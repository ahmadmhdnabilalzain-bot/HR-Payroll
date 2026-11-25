# WPS Resolution 340 of 2026 (summary, not verified)

Researcher read snippets only. The resolution text was **not** read.
No official PDF found. Everything here is `secondary` unless marked.

- Issued 12 May 2026, effective 1 June 2026. The researcher's brief said
  "Resolution 675 of 2022"; every source says 598 of 2022 was repealed.
  Treat 675 as wrong.
- u.ae (official page, snippet): resolution 0340/2026, pay by due date
  through WPS.

## Rules reported

1. **Due date:** salary for month M is due on the 1st of month M+1.
2. **Grace:** sources conflict (none, 10 days, 15 days). Rule for the
   product: no grace; show an alert from day 2. Domestic workers are a
   separate regime (10 working days, Decree-Law 9/2022).
3. **Coverage:** all MoHRE-registered private establishments; some
   free zones reported (JAFZA, DMCC), unclear. New hires in scope at
   once (30-day exemption removed). Exclusions need documentation and
   notice to MoHRE: wage court cases, absconding, unpaid approved leave.
4. **Penalty steps (inconsistent):** day 2 warnings, day 5 new work
   permits suspended. Later steps (days 11, 14, 16, 21) conflict. Do not
   hard-code them. A fine of AED 1,000 per worker, cap AED 20,000, is
   "commonly understood", not stated in the resolution.
5. **85% test:** a worker counts as paid when 85% of wages due is
   paid (raised from 80%). Best supported, not confirmed from text.
6. **Deductions:** the 85% test practically limits compliance
   deductions to 15% of monthly wage. A 50% general cap in
   Decree-Law 33/2021 is a different rule.
7. **Channels:** banks, exchange houses, licensed institutions, or a
   system MoHRE authorises. AED only. Delegating payroll to a third
   party needs MoHRE notice; the employer stays liable.
8. **SIF and data matching:** nothing found. A Dec 2025 MoHRE update
   mentions real-time integration with banks via the Central Bank.

## What this means for the build

- The due date and a "late from day 2" alert are safe to build as a
  configurable rule-pack parameter (status `secondary`).
- Do not hard-code penalty days or amounts.
- The SIF generator must not claim "WPS compliant"; it must say
  "layout matches two bank guides; unconfirmed by MOHRE".

## Secondary sources

Clyde & Co, Baker McKenzie, Morgan Lewis, Deloitte, EY, KPMG, DLA
Piper, Gulf News (2026, see the researcher output for exact links).
