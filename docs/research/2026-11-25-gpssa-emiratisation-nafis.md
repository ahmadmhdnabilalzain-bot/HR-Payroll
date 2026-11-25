# GPSSA, Emiratisation and Nafis (snippet-level, needs primary check)

Every row needs a primary-text check before it enters a rule-pack.

| Topic | What was reported | Status |
|---|---|---|
| GPSSA, joined on or after 31 Oct 2023 | Decree-Law 57/2023: total 26%, employee 11%, employer 15%; government pays 2.5% of employer share under AED 20,000 | secondary |
| GPSSA, joined before | Law 7/1999: total 20%, employee 5%, employer 12.5%, government 2.5% | secondary |
| Contribution salary | Fixed each January for the year; component list not found | official (January rule) |
| Min and max | Reported AED 3,000 and AED 70,000; GPSSA FAQ still shows 1,000 and 50,000 | conflict |
| Deadline and penalty | Register within 30 days; 0.1% per day late; deadline day not found | secondary |
| GCC nationals | Home-country rate, employer share capped at 15%, employee covers shortfall | official (mechanism, 2022) |
| Emiratisation, 50+ staff | Skilled roles up 2% a year to 10% by end 2026; checks 30 June, 31 Dec | official |
| Emiratisation, 20 to 49 staff | 14 sectors; one Emirati 2024, second 2025 | official |
| Counting rule | Emirati counts only with valid permit, WPS payment, pension registration | official |
| Emirati minimum wage | AED 6,000 from 1 Jan 2026; not counted after 1 Jul 2026 if unadjusted | official |
| Unfilled-post fine | AED 96,000 a year (2024), 108,000 (2025); 2026 unresolved (9,000 vs 10,000 a month) | official to 2025 |
| Nafis | Extended to 2040; new framework from Sep 2026; details secondary | mixed |

## What this means for the build

- Build GPSSA as rule-pack parameters with `secondary` status and a
  required "confirm against GPSSA" flag. Never default silently.
- Emiratisation target tracking can be built as a report of counts
  with the target as a parameter, not as legal advice.
- No source says how Emirati staff appear in the WPS file.
