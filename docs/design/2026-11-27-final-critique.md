# Mubinflow, merged final build: a hard rescore against the Apple standard

Date: 2026-11-27 (captured 26 Nov). Reviewer: Artisan (visual design). No
code was edited. This rescores the `final` branch (head f26a4a2) after
`2026-11-26-integrated-critique.md` (about 6.3), which followed the first
screens (about 5.5). The exclusions in `2026-11-26-design-upgrade-plan.md`
still hold: no particle flows, no custom cursor, no hold-to-approve, and no
gradients or glass on content. Every motion value below is a candidate for
the owner's calibration gate, not a decision.

## Evidence, and its limits

Paths are under `.../scratchpad/cf/` (raw) and `.../scratchpad/critic-final/`
(the 12 best, the 12 worst and the motion sheets).

- About 70 PNGs: 1920x1080 at scale 1, and iPhone 15 (393x852) at scale
  2. The ones read for this review:
  - Homes: all four roles' Homes.
  - Panels: People, Pay, Reports and Setup as HR, and the manager's
    Requests panel. The Time panel was shot but not read.
  - Pay run: by deep link, and again along the click script (both IBANs
    saved, the GM approves, then Pay).
  - Records and lists: the explain drawer on James Whitfield's gratuity,
    People, a profile, a payslip, Positions, two offers (Kavya Iyer and
    Daniel Okafor), and Leave policies.
  - Reports: Variance, Trend and the HR dashboard.
  - Other screens: the roster, the org chart and Cmd K.
  - Dark: Home, the People panel, People and Variance.
  - Phone: HR Home, the People panel, the People list and the employee
    Home.
- Twelve registry areas, picked by hand (not at random) across all five
  sections: E-signatures, Travel, Attendance today, Overtime, Fines,
  Loans, Payroll journal, Users and roles, API keys, Appraisals, Employer
  cost and Warnings. Eleven were read from 960px contact sheets and
  Overtime at full size.
- `video/flow.mp4` (34.8 s, 25 fps): opening, People and Pay panels, both
  IBAN saves, and the explain drawer. Frames were pulled at 0.1 s steps,
  and at 0.04 s for the opening and the drawer. Two more recordings of
  the opening and the drawer (runs 2 and 3) check that the glitches
  repeat.
- Manar One: `manar/home.png`. The Payroll screen's nine buttons are
  carried over from the previous critique, not re-read.

Limits. Capture is headless Chromium on a shared CPU, so frame pacing
(choppiness) is not proof of jank on the owner's laptop. Wrong values
and resets are a different matter: the app state is wrong, so they are
reported. The text in a "seen N of 3" note means the same thing happened
in that many recordings. Pixel values are read off 1920 shots and are
about +/- 4px.

## Headline

This is now a credible product, not a template. The HR Home has one
statement, a hero figure, a run bar, a five-month sparkline and four
tiles. Variance draws a waterfall. The payslip leads with net pay. The
offer is a lettered document with a status pill. Dark mode holds across
every template I opened, and the phone People panel is an iOS inset
grouped list. Beside Manar One (yellow banner, long sidebar, nine
buttons, everything equally loud) this reads as a different class of
software.

It is not 10. Three things hold it back. The headline number glitches
on first paint. The second level of the product (dashboards, roster, org
chart, the IT and manager Homes, short lists) is still a table on a
grey canvas. And every group page carries a 120px dead band between its
tabs and its title. Integrated score: **about 7.3** (up from 6.3).

## 1. Scores

The same 14 areas as the previous critique. "First" is the first-screens
critique, "Integ" the integrated build, "Final" this build.

| Area                | First | Integ | Final | One line                  |
|---------------------|-------|-------|-------|---------------------------|
| Home (HR, desktop)  | 6     | 7     | 8     | One card, chart, run bar  |
| Panels, navigation  | -     | 6     | 7     | Waiting, Go to; glass     |
| Pay run             | 5     | 6     | 7     | Story works; 420px header |
| Explain panel       | 7     | 8     | 8.5   | Limit bar; ghost frames   |
| People list         | 5     | 6     | 7     | Headers; grey circles     |
| Profile             | 5     | 6.5   | 7     | Next aside; no Edit       |
| Payslip             | 6     | 6     | 8     | Net pay first, aside      |
| LF list (Positions) | -     | 6.5   | 7     | Money still verbose       |
| RT record (offer)   | -     | 6     | 8     | Letterhead, pill, aside   |
| Settings (Leave)    | -     | 7     | 8     | One value edge            |
| Report (Variance)   | -     | 5     | 7.5   | Waterfall; cut axis       |
| Phone Home          | 5     | 5     | 6     | Small pay card            |
| Dark mode           | -     | 6.5   | 8     | Holds on every template   |
| Motion              | -     | 6     | 6     | On screen; values glitch  |
| **Overall**         | 5.5   | 6.3   | 7.3   |                           |

Areas scored for the first time:

| Area                  | Final | One line                                  |
|-----------------------|-------|-------------------------------------------|
| GM Home and Approve   | 8     | "Waits for your approval", live button    |
| Salary file (Pay)     | 8     | One sentence, one filled button           |
| Phone People panel    | 8     | Inset grouped, counts, chevrons           |
| Payroll trend         | 6     | Ten bars of equal height say nothing      |
| HR dashboard          | 5     | A table under a unitless "8"              |
| IT Home               | 6     | Four cards, past date as a title          |
| Manager Home          | 6.5   | Inline Approve; 300px hole beside it      |
| Roster                | 5     | A grey wall; no shift times in cells      |
| Org chart             | 5.5   | An indented list, not a chart             |
| Cmd K                 | 6.5   | Footer keys good; actions last, wrap      |
| Registry lists (12)   | 6.5   | Consistent; short lists on empty canvas   |
| Phone People list     | 5     | Rows wrap three ways; tabs cut off        |

How the previous 20 upgrades landed:
- **Done:** one breadcrumb style, a "..." menu on reports, the
  waterfall, the Trend bars, column headers, status dot plus word, the
  payslip and offer layouts, the status pill, the settings value edge,
  the provenance footnote ("Fictional demo data. Rules as we read
  them."), the explain Limit row with its bar, the live "Continue to
  Pay", panel labels without comma lists, inline Approve for the
  decider, the phone header, the phone inset lists, and dark surfaces.
- **Partly done:**
  - Page header: one style, but the h1 top still sits at four heights
    (y 194, 217, 230, 288).
  - Report tiles: only Travel, Fines, Loans, API keys and Warnings have
    them.
  - Staged first paint: present, but it glitches.
  - The IBAN moment: on screen now, but the chip parks on the figure
    instead of travelling.
- **Not done:**
  - Name-hash monogram tints.
  - Compact money in lists.
  - A sticky compact pay-run header.
  - A slide on panels and the drawer.
  - The Wallet-style phone pay card.
  - "Waiting for you" wording for the decider.

## 2. What an Apple design review would still reject

### Blocking (would stop the demo)

- **The hero figure counts up from zero through totals that mean
  nothing.** `Money` with `countUp` tweens from 0 over 800 ms
  (`ui/Money.tsx`). This is in three parts:
  - **Certain, by design.** Every first paint shows false totals on the
    way up: 454,726.96, 532,226.63, 630,268.38.
  - **Seen 2 of 3.** The count restarts from AED 0.00 partway through.
    Run 2 went 0.00, 532,226.63, 0.00, 901,984.08, 933,730.94. Run 3
    went 0.00, 630,268.38, 0.00, 800,207.41 and on to 933,730.94. A
    remount or a second tween start would explain it; check that the
    tween starts only once.
  - **Depends on the capture.** In run 1 it stalled about 480 ms on one
    value. That may be the headless CPU.
  On a projector laptop, the client's first look at their payroll can be
  a wrong total, or a reset to zero.
- **The explain drawer flashes.** It appears as a translucent ghost with
  the figure in flight, and in run 1 it then vanished for two frames
  (80 ms) with no scrim before landing (seen 1 of 3). Runs 2 and 3
  showed only the ghost, for about 120 ms.
- **"Held out" may flicker on the first IBAN save (seen once, read from
  a 450px crop).** It went AED 0.00, "None", AED 0.00 in consecutive
  frames, and the GM Home settles on "None". Pick one form ("None") and
  do not animate the change of format.
- **The HR dashboard contradicts Fix.** Its hero reads "Open items that
  stop pay: 8". Fix and Home say "2 stop pay, 6 to check". A bank's HR
  manager will spot this.

### Template level (seen on most screens)

- **A dead band under group tabs.** On every page with a tab row (People,
  Positions, Org chart, Leave, Overtime, all 12 registry areas) the tabs
  sit at y 137 and the h1 at y 288. That leaves about 120px of nothing.
  The roster puts its h1 at 206 under the same tabs. Pay-run pages put
  it at 230 under a breadcrumb, the payslip at 194 and the profile at
  217. Four title heights in one product.
- **Reports carry tabs and a breadcrumb that say the same thing.**
  "Variance" is lit in the tab row, then "Reports / Variance against
  last month" sits under it.
- **The first tab pill hangs out of the column.** "Everyone" and
  "Rosters" sit at x 264, while every other left edge is 278. The pill's
  padding should sit outside the column, but the text should align to
  278. On other pages the text does align, so the offset is not even
  consistent.
- **Light-mode panels are glass on content.** The panel sheet is
  `backdrop-filter: blur(20px) saturate(1.2)` on white at 92% opacity. The hero
  headline and the chart show through as grey smears (People, Reports and Setup
  shots). The dark panel shows no smears. This breaks the plan's no-glass rule,
  and it looks dirty, not premium.
- **Truncation in navigation.** Go-to lines end in "Exit interv...",
  "HR help ...", "Health ins...", "Enga...", "Pay calendar ...",
  "Email...". Cmd K truncates "Fatima Al K...". Apple never truncates a
  menu: cut the list or wrap it.
- **Short lists still float on an empty canvas.** E-signatures has 3
  rows, Travel 2, Fines 2, Overtime 2, Warnings 1 and API keys 2. Each
  leaves 400-600px of grey below. The small grey stat tiles ("2 To
  book") do not fill the role of a summary band.
- **People are still grey circles.** All monograms are the same warm or
  cool grey, on every list, the org chart, Home and the phone.
- **The second level is still tables.** The HR dashboard is a 4-column table
  with mostly "-" in "Compared with". The org chart is an indented list. The
  roster is 31 rows of identical grey cells with no shift times, and the
  published and draft weeks are told apart only by a header tint.

### Per screen

- **HR Home.**
  - The "Off in the next 7 days" tile shows a big "0" over seven empty
    dashes, so a quarter of the KPI row is empty.
  - The sparkline's grey fill is a flat slab: Jun to Sep are within
    AED 1,500, so the chart reads as a straight line.
  - The HR statement has no full stop, while the IT and manager
    statements do ("One connection is failing.").
- **Pay run.**
  - The header (breadcrumb, 36px h1, "Pays on 30 Oct", a 4-node stepper
    with 340px gaps) takes 420px on every step, so the step itself
    starts at y 490.
  - On Approve after sign-off, the stepper says "Pay: Now" while the
    page is still Approve.
  - By deep link with the IBANs open, Approve shows two disabled grey
    buttons side by side. The live story never shows this state, so it
    is a secondary note.
- **Explain.**
  - The working rows stagger in over about 1 s, so the drawer sits
    half-empty.
  - "What went in" paints before the working above it.
  - Steps 7-8 (unused leave, "worked out so far") are inside a drawer
    titled "End-of-service gratuity" but are not gratuity.
  - The drawer covers the demo banner.
- **Variance.**
  - The hero sets "-" at 64px before a 36px "AED", which reads as a
    dash, not a minus.
  - The axis starts at AED 920k, so a 1.5% fall draws as a bar 44%
    shorter. The caption admits it, but Apple would start at zero or
    break the axis visibly.
- **Trend.** Ten bars of almost equal height on a zero axis. The hero
  "AED 9,509,429.79, Jan to Oct" answers a question nobody asked.
- **Positions.** "AED 27,000.00 to AED 29,000.00" still fills the
  widest column. "Faisal Chaudhry joins on 16 Nov 2026" is labelled
  "Vacant".
- **Profile.** No Edit, Message or "..." on the person. The 1,000px to
  the right of the header is empty.
- **Settings.** "Holidays" and "Public holidays" are two tabs in the
  same row.
- **Offer letter.** The amounts end 33px inside the letterhead rule's
  right edge.
- **Cmd K.**
  - Navigation ("Go to") comes before actions.
  - Actions sit under the heading "People with open items".
  - "Decide: October pay run: HR manager prepared, General manager
    approves" still wraps to two lines.
- **Manager Home.** One request row, then a 300px hole beside "Team
  today". The Requests panel holds one Waiting link ("Waiting for you",
  which is already on Home) and one group.
- **IT Home.** "Wednesday, 30 September" is still a card title at 28px.
  The audit card still says the fingerprint is "worked out in this
  browser".
- **Overtime (HR view).** "Waiting for Arjun Menon" is in amber text,
  with Accept and Decline beside it for HR.
- **Phone employee Home.**
  - Net pay is about 22pt, with "Jose Reyes" printed under the person's
    own pay.
  - "22½ days left" sits under "Annual leave left".
  - The empty state is 16pt grey, larger than the body text.
- **Phone People list.** Each row lays out its metadata differently:
  "Teller" floats right on one row and wraps on the others. The tab row
  is cut off at "Group". There is an 80px gap under the tabs.
- **Copy still in the body.**
  - "(outside this demo)" (Appraisals).
  - "This is a demo of the steps" (E-signatures).
  - "Not computed (pension)" and "Gross only" in a Total column
    (Employer cost).

Against the owner's brief, one line each:
- Extremely advanced: closer. The waterfall, the explain working and the
  live IBAN check are retellable; the dashboards are not.
- Motion: present and now on screen, but the number glitches undo it.
- Smooth: navigation yes; first paint and the drawer no.
- Easy navigation: yes. Six words, Waiting first, Cmd K.
- Light and dark: dark is now a strength.
- No long sidebar: kept. The People panel is 7 groups but reads as two
  columns.
- Not AI-looking: passes, except the glass panel.
- Clients amazed: in the pay run and Explain, yes. On the dashboards, no.

## 3. Ranked upgrades (15)

Effort: S under a day, M 1-3 days, L about a week. Values are starting
points for the calibration gate.

1. **Replace the hero count-up with the column roll (S).** Never show a
   total that is not the real one.
   - Use the existing `RollDigits` (already used for the salary file)
     on the hero instead of `countUp`.
   - Each column rolls to its digit over 700 ms on
     cubic-bezier(.2,0,0,1), with a 30 ms stagger right to left.
   - The fils do not roll.
   - Start the roll once, after first paint. If a re-render lands
     mid-roll, jump to the end rather than restart (this fixes the
     resets to 0.00).
   - Reduced motion: no roll.
2. **Fix the drawer entry (S).** The ghost and the flash look like a
   snapshot cross-fade (the app uses `startViewTransition` in
   `demo/actions.ts`). Confirm this, then animate the drawer itself:
   - Drawer: translateX(32px) to 0 with opacity 0 to 1, over 280 ms on
     cubic-bezier(.2,.8,.2,1).
   - The figure flies in a separate layer (380 ms) after the drawer is
     mounted.
   - Rows: stagger 30 ms, all rows in by 400 ms; "What went in" after
     the working.
3. **One page-header slot (M).**
   - The h1 top sits at 56px under the tab row, or at 40px under the bar
     when there are no tabs, on every route.
   - Delete the report breadcrumb when a tab row exists.
   - The first pill's text aligns to x 278.
   - This removes about 90px of dead band from every group page.
4. **Panels without glass (S).**
   - Light: solid #FFFFFF, a 1px rgba(0,0,0,.08) border and shadow
     0 12px 32px rgba(0,0,0,.12); no backdrop-filter.
   - Keep the scrim (rgba(0,0,0,.08)).
   - Go-to lines wrap to two lines at 13/18 and never truncate.
   - Panel x aligns to 278.
5. **Make the IBAN chip travel (M).**
   - After save, the "+AED 25,300.00" chip leaves the row and travels to
     the "In the salary file" figure (420 ms, spring with stiffness 300
     and damping 30), then fades as the figure rolls (600 ms).
   - Today it parks on the figure for about 1 s and covers it.
   - Hold the card height during the swap so the KPI tiles do not jump
     (they move about 20px twice today).
   - "Held out" goes straight to "None" with a 160 ms cross-fade.
6. **Dashboards as tiles, then table (M).** The HR dashboard first:
   - 4 tiles in a row, each a 34/40 figure, a 13/18 label and a 32px
     sparkline or meter, then the table below.
   - Rename the HR hero "Open items before approval: 8 (2 stop pay)", or
     use 2.
7. **Pay-run compact header (M).** On steps 2-4, or on scroll past
   120px, collapse to a 64px sticky row:
   - "October pay run · 30 Oct" at 17/22 semibold on the left.
   - On the right, 4 dots (8px, 24px apart; the current one a 24x8
     pill).
   - Fix "Pay: Now" while the page shows Approve.
8. **Monogram tints by name hash (S).** Eight hues: 12% fill and 70%
   text in light, 24% fill in dark. This lifts People, the org chart,
   Home tiles, Review and the phone at once.
9. **Short-list template (M).**
   - At 5 rows or fewer, the table hugs its rows.
   - A summary band above uses 28px figures per status.
   - Below, a 15/20 empty-state sentence with one action ("Nothing else
     waits. Set up a reminder").
   - Remove the grey stat tiles where the band replaces them.
10. **Roster as a schedule (L).**
    - Cells show "08-16" at 12/16 tabular.
    - Leave is a solid 60% fill with a label.
    - Waiting leave is a 1px dashed outline.
    - The draft week gets a "Draft" header chip and a 4px diagonal hatch
      at 6% opacity.
    - Today's column gets a 2px top rule.
11. **Org chart as a chart (L).** A top-down tree for two levels: 200x64
    cards, 24px gaps, 1px connectors, and the GM centred. Deeper levels
    expand on click with a 240 ms height animation. Keep the list as an
    alternate view.
12. **Phone employee Home as a pass (M).**
    - Large title "Pay arrives Friday".
    - A full-width card at 20pt padding: a 56pt figure, "in 3 days" and a
      4pt cut-off-to-payday bar.
    - Drop "Jose Reyes". "22½ days" and "Annual leave" as a tile.
    - Empty states at 15pt secondary.
13. **Phone list rows (S).** Two lines, always: name at 17/22, then
    "Role · Branch" at 15/20 secondary. Status as a trailing dot plus
    word. Tabs in a horizontally scrolling row with a 16px end fade.
14. **Variance and Trend honesty (S).**
    - Variance: a true minus (U+2212) at the figure's size, then "AED"
      at 0.5em. A zero-based waterfall, or a visible axis break with a
      zigzag.
    - Trend: plot the month-over-month change (diverging bars) with the
      zero line, not the absolute gross.
15. **Copy sweep (S).**
    - Cmd K: actions first under "Do", with the label "Approve October
      pay".
    - Decider rows: "Waiting for you".
    - Remove "(outside this demo)" and "This is a demo of the steps".
    - A Total column shows "-" with a footnote, not words.
    - Merge the "Holidays" and "Public holidays" tabs.
    - The IT Home card title becomes "Last access review: 30 Sep".

## 4. The five things that most change the first 60 seconds

1. **0-1.5 s, the opening (upgrade 1).** Today the first numbers the client sees
   are 0.00, then made-up totals, sometimes back to 0.00. After: the true
   figure, rolling into place. Nothing else matters if this is wrong.
2. **8-20 s, the IBAN save (upgrade 5).** The chip already exists. Make
   it travel, keep the tiles still, and the story is told without a
   word.
3. **4-6 s, the first panel (upgrade 4).** A solid sheet aligned to the
   grid, with no smears and no "...". This is where "no long sidebar"
   is judged.
4. **25-30 s, Explain (upgrade 2).** The best feature currently enters
   with a ghost frame and a half-empty drawer. Fix the entry and it is
   the signature.
5. **Throughout, the page edge (upgrade 3).** Every click into People,
   Time or Setup drops the title 120px with nothing above it. Remove
   the band and the product feels engineered.

## 5. What still looks AI-made or template-generic

- The glass panel smearing the page behind it.
- Grey stat tiles with one figure and a lowercase label ("2 / To
  book"), repeated on five pages with no relationship to the table
  under them.
- "Measure / Now / Compared with / What it tells you" dashboard tables:
  an LLM's idea of a dashboard.
- The org chart as an expandable list with "29 in the team" pushed
  1,000px right.
- Uniform grey monograms everywhere.
- Explanatory subtitles on every page that restate the title ("Offer
  letters, from draft to the candidate's answer.", "Leave types, and the
  rules behind them."). Keep the ones that add a fact; cut the rest.

Not AI-made, and worth saying: the copy is plain and specific, there
are no gradients, no illustrations, no emoji, and the colour discipline
(black primary, red only for "stops pay", amber only for "needs a
look") is now real.

## 6. What is genuinely excellent

- **The explain drawer.** Numbered working in plain sentences, amounts
  in a right column, the two-year limit as a meter ("AED 173,928.08 of
  AED 684,000.00"), and "What went in" with sources. Nothing in the
  market does this as clearly.
- **The pay-run story as the GM.**
  - Home reads "October pay waits for your approval" with "Approve
    October pay".
  - Approve shows Prepared by and Approval recorded as a two-step
    timeline, with "Continue to Pay" and Undo.
  - Pay is one sentence ("Salary file for 31 people, AED 933,730.94, to
    Zarqan Demo Bank") and one black button.
- **The Variance waterfall** with the cause table and a 2px total rule.
- **The offer letter** as a document, with the decision in the aside.
- **The payslip:** net pay at 64px first, "Paid to •••• 0017", and
  Print and Explain in the aside.
- **Leave policies:** iOS-grade inset groups, one value edge, and
  provenance as a quiet subtitle.
- **Dark mode:** #0B0B0C base, #1C1C1E cards (sampled), a light primary with
  dark text, and the scrim working.
- **Numbers as a system:** muted AED, muted fils, a true minus in lists
  and tabular figures everywhere.
- **The phone People panel and tab bar:** the most native-feeling screens
  in the product.
