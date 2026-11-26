# QA persona: skeptical bank HR Manager (30-person bank, unhappy with Keka)

Tested 26 Nov 2026 on a private build of branch integ (served on port 5401,
now stopped). Desktop 1440x900 and iPhone 15 (393x852). Role: HR manager
(Fatima Al Ketbi), plus the GM, team manager, employee and IT views for the
click script. No repository file was changed.

SP = /tmp/claude-0/-home-user-HR-Payroll/55600167-2f81-585b-8597-bc047d967ec5/
     scratchpad/persona-hr   (screenshots are SP/<name>.png)

Verdict in one line: the click script runs end to end with no console
errors, every figure on the script matches the screen, and Cmd K, "Why this
number" and the IBAN check are genuinely better than what Keka gives me.
The doubts come from dead ends in the settlement, from numbers that are
labelled differently on different pages, and from privacy gaps.

## Click script result (all 8 steps)

| Step | Result |
|---|---|
| 1 Home, Why this number | Works. Figures match the script. |
| 2 Two IBANs | Works. Wrong-length IBAN refused in plain words. |
| 3 GM sign-off | Works. HR button is disabled and explains why. |
| 4 Salary file | Works. .SIF downloads, 63 lines, 31+31+1 as scripted. |
| 5 Gratuity | Works. 173,928.08, every rule has its source. |
| 6 Leave | Works, except the overlap claim (bug 1). |
| 7 IT view | Works. Chain breaks and restores as scripted. |
| 8 Panels, Cmd K | Works. Panel is bigger than "short" (bug 9). |

## Ranked bug and confusion list

Severity: H = would make me doubt the product in the room, M = a real
problem I would raise, L = polish.

### H1. Settlement has no way to add notice pay, deductions or other dues
- Route: #/pay-run/settlements/emp-014 (James Whitfield)
- Steps: Pay, Final settlements, James Whitfield.
- Expected: "To add by hand before paying" means I can add them here.
- Saw: three rows say "Not worked out", but there is no field or button.
  The only actions are Print and "Send for a decision". The list page and
  the Owner brief show 191,702.27 as "Worked out" / "Final settlement" as if
  it were final. A settlement paid on this total would be short.
- Screenshot: SP/30-settle.png

### M2. Manager does not see who else asked for the same days
- Route: #/home as Team manager (Arjun Menon)
- Steps: Employee requests 16-17 Nov, then switch to Team manager.
- Expected (script step 6): the manager sees the overlap with Rafiq
  Hossain (16-20 Nov).
- Saw: two Approve buttons side by side, no overlap note. "Your team's
  leave" says "No other leave in your team from today."
- Screenshot: SP/63-mgr.png

### M3. "Hide amounts" leaks amounts on several pages
- Routes: #/home (Priya's "AED 25,300.00" in the bank-details item and
  the "held out" line), #/home/tasks, #/time-off/more/liability (35
  amounts), #/reports/audit (23 amounts), #/setup/access/rules.
- Steps: press the eye icon, open each page.
- Expected: every amount shows as dots. Saw: the figures above stay visible.
- Screenshot: SP/110-hidden.png

### M4. Same thing counted three ways: 31, 30, and "8 stop pay"
- Routes: #/home, #/reports/dashboard-hr, #/people/team/overview,
  #/people/papers/emiratisation
- Saw: Home "31 On the payroll", People "All 31", but HR dashboard "People
  on the payroll 30", Leave balances 30, Emiratisation "14 of 30". The
  footnote that explains it (James left 15 Oct) only exists on some pages.
  HR dashboard says "Open items that stop pay: 8" while Home says "2 block
  approval, 6 to review" and the pay run says "2 stop pay".
- Expected: one label per number, with the reason beside it.
- Screenshot: SP/crawl/_reports_dashboard-hr.png

### M5. Salary certificate cannot be printed or downloaded, reference masked
- Route: #/people/papers/letters, open "Salary certificate" (Hessa)
- Saw: on-screen text only. No Print, no PDF, no letterhead, no basic and
  allowances split. Reference reads "ZB-LTR-2026-****". Addressee is
  "Demo Properties (fictional)". A bank HR issues these daily.
- Screenshot: SP/101b.png

### M6. Emirates IDs are never visible, and expiry register looks empty
- Routes: #/people/emp-023 (profile), #/reports/documents (and its CSV)
- Saw: profile shows "784-****-*******-*", the CSV says "Emirates ID
  (masked)". Cmd K cannot find "784". The expiry report lists 4 documents
  for 31 people; Priya's profile says "No documents with an expiry date on
  file" while the task list says Kavya's visa application is overdue.
- Expected: HR can see the number (audited), and the register covers
  everyone, or says why not.
- Screenshot: SP/53-docs.png, SP/50-profile.png

### M7. Mobile horizontal scroll on pay pages
- Routes at 393 px: #/pay-run/review, /approve, /pay (402 px),
  #/reports/gratuity-provision (406), #/setup/rules/packs (440),
  #/time-off/more/cover (684), #/setup/rules/calendar (982).
- Saw: the whole page slides sideways. Pay calendar is the worst.
- Screenshot: SP/m15-pay.png

### M8. Menu is not short, and some names are jargon
- Route: top bar People / Time / Pay / Setup panels
- Saw: People panel lists about 45 links. Names I could not guess:
  "Splits and resets", "Against shifts", "Leave-safe roster", "Pre-pay
  checks", "Joiners earlier pay", "Payroll exemptions", "Approval cover".
  Setup has both "Holidays" and "Public holidays" (different pages).
- Screenshot: SP/20-menu-People.png

### L9. Stale toasts follow you across roles and pages
- Steps: Employee sends leave, switch to Team manager: manager's Home
  shows "Sent to Arjun Menon". After a resignation the toast "Resignation
  sent to Khalid Al Nuaimi" stays on four later pages.
- Screenshot: SP/63-mgr.png

### L10. Big net-pay figure briefly shows a different number
- Route: #/home, about half a second after navigating
- Saw: after the resignation test the dotted figure read 910,387.66 while
  the label said 933,730.94, then settled. It is a count-up animation, but
  a skeptical reader screenshots it. Show the final number at once.

### L11. Grammar: "1 blocks approval"
- Route: #/home after fixing one of the two IBANs. The header reads
  "1 blocks approval"; it should read "1 item blocks approval".

### L12. Every employee has exactly 22.5 days of annual leave left
- Route: #/time-off/balances. 28 of 30 people, from 3 to 12 years of
  service, all show 22½. It reads as fake data.

### L13. Dead ends and quiet failures
- Unknown route (#/nonsense) and plain /people silently show Home, URL
  unchanged. No 404.
- Switching role while on a page the new role cannot see shows "This page
  is outside your view" (has a Back to Home button).
- Reload mid-flow returns to Home and drops the hash (documented, but HR
  loses their place). Screenshot: SP/120-404.png
- Staff request page (#/people/papers/requests/rq-3) shows no message
  from the employee and Decline asks for no reason.

### L14. Smaller things
- Date pickers use US order (11/16/2026) in a UAE product.
- Pay-run page stepper (Review, Fix, Approve, Pay) differs from Home
  stepper (Inputs close, Bank details, Approve, Salary file, Payday).
- Mobile search overlay is clipped under the black demo banner
  (SP/m12-search2.png).
- Resignation: only advice is "At least 30 days of notice is usual"; no
  notice-period calculation. Pending resignation does not appear in
  "People leaving".
- Cmd K finds no match for "Arabic"; the product has no language switch
  (known and stated in the script). Cmd K matched an Arabic word for
  "report" to the Reports list, so the engine is loose.

## The 25 monthly HR tasks

| # | Task | Worked | Obvious | Notes |
|---|---|---|---|---|
| 1 | Add a joiner | Yes | Yes | Good validation. No IBAN or EID asked. |
| 2 | Record a resignation | Yes | Yes | Past date refused. See L14. |
| 3 | Final settlement | Partly | Yes | H1: no notice pay or deductions. |
| 4 | Approve leave (as manager) | Yes | Yes | M2 overlap missing. |
| 5 | Fix a bad IBAN | Yes | Yes | Empty, short, letters refused. |
| 6 | Check overtime | Yes | Yes | Totals agree (1,230.47 year, 816.41 Oct). |
| 7 | Salary certificate | Partly | Yes | M5. |
| 8 | Run October payroll | Yes | Yes | Clear 4 steps. HR cannot approve. |
| 9 | Who is on probation | Yes | Yes | One person, decide-by date shown. |
| 10 | Expiring EIDs, visas | Partly | Yes | M6. Home and report agree. |
| 11 | Answer a staff request | Partly | Yes | Request page is thin (L13). |
| 12 | Loan balance | Yes | Yes | 19,050 + 3,000 = 22,050 agrees. |
| 13 | Export a report | Yes | Yes | CSV matches the screen. |
| 14 | Search for a person | Yes | Yes | Not by Emirates ID. |
| 15 | Switch to Arabic | No | n/a | Not offered (stated). |
| 16 | Hide amounts | Partly | Yes | M3. |
| 17 | Dark theme | Yes | Yes | Clean. |
| 18 | Gratuity provision | Yes | Yes | 14 + 2 + 14 = 30. |
| 19 | Headcount by nationality | Yes | Yes | 14 UAE of 30, adds up. |
| 20 | Variance vs September | Yes | Yes | Gross and deductions add up. |
| 21 | Cost by department | Yes | Yes | Nine departments add to 938,680.94. |
| 22 | Download SIF | Yes | Yes | File name pattern and line counts match. |
| 23 | Audit trail check | Yes | Yes | Tamper and restore work. |
| 24 | Back button | Yes | Yes | Back returns to the list, forward works. |
| 25 | Reload mid-flow | Reset | n/a | Documented; hash dropped. |

Breaking attempts: empty IBAN, 22-char IBAN and "abc" were refused in
plain words; empty and out-of-range add-employee fields give specific
messages; a past resignation date is refused; the HR approve button is
disabled with a reason. No page errors or console errors in any run.

## Ten wow moments that worked

1. Home opens with one sentence and one button: "2 bank details hold
   October pay / Enter bank details". I knew my next step in 2 seconds.
2. "Why this number" adds up the net pay line by line and states what is
   left out (pension) on the same panel.
3. Cmd K "Priya" offers "Enter bank details for Priya Nair" as the first
   result: search that does the job, not only finds a page.
4. The IBAN box fixes itself from the bank letter, refuses a bad one in
   plain words, shows "Undo", and re-checks the salary file at once.
5. After both IBANs the sentence flips to "October pay is ready for
   approval" and the stepper moves on without a page reload.
6. Maker and checker is visible: HR's Approve button is disabled with
   "Only Khalid Al Nuaimi can approve" and a "View as General Manager" link.
7. The gratuity side panel shows each step (7 y 220 d, 105 days, 78.08
   days, 173,928.08) and labels every rule Official, Secondary or Our
   working rule. No Keka screen did that for me.
8. The salary file page checks layout and every account, then a real
   .SIF downloads with matching line counts.
9. Loan cap on Home explains why 4,950 was taken, not 6,000, and moves
   1,050 to next month.
10. Audit trail: edit one entry, the chain breaks at entry 11, restore
    fixes it. An auditor can understand that in 10 seconds.
