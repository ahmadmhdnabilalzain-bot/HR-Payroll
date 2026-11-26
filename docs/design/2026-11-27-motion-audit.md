# MubinFlow motion audit: frames, not stills

Date: 2026-11-27. Reviewer: motion and visual critic. Read-only audit of
branch `claude/quirky-wozniak-b7xkvr` at 7f278e1: no product code was
changed. The earlier critiques scored stills. This one scores frame
sequences taken along the click script
(`docs/demo/2026-11-27-click-script.md`).

The bar is the owner's: "Apple-grade, not a basic app", with the
restraint a bank expects. The house rule in `2026-11-27-rescore.md`
still holds: cinematic motion belongs only to the opening, the
bank-detail fix, "Why this number" and the sign-off stamp. Everything
else should move only to explain a change. None of the upgrades below
adds decoration.

## Scores

| # | Dimension | Score |
|---|---|---|
| 1 | Continuity | 5 / 10 |
| 2 | Data in motion | 5 / 10 |
| 3 | Feedback | 6 / 10 |
| 4 | Depth and light on hero surfaces | 5 / 10 |
| 5 | Signature moments | 6 / 10 |
| 6 | Discipline | 5 / 10 |

Overall: about 5.3. The motion engineering is careful: a spring-sampled
flight helper, FLIP lists, reduced-motion paths in every module, and
integer tweens that keep floats away from money. The weak points are
seams. Steps and records show blank frames between pages. The odometer
shows numbers that never existed. The sign-off is quiet on Home, which
is where the script signs.

## Method

- Production build (`vite build`), `vite preview` on port 4553, Chrome
  headless with SwiftShader WebGL, 1440x900 (opening also at 1280x720).
- CDP `Page.startScreencast` (JPEG, every frame) for sequences, with
  frames every 16-50 ms in UI transitions. CDP `Page.captureScreenshot`
  with `clip.scale: 2` for depth stills.
- A `requestAnimationFrame` logger inside the page recorded frame gaps
  during every capture. A text sampler recorded what screen readers
  get.
- A second pass ran with `prefers-reduced-motion: reduce`.
- Scripts and frames are in the session scratchpad, not in the repo.

Measurement notes:

- Screencast frames can arrive out of order. All timings below are
  sorted by frame timestamp.
- Times count from the first screencast frame, not from the click.
  Spans between frames are exact; "after the click" is approximate,
  give or take about 50 ms.
- Headless SwiftShader cannot judge dropped frames on real hardware.
  The opening's long frames (worst 433 ms at 1440, 533 ms at 1280) are
  software WebGL and are not counted against the app. In UI
  transitions the worst gap was 17-83 ms. The 50-83 ms gaps cluster on
  page navigations (row to record, role switch, step change). Recheck
  them on the presenting laptop before believing either way.

## Frame evidence by moment

### Opening (#/welcome, laptop only)

- About 10.2 s from first paint to Home: a stroke draws, the "MubinFlow"
  wordmark writes on, then four scenes with 3D cards on a ribbon, a
  closing card, a fade to paper, then Home.
- The 56px title does not clip at either size. The widest scene title
  measured 482 px, with scrollWidth equal to clientWidth on every line.
  - "Problems found before they cost you." wraps to three lines at
    both 1440x900 and 1280x720, because `max-inline-size: 16ch`. Three
    of the four scene titles wrap. That is acceptable, but the three-
    line one is the heaviest frame of the film.
  - At 1280x720 the second body line ("before the salary file
    leaves.") sits on the top edge of the ribbon (frame at 4497 ms).
    This is cosmetic, not a blocker.
  - At 1280x720 "Open the demo" clears the dark ribbon by about 12 px.
- Handoff to Home goes through one empty paper frame (about 9.3 s).
  Home then appears whole, and its trend line draws in again over about
  900 ms. The wordmark does not land in the top bar logo. The film's
  last figure (AED 933,730.94 in the file) gives way to Home showing
  AED 908,430.94 in the file. That is true to the story, but nothing
  says so.

### Home to "Why this number" (drawer)

- The drawer is in place within the first changed frame (about 130 ms).
  It then slides only a few pixels (`slide` keyframes, 380 ms,
  cubic-bezier(0.2, 0.8, 0.2, 1)), over a dimmed scrim.
- A clone of the figure flies from the hero to the drawer header
  (`FLIGHT_MS = 380` in `Explain.tsx`). Frame evidence:
  - The clone is born at the drawer size (28px), not at the hero size
    (56px). In the first flight frame it sits next to the full-size
    hero figure and on top of the "Why this number" pill, so the two
    texts overlap for one frame.
  - At 330 ms the clone leads the still-sliding drawer by about 22 px:
    "AED" hangs outside the panel edge. It lands aligned at about
    400 ms.
  - The hero figure stays fully lit, so two copies of the same number
    are visible throughout.
- Verdict on the 28px figure: it still reads as a moment, but a small
  one. At 28px it has the same visual weight as the panel title "Net
  pay, whole run", and the flight is a translation of small text. The
  moment came from the size change, which no longer happens on screen.
  See upgrade 3.
- Close: 233 ms, a fade and slide-out, with one 50 ms frame.

### Bank-detail fix on Home (Priya, then Juma)

Priya:

- About 0-130 ms: a "+AED 25,300.00" chip leaves the form.
- About 130-420 ms: it flies on the spring (`FLIGHT_MS = 420`) into "In
  the salary file".
- For about 4 frames after landing, the chip covers the figure. Then
  chip and figure cross-fade for about 2 frames, and both texts are
  legible on top of each other.
- The form collapses and "Held out" snaps to "None" (160 ms fade). The
  headline goes "2 bank details" to "1 bank detail" as a cut to nothing
  and then a 250 ms fade-in.
- The salary-file figure then rolls 908,430.94 to 933,730.94 over
  about 700 ms (`RollDigits`, cubic-bezier(0.2, 0, 0, 1), 30 ms column
  stagger).

**Numbers shown mid-roll that never existed.** `RollDigits` moves each
digit strip straight from its old digit to its new one. In 908,430 to
933,730 the thousands column runs 8, 7, 6, 5, 4, 3 (downwards) while
the ten-thousands column runs 0 to 3 (upwards), each on its own delay.
Frames show 905,530 (below the starting value), 915,630, then 925,630
followed by 924,730 (the total going backwards), before settling. For a
payroll demo in front of a bank, a total that dips under its start, or
counts backwards, is the one motion bug a GM may notice. Screen
readers get the true value at once (visually hidden text), so this
affects sight only. Reproduced on the pay run's Fix step (frames show
9_4,_30 mid-roll).

Juma: the issue row leaves with no collapse and the list jumps up in
one frame. The next row fades in. The toast is replaced with a fade.
The hero, which now reads "ready for sign-off", is scrolled out of
view, so the payoff of the fix is not seen. "Waiting for a decision"
4 to 5 snaps.

### Role switch (HR to GM)

- A whole-page view-transition cross-dissolve, with the scroll reset
  to the top. Frames 2-3 show two different layouts double-exposed.
  The scrolled issue list and the toast ghost over the new hero. The
  top bar dissolves too, although only the role label changes.
- The Home trend line then redraws from zero (900 ms) on every switch.
- One 67 ms frame.

### Sign-off on Home (GM, "Sign off October pay")

- There is no stamp on Home. The headline cuts to an empty frame
  (95 ms), then fades in "October salary file is next" over about
  250 ms. The step line text changes without motion. "Waiting for a
  decision" 3 to 2 snaps.
- `SignStamp` only plays on the pay run's Sign-off step.
  - There it lands in about 3 frames (240 ms, 1.06 to 1 with a fade)
    on a card about 140x50 px, and the ring is barely visible.
  - The right-hand card loses "Send back" and the note in the same
    frame, so the card height jumps.

### Pay run step changes (Review to Fix)

- 0-54 ms: the old step is still at full opacity.
- About 100-380 ms: the body is **blank**. The stepper pill morphs
  nicely (320 ms, cubic-bezier(0.2, 0.8, 0.2, 1)) and nothing else is
  on screen.
- About 380-560 ms: the Fix step fades in (`swap-in` 280 ms).
- A warm repeat (chunk already loaded) still showed about 280 ms of
  blank, so a cold lazy chunk is not the cause. The sequence is the
  200 ms `LEAVE_MS` timer in `useGoStep`, then a key change that
  remounts the step. The empty window matches the mock API's 250 ms
  default latency (`api/mock/options.ts`) behind the step's queries.
- About 650 ms in all, of which roughly 40 per cent is empty paper.

### Row to record (People list to person)

- The view transition is meant to fly face and name into the record
  header (280 ms, cubic-bezier(.32,.72,0,1), `listMotion.ts`).
- In frames, the list goes blank for 1-2 frames (117-133 ms cold,
  186-219 ms warm). The record then fades in at its final layout. No
  face or name is seen travelling.
- The new snapshot appears to be taken before the record's data has
  arrived, so the shared elements have nothing to pair with.
- 4 frames of 50-83 ms in both runs.
- Back: the same pattern in reverse (487 ms).

### Tabs, section changes, panels, palette

- Section changes (top bar, Cmd K results, Pay to Reports) are hard
  cuts in the first changed frame (67 ms).
- Group tabs change background colour over 150 ms, with no moving
  indicator. Content cuts.
- Section panels open with `sheet` and `rise` (200 ms), about 12
  frames.
- The command palette opens with `in` and `rise`, 160 ms on
  cubic-bezier(0.32, 0.72, 0, 1).
- The Executive dashboard shows "Loading the report" text for about
  150 ms, then the page.

### Charts and figures changing

- Home trend: the line draws (900 ms, power2.inOut), then the area, the
  tail and the dot. This replays on every Home mount, including after
  each role switch.
- Variance waterfall:
  - Bars grow with a stagger (600 ms, power3.out, 40 ms stagger).
  - Mid-growth, the waterfall does not add up. The "Leaver" bar floats
    to the right of the still-growing "Sep gross" bar, with a visible
    gap, for about 300 ms. "Oct gross" is visibly short until the very
    end.
  - The headline −AED 14,719.06 is static.
- Executive:
  - The KPI tiles are static.
  - The month-on-month change bars appear fully drawn (`ChangeBars.tsx`
    has no motion).
  - Department bars grow over 600 ms, and the KPI sparklines only start
    drawing at about 800 ms.
  - Three systems run on three clocks, so the page settles in pieces.

### Hide amounts

- A hard cut: every figure turns to dots in one frame, with no motion
  (13 frames over 351 ms, all identical after the first).

### Toasts

- In: `rise`, 200 ms. A second toast replaces the first with a fade.
- Out: none. Between two frames 404 ms apart, the toast is simply gone.

### Hover and press

- Primary button: colour 150 ms, and `:active` scale(0.97) over 150 ms
  with --ease-out. It reads well and is consistent across button, top
  bar and pay run.

### Reduced motion

Respected everywhere sampled:

- Flights become a 120 ms fade.
- The drawer settles in 8 frames.
- The role switch takes 4 frames, with no view transition.
- Charts appear drawn.
- `base.css` clamps every CSS animation to 0.01 ms.
- The opening shows a still (`mayPlay()` checks for reduced motion).

## Components with no motion at all

- Hide amounts toggle (all figures).
- Toast exit.
- Group tabs and section tabs: no indicator, and content cuts.
- Section-to-section navigation (all hard cuts, except list to record
  and role switch).
- Executive KPI tiles and `ChangeBars` (month-on-month bars).
- Step tracker on Home: colour only, and the step label text cuts.
- Count chips ("Waiting for a decision", "6 to review", "2 items block
  sign-off"): they snap.
- The Variance headline figure.
- The issue list on Home and Fix when an item resolves: no height
  collapse, and the list jumps.
- The sign-off on Home: no stamp.
- Profile page tabs and record header (beyond the page fade).

## Durations and easings in use

Tokens (`theme/tokens.css`, mirrored in `demo/motion.ts`):

- `--dur-fast` 150 ms, `--dur-base` 200 ms, `--dur-slow` 250 ms.
- `--ease-out` cubic-bezier(0.23, 1, 0.32, 1), `--ease-in-out`
  cubic-bezier(0.645, 0.045, 0.355, 1).

Hard-coded durations outside the tokens (about 16 distinct values):

| ms | Where |
|---|---|
| 120 | fades: list fallback, Explain, flight reduced motion, Roll |
| 160 | palette, Picker pop, flight land fade, CardIban, hero held |
| 240 | SignStamp |
| 280 | list view transition, Payslip lift, sheet, pay run swap-in |
| 320 | RunBar fill and colour, PayRun hint (600 ms delay) |
| 380 | Explain flight |
| 400 | Welcome fade, Toast same-step |
| 420 | flight.ts spring, hero flex-grow, dash rise |
| 560 | stamp ring |
| 600 | ROLL_MS (GSAP), Chart, TrendChart, Bars, useRoll |
| 700 | RollDigits, Welcome opacity |
| 900 | NetTrend, Sparkline, timeoff `arrive` |

Easings in use, about ten:

- The two tokens.
- cubic-bezier(0.32, 0.72, 0, 1): list, templates, palette.
- cubic-bezier(0.2, 0.8, 0.2, 1): Explain, Payslip, RunBar, stamp.
- cubic-bezier(0.2, 0, 0, 1): RollDigits, hero flex-grow.
- cubic-bezier(0.4, 0, 1, 1): Explain close.
- Plain `ease`, `ease-out` and `linear`.
- A spring sampled to `linear()` (`flight.ts`).
- GSAP power3.out, power2.inOut, power2.out and "none".

Inconsistencies:

1. Two flights with two clocks: Explain at 380 ms on a bezier,
   bank-detail at 420 ms on the spring. They are the same gesture, a
   number travelling to where it is explained or counted.
2. Two roll engines that behave differently.
   - `useTweenedBigint` (GSAP, 600 ms, power3.out, integer steps)
     passes only through true intermediate values.
   - `RollDigits` (CSS odometer, 700 ms, 30 ms stagger) does not, and
     it is the one used on the hero surfaces.
3. Three chart clocks on one dashboard: bars at 600 ms, sparklines
   starting at 800 ms, change bars instant.
4. Leave and enter run in sequence (200 ms out, wait, 280 ms in)
   instead of overlapping, which leaves blank frames.
5. The stamp, the most important "done" in the product, is the
   shortest animation in the file (240 ms) and the smallest surface.

## Ranked upgrades

Each upgrade names the component, the motion, and the timing, and
says which score it moves. They are ordered by how much they move the
demo for the bank.

1. **Monotonic odometer.**
   - Where: `ui/RollDigits.tsx` and `RollDigits.module.css`.
   - What: drive the displayed value from one integer tween
     (`useTweenedBigint`, which already exists), and let the strips
     follow that value, so every frame shows a real amount between
     start and target. Keep the rightmost-first feel by easing, not by
     independent columns.
   - Timing: 600 ms, power3.out, or the shared `--ease-out`.
   - Moves: 2, 6 (removes the only wrong-number defect).
2. **No blank frames between steps and records.**
   - Where: `payrun/PayRun.tsx` (`useGoStep`) and
     `ui/templates/listMotion.ts`.
   - What: prefetch the next step's and record's queries on hover,
     focus or click (React Query `prefetchQuery`) and await them before
     swapping. Overlap leave and enter: the old step fades and slides
     8 px out while the new one comes 8 px in.
   - Pay run: the step slides along `data-dir`. On list to record,
     start the view transition only after the record has data, so the
     face and name pair.
   - Timing: 240 ms total, leave 120 ms and enter 200 ms overlapped,
     `--ease-out`. List to record keeps 280 ms on
     cubic-bezier(.32,.72,0,1).
   - Moves: 1, 6.
3. **"Why this number" as a true size morph.**
   - Where: `components/explain/Explain.tsx` and `ui/flight.ts`.
   - What: start the clone at the hero's font size and rect (scale from
     56/28 = 2.0 to 1 via transform, not font-size). Dim the source to
     0.35 while in flight, and restore it on close. Target the drawer's
     final rect only after its slide ends, or fly within the drawer's
     coordinate space, so "AED" never hangs outside the panel.
   - Use the shared spring.
   - Give the landed figure 4px more leading and the drawer title one
     step smaller, so the 28px figure leads the panel again.
   - Timing: 420 ms spring (k 300, c 30), the same as the bank-detail
     flight.
   - Moves: 1, 5, 6.
4. **Sign-off stamp on Home, and a larger stamp.**
   - Where: `home/StatusLead.tsx` and `PayRunHero`, `ui/SignStamp.tsx`.
   - What: when the GM signs on Home, land a `SignStamp` (name, role,
     time) in the hero beside the figure before the headline changes.
     Then morph the headline. On the pay run, scale the stamp card to
     the timeline width, and animate the right card's height change
     (FLIP) instead of a jump.
   - Timing: stamp 320 ms, 1.08 to 1, cubic-bezier(0.2, 0.8, 0.2, 1).
     Ring 600 ms. Headline swap starts at 280 ms. Card height 250 ms
     `--ease-out`. No sound, no confetti.
   - Moves: 3, 5.
5. **Chip lands, then hands over: no overlap.**
   - Where: `ui/flight.ts` and `home/CardIban.tsx`, PayRun Fix.
   - What: land the chip on the figure's end edge (`align: "end"`) at
     its own size. Shrink it to 0.6 and fade it over 120 ms while the
     roll starts in the same frame. Never cross-fade two legible
     amounts.
   - Order on the pay run Fix step: resolve, then flight, then row
     moves to "Fixed" (FLIP 250 ms). Today the row reorders before the
     chip has left.
   - Timing: 420 ms flight plus 120 ms hand-over; roll as in 1.
   - Moves: 2, 3.
6. **Role switch: hold the frame, change the content.**
   - Where: `demo/actions.ts` (switch) and `shell/TopBar`.
   - What: give the top bar and page head `view-transition-name` so
     they stay put. Scroll to top before the snapshot. Replace the
     cross-dissolve with a fade-through on `main` only: out 120 ms,
     in 200 ms. Do not replay the Home trend draw on a role switch;
     draw only on the first Home of the session.
   - Moves: 1, 6.
7. **Coherent chart builds.**
   - Where: `reports/dash/*` and `home/NetTrend.tsx`.
   - Waterfall: grow each bar from the previous bar's end, so it adds
     up on every frame. Run it as one timeline of 600 ms, power3.out,
     40 ms stagger, with labels at 450 ms.
   - Executive: tiles, change bars, department bars and sparklines on
     one 600 ms timeline, starting together. Add the missing
     `ChangeBars` grow (from the zero line, 500 ms).
   - Variance headline: a monotonic roll from 0 (the same engine as 1).
   - Moves: 2, 6.
8. **Hide amounts as a deliberate privacy gesture.**
   - Where: `ui/Money.tsx`, `Money.module.css` and `RollDigits`.
   - What: digits blur to 6px and fade, while the dots fade in on top
     in the same box (no reflow). Reverse on show. Stagger by 0 ms; it
     is one gesture.
   - Timing: 180 ms, `--ease-out`; reduced motion is an instant swap.
   - Moves: 2, 3.
9. **Lists that close their gaps.**
   - Where: `home/IssueList` and PayRun Fix list (`useFlip` exists).
   - What: a resolved row collapses height to 0 (200 ms `--ease-out`)
     while the rows below FLIP up (250 ms). Count chips ("6 to review",
     "Waiting for a decision") count with `useTweenedNumber`. On Home,
     after the last fix, scroll the hero back into view (smooth,
     400 ms) so the "ready for sign-off" sentence is seen changing.
   - Moves: 1, 2, 3.
10. **Toast exit, tab indicator, depth on the hero.**
    - Toast (`ui/Toast.module.css`): exit 160 ms, 8 px down and fade,
      before unmount.
    - Group tabs (`shell/GroupTabs`): one shared pill that slides
      between tabs, 250 ms `--ease-out`. Content cross-fades in 150 ms.
    - Hero card and drawer: add a 1 px inner top highlight (inset
      white at 60 per cent in light, 6 per cent in dark) and a hairline
      border, so the two-layer 4 and 6 per cent shadow reads as lit.
      Raise the hero shadow by one step while a flight lands on it
      (200 ms).
    - Moves: 3, 4.

Also worth doing, below the line:

- Opening: land the closing wordmark in the top bar logo (400 ms,
  `--ease-in-out`) instead of fading to an empty paper frame.
- Opening: allow 18ch for the three-line title, or shorten it to two
  lines.
- Opening: lift the scene copy 24 px at heights under 760 px, so the
  body line clears the ribbon at 1280x720.
- Tokens: add `--dur-flight: 420ms`, `--dur-roll: 600ms`, and
  `--ease-spring` (the sampled `linear()`), and fold the 120, 160, 280,
  320 and 380 ms one-offs into tokens. Keep three easings: --ease-out
  (UI), --ease-in-out (on-screen moves), and the spring (travelling
  figures).

## Blockers for the meeting

- None that stop the demo.
- Highest risk on screen: the odometer showing totals below their start
  and counting backwards during the bank-detail fix, which is step 2 of
  the script (upgrade 1).
- Second: blank paper for about 280 ms on every pay-run step change and
  record open (upgrade 2).
- Opening title: no clipping at 1440x900 or 1280x720. The three-line
  wrap and the body line on the ribbon at 1280x720 are cosmetic.

## Not captured

- The e-signature sign sheet (the Signatures list opened; the sheet
  itself was not driven).
- Profile tabs (the record has none at this build).
- Dark mode transitions.
- The theme-toggle view transition.
- Phone widths.
- Real-GPU frame pacing.
