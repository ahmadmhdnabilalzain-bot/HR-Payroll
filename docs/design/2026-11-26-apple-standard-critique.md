# Mubinflow against the Apple standard: a hard critique

Date: 2026-11-26. Reviewer: Artisan (visual design). No code was edited.

Evidence: the PNGs listed below, viewed one by one; a 2 fps contact sheet
of `payrun-flow-1920x1080.webm`; the CSS tokens in the built
`mubinflow-demo.html`. Motion is judged from that CSS and the 2 fps
sheet, not from real hardware (see plan step 3), so the motion notes are
about how it is designed, not how smooth it measures.

Screens viewed (scratchpad `demo-web/shots/`):
- `final/home-1440-fold`, `home-1440-full`, `home-1440-dark-fold`,
  `home-iphone15pro-fold`, `home-iphone15pro-full`
- `payrun-explain/r3-pay-run_review-1920-light`, `_fix-1920-dark`,
  `_approve-1920-light`, `f3-3-iban-saved-1920-light`,
  `f3-9-pay-iphone15-light`, `f3-explain-overtime-1920-light`,
  `f3-explain-gratuity-end-iphone15-light`
- `people-timeoff/r4/list-d1080-light`, `list-p393-dark`,
  `search-d1080-light`, `profile-jose-d1080-light`,
  `profile-jose-p393-light`, `payslip-jose-d1080-light`,
  `payslip-ayesha-explain-d1080-dark`
- Manar One: `home`, `payroll`, `profile`, and the side-by-side image

This critique sits under the provisional upgrade plan
(`2026-11-26-design-upgrade-plan.md`). Its evidence rule still holds:
the motion proposals in sections 3 and 4 are candidates for the owner's
calibration (step 2), not decisions. Nothing here brings back the
round-2 elements the plan excluded (particle flows, custom cursor,
hold-to-approve).

## How to read the scores

The scale is anchored at both ends. 3 is Manar One as the owner rates it:
a dense admin tool with a long sidebar, a yellow banner and 9 tabs of
buttons. 10 is a screen Apple would ship in iCloud, Wallet or Stocks
without a second review pass.

The honest headline: Mubinflow is a clear step up from Manar on
information design. The copy explains, the home headline says one thing,
there is no sidebar, and every figure can be traced. It is not yet a
step up on craft. It looks like a well-written government form set in
IBM Plex. Nothing on screen would make a client lean forward. Today the
product sits at about 5.5, and the owner wants 10.

## 1. Scores

| Screen          | Score | One line                                       |
|-----------------|-------|------------------------------------------------|
| Home (desktop)  | 6     | Right idea; the hero card carries too much     |
| Pay run         | 5     | Honest content, a 4,239px scroll, a state bug  |
| Explain panel   | 7     | The best thing in the product; plain chrome    |
| People list     | 5     | A plain HTML table with wrapping cells         |
| Profile         | 5     | Weaker summary than Manar's profile            |
| Payslip         | 6     | Clean; the card floats in empty space          |
| Phone Home      | 5     | Headline and caveat use up the fold            |

## 2. What an Apple review would reject, screen by screen

### Home (desktop, 1440): 6/10

- **Hierarchy.** The fold has three competing loud elements: the 32px
  two-line headline, the 64px net-pay figure, and the filled teal "Enter
  bank details" button. The headline and the number say the same thing
  twice. Apple picks one hero per view.
- **Hero-card density.** One card holds the number, a 2-line pension
  caveat in link-blue, the "Net pay to 31 people" sentence, the preparer
  and approver line, "Sources", a 5-row breakdown, and a 5-step progress
  bar. That is about 14 text runs in one container. Cut it to at most 6.
- **Colour.** The pension caveat is set in link-blue with an info icon,
  so it reads as a link but is not one. "Sources" is teal, "8 open
  issues" is amber, "Now" is teal, "12 days" is amber, and the icons are
  red and amber. Seven coloured text runs on one fold.
- **Copy.** "Sample dates" is a note to the developer, and it is on the
  screen. "Held out (no IBAN)" mixes a bank term with a bracketed aside.
  The headline runs to 2 lines at 1440px and 3 lines on a phone.
- **Empty areas.** In the full-page shot, the left column ends at "5
  more to review" (y about 1050) while the Approvals column runs on to
  y about 1180. That leaves a dead 130px hole, and then the next row
  starts. Two columns of unequal height in one row is a layout bug, not
  whitespace.
- **The department chart.** Nine bars, one dark and eight pale teal, at
  the bottom of the page. It shows no decision. Apple would move it to a
  report or cut it.
- **Dark mode.** The demo banner turns light grey (#e5e5e5-like) on a
  near-black page. It is the brightest thing on screen, so it pulls the
  eye first. The bright teal button with dark text is fine.

### Pay run (Review, Fix, Approve, Pay; 1920): 5/10

- **Length.** Review is 4,239px tall at 1920 wide. The table of 31 rows
  shows a green "In the file" on 29 of them and "No change" on 25. That
  is the same message 54 times. Apple shows the exceptions and puts the
  rest behind a disclosure.
- **A state bug.** On Approve, "Approve pay run" is disabled and a red
  banner says the run waits, yet "Continue to Pay" in the footer is a
  live filled button. Two primary buttons give opposite answers. An
  Apple review would stop here.
- **Grid.** At 1920, the header logo starts at x of about 372, but the
  pay run content starts at x of about 232. People, Profile and Payslip
  line up at 372. Containers differ by page: 760, 960, 1000 and 1080px
  are all in the CSS. The page edge moves as you navigate.
- **Fix cards.** Each issue is a bordered card holding a coloured dot
  and label, a name on the right, a body line, a "Next step" label and a
  button. There are 8 cards, each with a border, and "Next step" is
  repeated 8 times. Use one inset grouped list.
- **The side rail.** "How the figures are worked out" sits on every step
  at about 340px wide. It repeats what the dotted underlines already
  offer, and on Fix it is taller than the useful content beside it. It
  is a permanent tutorial.
- **Copy that leaks the build.** "(secondary-sourced; the 85% payment
  test is not applied in this demo)". "Demo bank code" appears as a Note
  on the Pay step. "Based on UAE mainland rules, as we read them" appears
  4 times across the flow.
- **Phone.** On the Pay step at 393px, the stepper becomes 4 rows of
  about 66pt each. The fold shows the stepper, the word "Pay" and "Back",
  but none of the content of the step.
- **Motion** (judged from CSS and the 2 fps sheet). Steps swap with fades
  of 150 to 250ms. The stepper does not visibly travel, and the salary
  file total is not visibly animated when an IBAN is saved. The total
  changes, but the change is not shown. The Undo toast is good.

### Explain panel: 7/10

- **Strengths.** A clean right drawer at 560px with a numbered working,
  inputs with their sources, and rules tagged by kind. This is the
  product's signature, and no UAE payroll tool shows its working like
  this.
- **Rejections.**
  - Row text is set at 17px with 52px row height inside a 560px drawer,
    so step 4 wraps to 3 lines. Use 15px text and a numeric column
    120px wide.
  - "Convention / engine convention, not law" is internal language.
  - Each rule sits in its own bordered box, so there are 3 boxes inside
    a drawer inside a page.
  - On the phone, the gratuity "Not worked out here" block is a
    full-width cream box with 4 bullets at about 20pt. It reads as a
    legal warning, not an explanation.
  - The drawer does not visibly connect to the figure that opened it.

### People list (1080): 5/10

- **It looks like a default table.**
  - The department filter is a native `<select>` with the browser's own
    chevron.
  - The search focus ring is the browser-blue 2px outline, and the clear
    "x" is a saturated blue. Neither matches the teal accent.
- **Wrapping.** "Information technology" and "Khalidiya branch" wrap to
  2 lines, so rows are 52px or 60px depending on the data. The rhythm is
  broken 9 times on one screen.
- **Columns.** Staff number is the right-most column and gets as much
  weight as the name. "Active" with a green dot appears 29 times. Show
  status only when it is not Active, as the phone list already does.
- **No overview.** There is no count by status and no "needs attention"
  filter. The profile shows open items, but the list gives no hint of
  them. Manar's People dashboard (headcount, on leave, documents
  expiring) gives more at a glance.
- **Search result.** "al ain" returns Rafiq Hossain (Head office) with no
  sign of why he matched.

### Profile (1080): 5/10

- **No summary.** The name block is 30px with a 64px monogram, then the
  page drops straight into "Open items". Manar's profile opens with 3
  KPI tiles (monthly pay, leave left, years of service). Ours has to be
  scrolled to find the same facts. On this screen we are behind the 3/10
  product.
- **Label conflict.** Overtime is "To fix" (amber) on the profile but
  "Check before approving. These do not stop the run" on Fix. One issue
  has two severities.
- **Type.** Body text is 17px and key-value text 17px, while labels are
  15px grey. The key-value table runs 434px wide but wraps the email
  address. Five sizes between 15 and 19px are in use on one screen.
- **Empty area.** At 1080 the right column ends at about y 1110 and the
  left at about 1260. On the phone, the 12,450 hero figure collides with
  the tab bar.

### Payslip (1080): 6/10

- **Strengths.** A calm card at 756px, a heavy 2px rule above Net pay,
  dotted underlines that work.
- **Rejections.**
  - The card is centred while the breadcrumb and title sit at x of about
    582. On a 1920 screen there is about 580px of empty grey on each
    side, with nothing in it.
  - Earnings rows use 20px labels against 15px amounts, so the labels
    shout and the money whispers. That is backwards on a payslip.
  - Every amount has a dotted underline, so the affordance turns into a
    texture.
  - There is no employer header, no period chip and no "download PDF".
    It does not feel like a document you could hand to an employee.

### Phone Home (iPhone 15 Pro): 5/10

- **The fold.** The banner (39pt), header (85pt), 3-line headline,
  full-width button, then the number, a 3-line blue caveat, the
  preparer and approver lines, and "Sources". The progress bar and every
  issue are below the fold.
- **Tab bar.** It shows 2 tabs (Home, Search) here, 3 on the pay run
  shot and 4 on People. Role may explain part of this, but the shots mix
  build rounds. Check which is the real behaviour. Either way, a tab bar
  that changes its count between screens feels broken.
- **Type.** The headline is about 34pt in bold. Apple's Large Title is
  34pt but one line long, such as "Home". Ours is a 3-line sentence at
  that size.
- **Motion.** None visible in stills. The tab bar is a flat 1px-ruled
  strip, not a floating material bar (the plan notes a floating pill as
  a common pattern in the reference apps).

## 3. The 15 highest-leverage changes, ranked

All of these fit React, Vite and CSS. Only items 11 and 12 assume GSAP
or the View Transitions API, which the bundle already uses
(`startViewTransition` appears 5 times). The values are proposals for
the owner's calibration.

1. **Rebuild the type scale (desktop and phone).** The current default
   set is 14, 15, 16, 17, 19, 22, 26, 32 and 64px: four sizes inside
   3px. Replace it with 6 steps:
   - caption 12/16 (weight 500)
   - secondary 13/18
   - body 15/22
   - headline 17/24 (600)
   - title 22/28 (600)
   - large title 28/34 (700, tracking -0.02em)
   - display 56/56 (300) for the hero figure only

   Use weights 400, 500 and 600 only. On phone, body is 17 and display
   is 48. Expected effect: about 30% denser without feeling cramped.
2. **One container, one grid.** Every page uses a max-width of 1200px,
   12 columns, 24px gutters and 32px side padding, with the header in
   the same container. The pay run should no longer start 140px left of
   the logo. Narrow reading pages (payslip) take 8 columns, starting at
   the same left edge, not centred in empty space.
3. **Fix the Approve state bug.** "Continue to Pay" is disabled
   (opacity 0.4, `aria-disabled`) until the run is approved. One primary
   button per view. A blocked step shows no primary button at all.
4. **Home fold to 3 elements.**
   - A one-line headline of 40 characters or fewer, at 28px, for
     example "2 bank details hold October pay".
   - The display figure, with one 13px line under it ("31 people, pays
     30 Oct").
   - The progress bar.

   Move the pension caveat into a 13px footnote with a tooltip. Remove
   "Sources" from the hero (it becomes the dotted underline on the
   figure) and remove "Sample dates" from the screen. Move the CTA
   inline into the first issue row; that cuts one competing primary
   button.
5. **Review shows exceptions only.** Show the 6 changed rows and the 2
   held rows, then a "Show all 31 people" disclosure (44px row, chevron
   that rotates 90 degrees in 200ms). Show salary-file status only when
   it is not OK. The page drops from 4,239px to about 1,500px.
6. **Inset grouped lists instead of bordered cards.** One container with
   radius 12, surface-raised, and 1px separators inset 16px from the
   left. Rows have 14px vertical and 16px horizontal padding. Severity
   is an 8px dot only, with no coloured label text. Remove the repeated
   "Next step" label and set the next step as a 13px secondary line. The
   action is right-aligned, 32px tall.
7. **Retire the permanent "How the figures" rail.** Give the 340px back
   to content. Teach the dotted underline once, with a coachmark on the
   first figure (dismissed for good once closed). Keep dotted underlines
   only on derived figures (overtime, gratuity, capped loan, net), not
   on every amount. Basic salary does not need one.
8. **Colour discipline (60-30-10).**
   - Accent teal (#0E5C63 light, #5BC0C8 dark) is for interactive
     things only.
   - Success has one green, used only for "Done".
   - Red is for blockers only. Amber is for time-bound warnings only.
   - Limit: 3 coloured text runs per viewport. Remove link-blue entirely
     (the pension caveat).
   - Dark mode: page #0B0B0C, raised surface #1C1C1E, separators
     rgba(255,255,255,0.08), banner #1C1C1E with 60% white text.
9. **Copy purge, one pass, with a banned list.** Remove:
   "secondary-sourced", "85% payment test", "engine convention, not law",
   "Convention", "Sample dates", "Demo bank code" (as a Note), and every
   repeat of "as we read them" after the first. That line becomes one
   12px footer line per page. Make the severity words the same
   everywhere: "Stops pay" and "Check".
10. **People list made native-feeling.**
    - A custom select (button plus popover with a 160ms scale from 0.96
      and fade) instead of a native `<select>`.
    - A focus ring of 2px teal at 3px offset.
    - Rows a fixed 48px, with `white-space: nowrap` and ellipsis on
      Department and Branch. Staff number goes to a 13px line under the
      name.
    - Status column shows only non-Active states.
    - A segmented control above the list: "All 31 / Needs attention 3 /
      Leavers 1".
11. **Animated figures (GSAP, about 3kB of work).** When a total changes,
    roll it digit by digit over 600ms with `power3.out`, using
    `font-variant-numeric: tabular-nums` so the width holds. Apply it to:
    the salary file total (908,430.94 to 933,730.94 after an IBAN), net
    pay, "8 open issues" to 7, and the step label "2 to fix" to "1 to
    fix". Under reduced motion, crossfade over 120ms.
12. **Spatial step transitions.**
    - The stepper is one persistent element. The active ring slides
      between steps (transform, 320ms, cubic-bezier(.32,.72,0,1)) and
      the connecting line fills left to right over the same 320ms.
    - Content moves 24px on the x-axis with opacity, 280ms, in the
      direction of travel. Mirror it for RTL.
    - Use the existing view-transition names on the stepper and the page
      title so they do not re-render.
    - Under reduced motion, a 120ms fade only.
13. **A profile summary strip.** Under the name, 3 stats in one row with
    no boxes: Net pay October, Annual leave left, Years of service. Each
    has a 13px label and a 28px figure, with 48px between them. Open
    items follow as an inset grouped list (item 6). Employment details
    move to a 2-column key-value grid (13px labels, 15px values,
    140px label column).
14. **The phone shell.**
    - A floating tab bar: 4 fixed tabs (Home, Pay run, People, Time
      off), 64pt tall, 16pt from the bottom, radius 32. Background
      blurred 20px over 72%-opaque surface, with a 0.5px hairline.
    - Search moves to a header icon.
    - The phone stepper becomes one 44pt bar of 4 dots with the current
      step name, not 4 rows of 66pt.
    - The demo banner is 24pt at 12pt text.
15. **Elevation and radius tokens.** Today: panel radius 10, control
    radius 6, with borders everywhere. Proposed:
    - radius-sm 8 (inputs, buttons), radius-md 12 (grouped lists),
      radius-lg 20 (drawers, sheets).
    - Raised surfaces use a shadow, not a border:
      `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)` light;
      dark mode uses surface colour only.
    - Borders survive only on inputs.

## 4. Three signature interactions

These are candidates for the owner's calibration (plan step 2). None of
them is a round-2 element the plan excluded.

1. **"Fix it and watch the money move."** Type an IBAN inline on Home or
   Fix. The held row collapses (height to 0, 240ms), the salary file
   total rolls up by AED 25,300.00, the issue count ticks down, and the
   Fix step ring turns into a check.
   - **Already exists:** inline IBAN entry, validation that refuses a bad
     IBAN, totals that update, and an Undo toast.
   - **Missing:** the roll, the collapse, the ring morph (items 11 and
     12).

   This is the demo's best 10 seconds and it is currently shown with a
   hard cut.
2. **"Tap any number, see the working."** The tapped figure flies into
   the drawer header (a shared-element view transition, 320ms). The
   numbered steps appear with a 40ms stagger (opacity and 8px y). The
   input that matters (for example "6 hours") is underlined in the
   accent colour within its step.
   - **Already exists:** the drawer, the working, sources and rules, on
     desktop and phone.
   - **Missing:** the connection between the figure and the drawer, the
     stagger, and the tighter type (item 1).

   This is the one thing no competitor has. Make it feel inevitable.
3. **The search that acts (⌘K).** Type "Priya" and get "Enter IBAN for
   Priya Nair" as the first result, with Return to act. Type "waiting on
   Khalid" and get the 2 items waiting on him.
   - **Already exists:** the ⌘K search field and live filtering on
     People ("5 of 31").
   - **Missing:** results that are actions, a palette surface (radius
     20, 640px wide, scale from 0.98 over 180ms) and keyboard-first
     flow.

   It also answers "easy navigation, no long sidebar" directly: the
   palette is the navigation.

## What not to do

- Do not add gradients, glass on content cards, illustrations or
  particle effects. The brief says "not AI-looking", and these are the
  marks of AI-made UI. Apple's advanced feel comes from type, spacing
  and motion that follows the user's action.
- Do not polish all screens at once. Following the plan's step 5, take
  Home and Fix to 9 first. Changes 1, 2, 3, 6, 8, 9, 11 and 12 cover
  both of them.
