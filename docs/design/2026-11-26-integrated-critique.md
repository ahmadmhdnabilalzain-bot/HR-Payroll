# Mubinflow, integrated build: a hard rescore against the Apple standard

Date: 2026-11-26. Reviewer: Artisan (visual design). No code was edited.
This rescores the build that followed
`2026-11-26-apple-standard-critique.md` (about 5.5). The excluded items
from `2026-11-26-design-upgrade-plan.md` stay excluded (no particle
flows, no custom cursor, no hold-to-approve, no gradients or glass on
content). Every motion value here is a candidate for the owner's
calibration gate (plan step 2), not a decision.

## Evidence, and its limits

Scratchpad paths are under `.../scratchpad/qa/`.

- All 25 PNGs in `shots/` (1920x1080, plus one 393pt iPhone 15 shot).
- `frames/contact-sheet.png` (the 8 frames as one sheet).
- `video/flow.mp4` (48.4 s, 25 fps). Frames were pulled at 0.1 s and
  0.04 s steps around these points: the opening (0-1.2 s), the People
  panel (4.4-5.5 s), the first IBAN save (8.2-9.4 s), the held-out roll
  (11.7-12.9 s), the scroll at 14.4 s, and the Explain drawer
  (22.6-23.6 s).
- 36 of the 466 walk shots (1440x900), across all 5 roles: Home for 4
  roles, org chart, compliance calendar, attendance today and register,
  approve, expenses, loans, salary revisions, overtime, requisitions,
  warnings, offers, Emiratisation, department performance, 6 reports,
  3 settings pages, data import, access review, the employee's My
  payslips, My leave, Me and My requests, the "Outside your view" page,
  and `bug-roleswitch-scroll.png`.
- Manar One: `manar/home.png` and `payroll.png`.

Limits. Dark mode is judged from one screen. The phone is judged from
one screen, and the walk holds no phone or dark captures. The walk
covers list-level routes only, so the RT record score rests on the one
offer shot. Motion is judged from a 25 fps capture: it supports claims
about choreography and duration (to about 40 ms), not smoothness. All
pixel and ms values are approximate. Walk shots were read from scaled
contact sheets, so their pixel values are converted to 1440 and rounded.

## Headline

This is a real step up. The six-word bar replaced the sidebar, there is
one hero per Home, Review shows only exceptions, the permanent rail is
gone, lists, settings and records share templates, and Cmd K works. It
is already far calmer than Manar One, which still has the yellow
banner, the long sidebar and a row of nine buttons on Payroll.

It is not yet amazing. Across 90 screens it reads as one clean
spreadsheet template repeated: grey monograms, small table type, two-row
lists over 800px of empty canvas, reports with no charts, and demo
caveats in the body copy. The motion is there but fires in the wrong
place. The IBAN roll plays in a 13px line scrolled off the top of the
screen. Integrated score: **about 6.3**.

## 1. Scores

| Area                | Was | Now | One line                                 |
|---------------------|-----|-----|------------------------------------------|
| Home (HR, desktop)  | 6   | 7   | One hero now; KPI strip, right half weak |
| Panels, navigation  | -   | 6   | Right bar; the panels are a sidebar      |
| Pay run             | 5   | 6   | Exceptions only; 360px header per step   |
| Explain panel       | 7   | 8   | Shared-element figure; still a fade      |
| People list         | 5   | 6   | No column headers, 31 grey circles       |
| Profile             | 5   | 6.5 | Stats strip added; no actions            |
| Payslip             | 6   | 6   | Net pay is below the fold                |
| LF list (Positions) | -   | 6.5 | Solid template; verbose money            |
| RT record (Okafor)  | -   | 6   | Status set as a figure; letter floats    |
| Settings (Leave)    | -   | 7   | Best template; ragged right edge         |
| Report (Variance)   | -   | 5   | No chart; two report templates           |
| Phone Home          | 5   | 5   | Five header icons, a small figure        |
| Dark mode           | -   | 6.5 | Clean on Home; untested elsewhere        |
| Motion              | -   | 6   | Right ideas, wrong place, too fast       |

How the earlier rejections now stand:
- Fixed: the "How the figures" rail, Review as 31 rows, 8 bordered Fix
  cards (now one grouped list), and the dark banner glare.
- Partly fixed: the duplicated hero. The 14-run hero card is down to
  about 6 runs, but the h1 and the figure still compete.
- Not fixed: the "as we read them" copy, the payslip's empty right
  side, and the phone fold.
- Not visible: the "Continue to Pay" state bug. The footer sits below
  the fold in both Approve shots.

## 2. What an Apple design review would still reject

Against the owner's brief, one line each:
- Extremely advanced: not yet. No charts, and no moment a client
  retells.
- Motion: present, but it fires off screen and arrives by fading.
- Smooth: calm and consistent; nothing judders in the frames.
- Easy navigation: the six-word bar and Cmd K are right. The panels
  and dead ends are not.
- Light and dark: dark is clean on Home and unproven elsewhere.
- No long sidebar: kept in letter, broken in spirit by the 25-link
  People panel.
- Not AI-looking: passes. No gradients, glass or illustrations, and the
  copy is plain. The risk now is looking generic, not looking AI-made.
- Clients amazed: no. They will find it calm and clear, not amazing.

### Template level (seen on most of the 36 walk screens)

- **The page edge and title still move.** The h1 top sits at y 148
  (Positions, Leave policies), 158 (People), 176 (pay run, under a
  breadcrumb) and 222 (Variance, under a date stepper). Documents
  expiring is inset about 39px from every other page at 1440. There are three
  breadcrumb styles: "Offers" alone, "People / Jose Reyes", and
  "Zarqan Demo Bank / Reports (underlined) / ...".
- **There are two report templates.** Executive dashboard, Leave, Trend
  and Department performance put an outline "Download CSV" and a text
  "Print" top right, with numbers left-aligned in a card. Payroll
  summary and Documents expiring put a filled teal CSV button and an
  outline Print under the subtitle, with right-aligned numbers and no
  card. A user moving between two reports sees two products.
- **Reports have no charts.** "Payroll trend" is a 10-row table, and the
  "Executive dashboard" and "HR dashboard" are tables of Measure, Now,
  Compared with and What it tells you. Variance has no waterfall. Only
  Emiratisation and Department performance draw bars, and those are
  hairlines under the label.
- **Numbers are not one system.** Variance left-aligns money and uses a
  hyphen as the minus ("-AED 14,719.06"). Elsewhere AED and the decimals
  are muted. Positions repeats the currency in "AED 27,000.00 to AED
  29,000.00". Zero is shown as "-", as "None" (attendance, side by side)
  and as "AED 0.00". The hero figure is 96px on Home, about 32px on
  Variance, about 24px on Exec, and about 13px bold for "14 of 30" on
  Emiratisation.
- **Short lists leave the screen empty.** Expenses has 2 rows,
  requisitions 4, revisions 2, warnings 1 and loans 3, and each sits
  over about 800px of empty canvas with no summary, nothing beside it
  and no empty state.
- **People are grey circles.** All 31 monograms are the same grey on
  grey. Status dots carry no label on the People list (amber with no
  word, except "Left"), and the People list has no column headers while
  Positions does.
- **The decider gets no actions.** On "Overtime to decide", logged in as
  Arjun Menon, every row reads "Waiting for Arjun Menon" in amber text,
  with no Approve or Decline. Apple would say "Waiting for you" and put
  the buttons on the row.
- **Demo copy sits in the body.** Examples: "Head office reader (demo)"
  on every attendance row, "(demo receipt)", "Agreed before the demo",
  "Days left are counted from the demo's today", "Head office, Abu Dhabi
  (fictional)", "Demo only: each entry's fingerprint...", and "Based on
  UAE mainland rules, as we read them." That last line appears inside
  an offer letter addressed to a candidate. Provenance is a deliberate
  honesty rule, so keep it in one place, not in sentences.
- **Navigation reaches dead ends.** The employee's bar leads to "Outside
  your view". A tab should never lead to a refusal.
- **A role switch keeps the scroll position.** The GM and IT Homes land
  scrolled about 300px down, without their headline
  (`bug-roleswitch-scroll.png`).

### Panels and navigation: 6

- **The People panel is the sidebar, folded.** It has 7 groups, 25 links
  and is 800px tall, with three columns of unequal length and a 400px
  hole bottom right. The brief said no long sidebar, and this is one,
  laid sideways.
- **The IT manager's People and Reports panels hold one link each**
  ("Everyone 31", "Audit trail") in a 1056px-wide card. A one-item
  panel is a click with an extra step.
- **The open tab gets no state.** With the People panel open, "Home"
  keeps the pill. The panel starts at x 432, not on the 278 content
  edge, so it floats free of the grid. There is no scrim: the page's
  headline is cut off beside it ("2 bank det").
- **The labels are comma lists.** "Pay run: review, fix, approve",
  "Leaver checklists, exit", "End employment, resignation", "Salary
  revisions, back pay". Cmd K wraps "Decide: October pay run: HR manager
  prepared, General manager approves" to two lines.
- **Motion.** The panel opens with a pure opacity cross-fade over about
  160 ms (4.52 to 4.68 s). No travel is visible at the capture's scale
  (a shift under about 4px would not show). The page behind
  is not dimmed.

### Home (HR, 1920): 7

- **There are still two loud things:** the 36px h1 "2 bank details hold
  October pay" and the 96px light figure. The same verb appears three
  times: "Enter bank details" (filled), then "Enter IBAN" twice, also
  filled.
- **The hero card's right 900px is empty** beside the figure. The card
  is 1364px wide, and its content is 600px.
- **The KPI strip is weak.** It sets "31 On the payroll" with the figure
  (28px) and the label side by side on one baseline. Manar's stacked
  KPI figures read stronger.
- **The IT Home** puts a past date, "Wednesday, 30 September", in 28px
  as a card title, and uses underlined text inside outline buttons
  ("Open webhooks"). A button is either a button or a link.

### Pay run: 6

- **The header is about 360px tall** (breadcrumb, 36px h1, "Pays on 30
  Oct", the 4-step stepper) and repeats on all four steps, so the fold
  holds about 300px of the step itself.
- **On Review, the coachmark covers the comparison line** under the net
  figure, and the pension caveat runs to three grey lines.
- **The figure styles disagree.** Net is 96px light, gross and
  deductions are 28px semibold, and the h1 is 36px bold: three type
  personalities in one band.
- **Approve and Pay both end in a pale disabled primary** (teal at about
  45% opacity, under 3:1 against the page). "Held out: 1 person" under
  "Fix: 2 stop pay" makes the reader do sums: Juma's line is in the file
  but will bounce.

### Explain panel: 8

- **The best moment in the product.** The figure flies from the page
  into the drawer header (about 160 ms), the scrim lands, and the rows
  stagger in about 40 ms apart (22.8-23.1 s).
- **Rejections.** The drawer cross-fades in place instead of sliding
  from the right. The flight is too quick to follow (Apple uses about
  350-450 ms for a hero move). The drawer covers the demo banner at the
  top. In the gratuity working, step 6, "The limit is two years' basic
  wage... AED 684,000.00", sits in the same column as the additive
  steps, so it reads as part of the sum. "Rounded once, to the fils" is
  jargon.

### People list: 6

- No column headers, grey monograms, unlabelled amber dots, a 67px row
  for one line of data plus a staff number, and "31 people" printed
  under the "All 31" tab.

### Profile: 6.5

- The 3-stat strip works. But no action exists anywhere on the person:
  no Edit, Message or "...". The right 1000px of the header band is
  empty. "784-****-*******-*" is a masked ID that looks broken; use
  "•••• 4567". Section headings ("Open items", "Pay") are inset 20px
  from the h1 edge.

### Payslip: 6

- Net pay, the one number an employee opens a payslip for, is at the
  bottom, below the fold at 1080. The 908px card sits left with a 455px
  empty column beside it at 1920.

### LF list (Positions): 6.5

- A clean anatomy: title, subtitle, search, segmented filter, count,
  table. But "AED 27,000.00 to AED 29,000.00" fills the widest column,
  "Faisal Chaudhry joins on 16 Nov 2026" is labelled "Vacant", and "Was
  James Whitfield" is set as a person.

### RT record (Okafor offer): 6

- "With candidate" is set at 32px as if it were a figure, beside "AED
  40,800.00". The letter is a 768px card left-aligned, with 600px empty
  to its right. It is a web card, not a document: no letterhead, no page
  ratio. It ends with "Based on UAE mainland rules, as we read them."
- Actions ("Record accepted" filled, "Record declined" outline) are
  correct.

### Settings (Leave policies): 7

- Inset grouped lists, like iOS Settings, and provenance as a quiet
  trailing phrase. That is the right model. But "Edit" appears on only
  2 of 7 rows, which pushes those values 70px left, so the value column
  has a ragged right edge. "Paid, in steps (see sick leave below)" is a
  note, not a value. Holidays shows "None loaded" twice, and a demo
  should never show an empty setting.

### Report (Variance): 5

- See the template notes. Money is left-aligned. The total row "Change
  in gross" has the same weight as the causes. The hero is "-AED
  14,719.06" at 32px with a hyphen. A plain-text "Print" sits next to an
  outline "Download CSV". The bottom third of the screen is empty. A
  variance report is the textbook case for a waterfall chart.

### Phone Home (393pt): 5

- **The header carries five controls:** search, bell, eye, theme and
  avatar.
- **The net pay figure is about 20pt**, with "Jose Reyes" printed under
  the person's own pay.
- **Card padding is about 24pt inside a 16pt gutter.** "Open payslip" is
  underlined text in an outline button. "Annual leave left / 22.5 days
  left" says "left" twice. The empty state "No requests yet." is set at
  about 16pt in grey, larger than the body text.
- **The floating tab bar is good.** But the content under it shows
  through without blur.

### Dark mode: 6.5 (one screen)

- The banner no longer glares, and the light-teal primary with dark text
  reads well. But the hero card (#1C1C1E-like) on a #111 page has about
  3% lightness separation, so card edges vanish. No list, report, panel
  or phone screen was captured in dark, so this score is provisional.

### Motion: 6

- **Opening.** The figure counts 0 to 933,730.94 from about 0.2 to
  0.9 s with an ease-out, and every other element appears at once, with
  no staging. All digits, including the fils, spin like a fruit machine.
  Apple rolls digits per column (odometer) or not at all.
- **The IBAN save, the signature moment, plays off screen.** At 11.9 s
  the Priya row disappears within 100 ms, and the rows below jump up with
  no height animation. The "held out" figure then rolls 25,300 to 0
  over about 700 ms in a 13px line at the top of the hero, which is
  scrolled half out of view. The headline changes "2 to 1" off screen.
  The toast (bottom left, with Undo) is the only thing the eye sees.
- The scroll jump at 14.4-15.0 s comes from the capture script
  (`flow.js` calls `scrollTo` and `scrollIntoViewIfNeeded`), not the
  app, so it is not scored.
- **Panels and the drawer fade.** Nothing slides, so nothing says where
  the panel came from.

## 3. The 20 upgrades

Each upgrade has a number (its place in the groups below) and a global
rank, R1-R20, by lift for the effort. Tags show the areas it lifts.
Effort: S under a day, M 1-3 days, L about a week.

Global order: R1 = 10, R2 = 8, R3 = 3, R4 = 1, R5 = 5, R6 = 11, R7 = 2,
R8 = 4, R9 = 17, R10 = 7, R11 = 9, R12 = 12, R13 = 19, R14 = 15,
R15 = 14, R16 = 6, R17 = 18, R18 = 20, R19 = 13, R20 = 16.

### A. Template level (fixes hundreds of screens at once)

**1. (R4) One page header component, all 6 templates [all areas] M.**
Top padding 40px under the bar. One breadcrumb style: 13/18 secondary,
"/" separators, no underlines, the current page not a link. h1 34/40
semibold, tracking -0.4px. Subtitle 17/24 secondary, max 72ch. Actions
right-aligned on the h1 baseline, with at most one filled primary per
page; Print and CSV go into a "..." menu. The same y on every route
(h1 top at bar + 88px). Delete the second report header.

**2. (R7) Report template with a chart first [Report, Home] L.**
Every report opens with a 48/52 figure (AED and decimals muted 60% at
0.6em), then a 240px chart, then the table.
- Trend: a 10-column bar chart, October in teal and the rest at 24%.
- Variance: a waterfall, Sep 953,400 to the 6 causes to Oct 938,681,
  with up steps teal, down steps neutral and the total bars solid.
- Exec and HR dashboards: 4 tiles, each a 34px figure, a 13px label and
  a 32px sparkline, above the table.
- Numbers right-aligned and tabular-nums, the true minus (U+2212), and a
  total row at 600 weight with a 2px top rule.

**3. (R3) List template v2 [People, LF, all lists] M.**
- Always show column headers: 12/16, 500 weight, 0.2px tracking,
  sticky.
- Rows 56px. Status is always a dot plus a word.
- Monograms tinted by a name hash across 8 hues: 12% fill and 70% text
  in light, 24% fill in dark.
- Compact money in lists ("AED 27-29k"). Zero is always shown as "-".
- When there are 5 rows or fewer, show a summary band above (counts by
  status as 28px figures) and let the table hug its rows with an empty
  state below: a 15/20 sentence plus one action.
- For the decider, show the row actions inline (Approve, Decline, 32px).
  "Waiting for Arjun Menon" becomes "Waiting for you".

**4. (R8) Record and document layout: 8 + 4 columns [Payslip, RT, Profile]
M.**
Records use 8 columns for content and a 4-column sticky aside (summary,
actions, Explain) and never leave a column empty.
- Payslip: net pay first, at 56/60 at the top of the slip, then
  earnings and deductions. The aside shows "Paid to •••• 0017 on 30
  Oct", Download PDF and Explain.
- Offer: the status becomes a pill beside the h1, not a 32px figure.
  The letter renders as a page (794px wide, 56px margins, a letterhead
  rule).
- Profile: Edit, Message and "..." on the h1 baseline; masked IDs as
  "•••• 4567".

**5. (R5) Panel diet and panel state [Panels] M.**
- At most 3 columns of 6 links each. People keeps Team, Hiring, and
  Joining and leaving. Documents, Compliance and Growth move to a "More
  in People" row of 3 links and to Cmd K.
- A tab with one destination navigates directly (the IT manager's
  People and Reports).
- The open tab takes the pill and a 2px teal underline.
- The panel's left edge aligns to the 278 content edge.
- Scrim: rgba(0,0,0,.08) in light, .32 in dark.
- Links 15/20, with an optional 13/18 one-line description in the first
  column only.

**6. (R16) Settings rows: one value edge [Settings] S.**
The value is right-aligned at a fixed 24px inset. An editable row shows
a trailing chevron and the whole row is tappable; the "Edit" word goes.
Notes move to the row's subtitle. "None loaded" becomes an empty state
with an action ("Load the 2026 UAE holidays").

**7. (R10) Provenance in one place [all] S.**
Add a footnote token at the foot of each page: "UAE mainland rules ·
fictional data", 12/16 tertiary. Ban these from body copy: "(demo)",
"demo receipt", "before the demo", "the demo's today", "(fictional)",
"sample date", "Demo only:", and "as we read them". Never put
provenance in a letter, payslip or anything a third party receives.

### B. Home and hero

**8. (R2) Home hero, one statement [Home, Dark] M.**
- Merge the h1 into the card. The eyebrow is "October pay · 30 Oct" at
  13/18. The 96px figure stays. The sentence under it, at 20/28, is
  "1 payslip held out, 1 IBAN will bounce".
- Fill the right half with an 8px segmented bar ("31 people: 29 ready,
  2 held", segments animate) and the single filled CTA.
- List-row buttons become tinted secondary ("Enter IBAN" at 12% teal).
- The KPI strip becomes 4 tiles, each a 34/40 figure over a 13/18
  label, tappable, with hairline separators.
- Dark: the card surface at #1C1C1F on #0B0B0C, with a 1px
  rgba(255,255,255,.06) top hairline.

**9. (R11) The pay run's sticky compact header [Pay run] M.**
- On scroll past 120px, or on steps 2-4, the header collapses to a 64px
  sticky row: "October pay run · 30 Oct" at 17/22 semibold on the left,
  and a 4-dot stepper (8px dots, 24px apart, the current dot 24x8
  pill) on the right. This saves about 290px.
- Show the coachmark once, under the figure, and dismiss it after the
  first Explain.
- Replace the disabled primary with a live one: "Fix 2 to approve" opens
  Fix.
- Fix step: "1 held out (Priya), 1 will bounce (Juma)".

### C. Motion and signature moments

**10. (R1) Make the IBAN moment visible [Motion, Home] M.**
On save, do not scroll.
- The row collapses: height to 0 over 240 ms on
  cubic-bezier(.2,0,0,1), and the rows below move up with it.
- The row's own "AED 25,300.00" figure (a shared element, not a
  decorative particle) travels to the hero's held-out line: 420 ms, a
  spring with stiffness 300 and damping 30.
- The figures that change roll digit by digit, odometer style, over
  600 ms with a 30 ms stagger per column, and the fils do not spin.
  Held out goes from 25,300.00 to 0.00, and the salary file from
  908,430.94 to 933,730.94. Set the salary file at 28px beside the
  segmented bar (upgrade 8) so the roll is seen. The 96px net figure
  does not change and should not move.
- The headline cross-fades "2" to "1" with an 8px vertical slide over
  200 ms.
- The segmented bar fills one segment over 300 ms.
- When the hero is out of view, a 48px sticky summary ("Salary file
  AED 908,430.94") shows the roll instead.

**11. (R6) Panels slide, drawers travel [Motion, Panels, Explain] S.**
- Nav panel: opacity 0 to 1, translateY -8px to 0 and scale .98 to 1,
  over 200 ms on cubic-bezier(.2,.8,.2,1); exit in 140 ms. The scrim
  fades over 160 ms.
- Explain drawer: translateX 32px to 0 with opacity, 280 ms, the same
  curve.
- Shared-element figure: 380 ms (now about 160).
- Rows stagger 40 ms, starting at 200 ms.
- Reduced motion: a 120 ms cross-fade only.

**12. (R12) Staged first paint and tab travel [Motion, Home] S.**
- On load, the eyebrow comes at 0 ms, the figure at 60, the bar and
  stepper at 120, the KPIs at 180 and the lists at 240. Each fades and
  rises 12px over 320 ms with ease-out.
- The figure uses the odometer roll (900 ms) after first paint, not a
  count from 0.
- Route change: content fades and rises 8px over 220 ms. The nav pill
  slides between tabs as a layout animation over 260 ms.

**13. (R19) A role switch resets scroll and morphs [Motion, Home] S.**
Scroll to 0, a 240 ms content cross-fade, and an avatar and role-label
morph over 300 ms. This fixes `bug-roleswitch-scroll`.

### D. Content and copy

**14. (R15) Rewrite the panel and Cmd K labels [Panels] S.**
- "Pay run: review, fix, approve" becomes "Pay run".
- "Salary revisions, back pay" becomes "Salary changes".
- "Leaver checklists, exit" becomes "Leavers".
- "End employment, resignation" becomes "End employment".
- "Hiring: candidates board" becomes "Candidates".
- "Decide: October pay run: HR manager prepared, General manager
  approves" becomes "Approve October pay run".
- In Cmd K, actions come first with a 16px type icon and a return
  hint. Show 3 recent items when the query is empty.

**15. (R14) Explain working: separate caps from sums [Explain] S.**
Put the result at the top at 40/44. Additive steps keep the amount
column. Caps and limits render as a separate "Limit" row with a 6px
bar ("173,928 of 684,000", 25% filled), with no amount in the sum
column. "Rounded once, to the fils" becomes "Rounded to the nearest
fils, once, at the end".

**16. (R20) No dead ends, no empty demos [all] S.**
Remove routes that lead to "Outside your view" from the bars of roles
without access. Seed every demo list with at least 4 rows, and every
setting with a value.

### E. Phone, dark mode and colour

**17. (R9) Phone Home as a pass [Phone] M.**
- The header shows only the logo and avatar. Search moves to a
  pull-down; the bell, eye and theme move into the avatar sheet.
- Large Title "Pay arrives Friday" at 34pt bold (30 Oct).
- A Wallet-style card, full width with 20pt padding: the 56pt figure,
  "in 3 days" below, and a 4pt progress bar from cut-off to payday.
- Leave becomes a 2-up row of tiles (17pt figure). Empty states at
  15pt secondary.
- Tab bar: backdrop-filter saturate(180%) blur(20px), background at 72%.

**18. (R17) Phone templates [Phone] L.**
- Lists: inset grouped, 44pt rows with chevrons.
- The large title collapses from 34pt to 17pt in the nav bar over
  200 ms on scroll.
- Explain opens as a bottom sheet with medium and large detents.
- The pay run stepper becomes a 4-dot row at 44pt height.

**19. (R13) Dark mode on every template [Dark] M.**
- Surfaces: base #0B0B0C, surface 1 #161618, surface 2 #1E1E21,
  hairline rgba(255,255,255,.08).
- Text: primary #F2F2F3, secondary #A1A1A6 (7.6:1 on base).
- Teal #5FB8B0 with #04302C text.
- Re-run the 466-route walk in dark and on the phone, and review a
  sample like this one.

**20. (R18) Colour discipline, final pass [all] S.**
Amber means "needs a person" only, and red means "stops pay" only.
Status text stays neutral, with the dot carrying the colour ("Waiting
for Arjun Menon" in amber goes neutral). Teal is for one primary per
view and for links, never for informational text.

### Coverage check (each area to 9 or more)

| Area       | Upgrades       | Area        | Upgrades        |
|------------|----------------|-------------|-----------------|
| Home       | 1, 8, 10, 12   | LF list     | 1, 3, 16        |
| Panels     | 5, 11, 14      | RT record   | 1, 4, 7         |
| Pay run    | 1, 9, 10       | Settings    | 1, 6, 16        |
| Explain    | 11, 15, 7      | Report      | 1, 2, 7         |
| People     | 3, 20          | Phone Home  | 17, 18          |
| Profile    | 4, 1           | Dark mode   | 8, 19           |
| Payslip    | 4, 1           | Motion      | 10, 11, 12, 13  |

## 4. The five changes that most change the first 60 seconds

These are tied to the timeline in `flow.mp4`.

1. **0-2 s, the opening (upgrades 8 and 12).** Today: about 200 ms of
   blank page (possibly a load artefact), then everything at once, with
   a spinning figure. After: a staged rise, an odometer figure and one
   statement. This is the first impression, and
   today it says "dashboard".
2. **8-15 s, the IBAN save (upgrade 10).** Today: the row blinks out
   and the money moves off screen. After: the row folds, its figure flies
   to the hero, the digits roll and the bar fills. This is the moment a
   client would remember and retell.
3. **4.5 s, the first panel (upgrades 5, 11 and 14).** Today: 25 links
   fade in, Home keeps the pill and nothing dims. After: 3 short
   columns slide 8px under a lit tab. This is where "no long sidebar"
   is proved or lost.
4. **22-24 s, Explain (upgrades 11 and 15).** The figure's flight at
   380 ms instead of 160, a drawer that slides, and caps shown as a
   bar. This turns the best feature into the visible signature.
5. **Throughout, copy and dead ends (upgrades 7 and 16).** "(demo
   receipt)" appears in Cmd K at about 40 s, "Demo only:" on the IT
   Home, and a letter that says "as we read them". Each one breaks the
   spell for a client.
