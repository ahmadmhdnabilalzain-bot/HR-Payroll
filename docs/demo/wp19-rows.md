# WP19 rows: Pay, Reports and Setup sweep

Source: navigation map section 8 (Pay, Reports, Setup groups), checked
against the registry on branch `integ` (apps/web/src/nav/areas/*.ts) and
the earlier QA list (scratchpad/qa/coverage.md, from before wave 2).

## Taken out

- Status N (not built): R40 R41 R42 R43 R44 R45 R46 R47, X12 X13 X33 X34
  X35 X36 X37, S09 S25 S26 S35 S36 S41 S42 S43.
- Owned by WP16: X06 X08 X30 X32 S38 S08 R14 R09 R12 R15.
- Already live in the registry on `integ`: R01 to R08, R10 (inside the
  pay run review), R11 (pay.runs), R13 (pay.offcycle), R20 to R24, R30 to
  R33 (pay.gratuity-provision is R33), X01 to X05, X07, X10, X20 to X23,
  X31, S01 to S06, S10 to S24, S30, S31, S37, S39, S40. (X24, the IT dashboard, was only inside IT Home with no registry area,
  and S07 Trades has no area and no data, so both are mine below.)

## My rows (12), most valuable first

| Order | ID | Feature | Group | Template | Value to |
|---|---|---|---|---|---|
| 1 | X24 | IT dashboard (access, jobs) | Reports | RP | IT manager |
| 2 | R34 | One exit flow, legal flags | Pay, Owed | RT with steps | HR manager |
| 3 | X25 | Owner brief (weekly pack) | Reports | RP | General manager |
| 4 | X11 | Loans report | Reports | RP | HR, Finance |
| 5 | X26 | Board pack | Reports | RP | General manager |
| 6 | S32 | WhatsApp approvals | Setup, Connections | ST | IT manager |
| 7 | S34 | Calendar feeds | Setup, Connections | ST | IT manager |
| 8 | S33 | Email-in to records | Setup, Connections | ST | IT manager |
| 9 | R25 | Prior-employment pay data | Pay, Changes | LF | HR manager |
| 10 | P66 | Sales commission statements | Pay, Changes | RP | HR, GM |
| 11 | X09 | Recharges between companies | Reports | RP | Finance |
| 12 | S07 | Trades | Setup, People rules | ST | HR manager |

Notes: P66 and X09 need data the demo does not hold (sales figures; a
second company). They are built only if they can be derived without
inventing figures; see the final report for the outcome.
