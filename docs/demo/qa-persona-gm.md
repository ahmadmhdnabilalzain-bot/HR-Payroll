# QA persona test: General Manager, team manager, employee

Date: 26 Nov 2026. Build: branch `integ`, private clone in /tmp/persona-gm,
`vite preview` on port 5402 (stopped at the end). Playwright chromium at
1440x900 and iPhone 15 (393x852). No repository file was edited.

Screenshot folder (S):
/tmp/claude-0/-home-user-HR-Payroll/55600167-2f81-585b-8597-bc047d967ec5/scratchpad/persona-gm/s
Every "Shot" below is a file in S.

The app has no URLs (state only), so "route" means the click path.

## Verdict in one paragraph

The core story works: the GM cannot approve until HR fixes the two bank
details, then can, and the salary file opens. The big gaps are around
"what needs my decision today": the GM Home counts decisions he cannot
take, hides one he must take (Arjun's crew overtime), and the expense page
has no Approve button. Three reports disagree with Home, and "Why this
number" exists on only a few figures, none on the owner brief, board pack
or executive dashboard.

## Ranked bug and confusion list

### 1. HIGH. Owner brief says AED 25,300 is still held out after the fix
- Route: HR: Enter IBAN x2 > switch to GM > Reports > Owner brief.
- Expected: Held out AED 0.00, as Home, Executive dashboard, pay run and
  salary file all say.
- Saw: row "Pay: Held out of the salary file" AED 25,300.00, text "Enter
  the bank account to release it", while the same page says "Signed off".
  Executive dashboard says AED 0.00 for the same measure.
- A GM reading this to the board is told money is stuck that is not.
- Shot: S/11-brief.png

### 2. HIGH. Board pack and Owner brief disagree on open problems
- Route: after the bank fix, Reports > Board pack vs Owner brief vs Home.
- Expected: one number. Home says "6 to review" and the brief says 6.
- Saw: Board pack "Problems before sign-off" = 8 (the count from before
  the two bank fixes). Before the fix all three say 8, so the board pack
  is the stale one.
- Shot: S/12-board.png, S/11-brief.png

### 3. HIGH. GM's decision list is wrong both ways
- Route: GM Home; Reports > Executive dashboard; Time > Crew overtime.
- Expected: "Approvals waiting" lists only what Khalid can decide.
- Saw: Home shows 4 (pay run, expense, and two leave requests "Waiting for
  Arjun Menon" and "Waiting for Hamdan Al Dhaheri" that he cannot decide).
  The executive dashboard says "Waiting for your decision 3, open Home to
  decide" but two of the three are those leave rows. Meanwhile Arjun's
  crew overtime (3 Nov, 3 people, AED 273.44, "Waiting for Khalid Al
  Nuaimi") is not on Home, not in Cmd K, and its page has no buttons.
  The GM cannot answer "what needs my decision today" from the screen.
- Cmd K "decide" also offers "Decide: Leave request, Rafiq Hossain" to
  the GM, who cannot decide it.
- Shot: S/09-gm-home-ready.png, S/91-gm-crew-ot.png

### 4. HIGH. "Why this number" is missing on most figures a GM reads
- Route: GM > Reports > Executive dashboard / Board pack / Owner brief /
  Payroll summary / Cost by department / Payroll trend / Employer cost /
  Overtime cost / Payroll journal / HR dashboard.
- Expected: tap a figure, see how it was worked out (the demo promise).
- Saw: no tappable figure on any of those ten pages. Only these work:
  Home net pay, Variance "change in gross", Pay run page (net pay and
  each person line), Gratuity liability, Gratuity provision (total and
  per person), payslips. Of the figures I tried, 10 explained themselves
  well (Home net pay, Variance change, Pay run net pay, Maria Santos,
  Ayesha Siddiqui, Kavya Iyer, Omar Farouk, liability total, provision
  total, Sara Haddad). The report pages the GM would actually quote
  (brief, board pack, dashboard) give no way to ask why.
- Shot: S/15-exec.png, S/12-board.png, S/why-02.png .. S/whyB-10.png

### 5. MEDIUM. Expense claims page has no Approve button for the approver
- Route: GM > Pay > Expense claims.
- Expected: Approve / Decline on "Rashid Al Falasi AED 1,180.00 Waiting".
- Saw: read-only table; subtitle says "The person's manager decides",
  yet the claim over AED 1,000 is assigned to the GM. Status just says
  "Waiting" (not who). Decisions only work from the Home card. The other
  row says "Agreed before the demo", which is odd wording for a real
  product.
- Shot: S/18-gm-expense.png

### 6. MEDIUM. A leftover HR toast follows the GM across screens
- Route: HR fixes Juma's IBAN > switch to GM > any page.
- Saw: "Juma Al Zaabi: IBAN saved ... Undo" stays on the GM's screen on
  every report. The GM could press Undo on an HR action, and it covers
  the bottom of the page.
- Shot: S/09-gm-home-ready.png (toast over the Approvals list)

### 7. MEDIUM. Pay run stepper contradicts itself
- Route: GM approves, then Pay > Pay run.
- Expected: one current step.
- Saw: "Review: Now", "Fix: Done", "Approve: Done", "Pay: Now". Two
  "Now" steps and Review is current after Fix is done. On the Approval
  page, "Review: Done" sits beside "6 checks are not marked reviewed
  yet". The first-run hint bubble "Tap a figure with a dotted line"
  covers the "Why this number" label on that page.
- Shot: S/nav-Pay-run.png, S/93-gm-approval-blocked.png

### 8. MEDIUM. After sign-off, Home still lists "Before approval" items
- Route: GM approves October pay > Home.
- Saw: headline "October salary file is next" but the "Before approval:
  6 to review" block (overtime, loan cap, visa) is still shown, and the
  GM's "Approve" on it is gone. The variance table and Owner brief still
  call it "Problems to fix before sign-off". Confusing once signed.
- Shot: S/10-gm-approved.png

### 9. MEDIUM. Team manager Home hides the work he must do
- Route: Arjun Menon > Home.
- Saw: "One leave request waits for you" and nothing on overtime, though
  Time shows "Overtime 2 waiting" (Rafiq, 26 and 27 Oct, AED 64.45 and
  AED 42.97). Menu "Requests > Waiting for you" opens the leave page
  only. Probation is only reachable as a note at the bottom of Me > Team
  reviews ("No one in your team is on probation"); nothing in the bar
  says "probation".
- Shot: S/30-am-home.png, S/40-am-Overtime.png

### 10. MEDIUM. Manager sees a pay figure per overtime claim
- Route: Arjun > Time > Overtime, column "Adds to pay".
- Saw: AED 64.45 for 1 h 30 and AED 42.97 for 1 h. From these a manager
  can work back to Rafiq's basic pay. Everything else is hidden well
  (see "worked" list), so this is a policy call for the bank, not a bug,
  but it contradicts "a manager sees no one's pay".
- Shot: S/40-am-Overtime.png

### 11. LOW. Net pay figure shows a half-counted number when you return
- Route: GM > any page > Home (or switch role) and read quickly.
- Saw: the big figure counts up each time; screen readers and a quick
  glance caught AED 927,194.82 / 928,128.55 / 929,062.28 instead of
  933,730.94. For an impatient GM this looks like a wrong number.
- Shot: S/90-m-gm-home.png

### 12. LOW. Time card button "Correct" is ambiguous
- Route: Jose (iPhone) > Time > My time card.
- Saw: every day ends with "Correct". It means "ask for a correction",
  but reads as "this day is correct". Also 20 Oct shows 07:58 to 19:28
  as "10 h 30 min" without saying a lunch hour is taken off.
- Shot: S/88-m-timecard.png

### 13. LOW. Smaller wording and layout points
- Empty expense send on iPhone: the error "What it is for is needed."
  sits under the Send button, far from the field (S/87-m-claim-empty-send.png).
- Expense form has no receipt attachment, only "Keep the receipt".
- Manager Home shows "No leave requests wait for you." twice after the
  decision.
- GM "Overtime to decide" page title lists claims waiting for Arjun.
- Variance: net pay falls AED 19,669.06 but gross only AED 14,719.06;
  the extra AED 4,950.00 (Ayesha's loan, half her pay) is on the page but
  not tied to the sentence. A GM will ask.
- Pay menu for the GM shows many HR-only items (Salary hold, Loans...).
- Date field on the claim form is US order (mm/dd/yyyy) in this browser.

## What I did not find wrong
- No console errors or page errors in any session.
- No horizontal scroll on iPhone for payslip, leave, expenses, time
  card, documents, help, calendar.
- Numbers that agree: department costs add to AED 938,680.94; people add
  to 31; variance causes add to -AED 14,719.06; Jan-Oct gross AED
  9,509,429.79 = Jan-Sep 8,570,748.85 + Oct 938,680.94; salary file 63
  lines; Maria and Kavya part-month pay check by hand.

## 10 moments that worked
1. GM Home while blocked: "Approve waits for bank details for Priya Nair
   and Juma Al Zaabi ... never paid in part", button disabled, and the
   Approval page also disables "Approve pay run". (S/03, S/93)
2. HR "Fill from bank letter" then "Save and check": message, sentence and
   steps update at once; the GM then sees "waits for your approval".
3. GM approval flips Home to "October salary file is next" and the salary
   file page opens with 31 people, AED 933,730.94, 63 lines. (S/16)
4. Variance page: six named causes that add exactly to the change, and
   the "Why this number" panel lists each one. (S/14)
5. Pay run "What changed since September": Maria Santos, Ayesha
   Siddiqui, Kavya Iyer, Omar Farouk each open to a line-by-line working
   in plain words. (S/whyB-02..05)
6. Gratuity provision: per-person panel (21 and 30 days, a day = basic
   / 30) with the total AED 1,793,441.10 matching the board pack.
7. Owner brief and board pack are one-page, each row says what it is and
   what to do next, with Download CSV and Print. (S/11, S/12)
8. Arjun: leave Approve from Home, then "Booked" in his team calendar;
   he sees his own payslip only and Cmd K finds no other payslip,
   IBAN, pay run or gratuity. (S/61)
9. Jose on iPhone: payslip, 2-day leave request (22.5 to 20.5 days,
   "Goes to Arjun Menon" before sending, "Sent to Arjun Menon" after).
   (S/74, S/75)
10. Jose's AED 1,500 claim says it goes to the General manager (limit AED
    1,000), arrives as "Waiting for Khalid Al Nuaimi", and Help cards
    link to the right pages. (S/89, S/80)
