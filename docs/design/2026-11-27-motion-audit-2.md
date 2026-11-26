# MubinFlow motion audit 2: the merged motion branch, frame by frame

Date: 2026-11-27. Branch `motion`: `claude/quirky-wozniak-b7xkvr` plus
m1 (shell), m3 (money roll, chart motion), m4 (signature moments) and m2
(lists, records, pay run steps), merged in that order. The first audit
(`2026-11-27-motion-audit.md`) scored 5, 5, 6, 5, 6, 5. This pass takes
frames along the same click script
(`docs/demo/2026-11-27-click-script.md`) and adds the two things the
first one missed: dark mode and the e-sign sheet.

## Scores

| # | Line | Audit 1 | Now |
|---|---|---|---|
| 1 | Continuity | 5 | 7 / 10 |
| 2 | Data in motion | 5 | 8 / 10 |
| 3 | Feedback | 6 | 7 / 10 |
| 4 | Depth | 5 | 7 / 10 |
| 5 | Signature moments | 6 | 8 / 10 |
| 6 | Discipline | 5 | 7 / 10 |

Overall about 7.3 (from 5.3). The two defects a bank would notice are
gone: no step or record shows a blank page, and no rolling total ever
shows a number that did not exist. What is left are seams of one to
four frames (double exposures, a few one-frame layout jumps) and three
moments that are slower or more crowded than they should be.

## Result against the asserts

| Assert | Result |
|---|---|
| No blank page frame over 100 ms | Pass. Worst in-app thin stretch 50 ms |
| No frame with a third readable amount | Pass in rolls (seek, 0 bad) |
| No layout jump | Fail: 3 one-frame jumps (below) |
| Nothing broken at 393 px | Pass: scrollWidth 393 in every frame |
| Hide amounts never animates digits | Pass, laptop and phone |

The only blank frames counted were the page reload itself (250 ms of
paper while the document loads), which is not a transition.

## Method

- Production build, `vite preview` on port 4770, headless Chromium,
  reduced motion not emulated. Viewports 1440x900 and 393x852 (touch,
  mobile), light and dark (dark set through the theme control, body
  background checked as rgb(11, 11, 12)).
- For each moment: CDP `Page.startScreencast`, every frame (about 16 ms
  apart while anything moves), 250 ms of lead-in, timestamps relative
  to the click. 1,900 frames over 4 runs (laptop light, laptop dark,
  phone light, phone dark).
- In the page, per animation frame: rAF gap, horizontal overflow, text
  in `main`, and every `layout-shift` entry with its sources and dy
  (recent-input shifts included, since every shift here follows a
  click).
- Blank and thin frames: share of pixels below the top bar that differ
  from the frame's median colour. "Blank" is under 0.4 per cent;
  "thin" is under half the lower of the first and last frame. Every
  flagged stretch was then checked by eye.
- Rolls: the real WAAPI roll is paused and seeked every 5 ms from 0 to
  700 ms; per figure, each changed digit reads old, new or neither
  (opacity times the share of its ink inside the clip, 0.5 cut). A
  figure that reads old and new in the same frame fails.
- Hide amounts: every running animation paused and seeked 0 to 300 ms
  in 10 ms steps; `main`'s text may hold no amount at any step. The
  same after an IBAN save while hidden.
- Frames and scripts are in the session scratchpad, not in the repo.
- The machine was shared and loaded (load average 4 to 9 on 4 cores).
  rAF gaps of 50 to 117 ms appear in several moments; recheck on the
  presenting laptop before believing them either way.

## Frame evidence by moment

Times are ms after the click, laptop light unless noted.

### Home to the pay run, and step changes (m2)

- Home to `#/pay-run`: the section slide, no thin frame (worst rAF gap
  83 ms).
- Review to Fix: 0 to 83 ms the old step at full ink. At 100 to 116 ms
  the old step is drawn twice, about 8 px apart: the drawn copy
  (`leaveCopy` in `payrun/PayRun.tsx`) is on screen before the hash
  change has swapped the live step, so the live old step and its copy
  overlap. Every amount on the step ("933,730", "938,680", "4,950")
  reads as a smear for those 2 frames. 133 to 183 ms: copy fading, new
  step coming (thinnest frame 0.35 of the end ink, 33 to 50 ms long).
  At 150 ms the new step's heading and the old one's are both legible.
  From 183 ms the Fix step is whole; its rows reveal by 300 ms.
- Fix to Sign off and Sign off to Pay: the same shape, thin for 33 to
  50 ms, never blank. In dark the old step dims to about 40 per cent
  for 100 ms before the new one lands; still readable, no blank.
- Phone: the dots are hidden by design (the thin bar shows progress,
  links stay for keyboards). "Continue to Fix" and "Back" step with no
  thin frame.
- Audit 1 had 280 to 380 ms of empty paper here. Now none.

### People list to a person, and back (m2)

- 158 ms list at full ink; 191 ms the list dims and the record's
  figures show through (one frame of double exposure). 241 to 408 ms
  the avatar and the name travel from the row to the record header and
  land; the record is whole by 541 ms. The face and name pair, which
  audit 1 never saw.
- Back: 275 ms, the reverse; thin for 50 ms in dark only.
- Phone light and dark: no thin frame over 67 ms; no overflow.

### Tabs (m1)

- Record tabs (Employee, My profile, Details to Pay to E-signature):
  the underline glides from tab to tab over about 50 ms of travel
  (90 to 140 ms), but the panel itself cuts in the first changed frame.
  The only shift is the page foot following the panel's height
  (laptop 0.009, phone 0.012 to 0.015), not a visible jump.
- Group tabs (People, Everyone to Overview): the pill glides; the
  pages cross-fade, with one frame (about 200 ms) where both pages'
  headings and rows are legible on top of each other. Whole by 283 ms.
- Same at 393 px, no overflow.

### Why this number (m4)

- 82 to 99 ms: the scrim and the drawer arrive; the working assembles
  line by line after the drawer lands.
- 115 to 165 ms: the flying figure starts at hero size and shrinks on
  the spring (the true size change audit 1 asked for), but the source
  figure stays at full ink under it, so for about 3 frames the two
  copies of "933,730.94" stack into an unreadable mash.
- 182 ms on: the clone is clear of the source, travels into the drawer
  and lands by about 330 ms, inside the panel (no "AED" hanging outside
  the edge any more).
- Close: 280 ms, no thin frame. Phone: the same, drawer from the edge,
  thin 16 to 83 ms (light), no overflow.

### Bank detail fix on Home (Priya, then Juma) (m3, m4)

- 0 to 110 ms: the "+AED 25,300.00" chip leaves the form.
- 110 to 476 ms: it flies into "In the salary file" and lands on the
  figure's end edge at its own size.
- 510 to 593 ms: hand-over. The chip shrinks and fades over the old
  total. At 543 and 576 ms "+AED 25,300.00" and "908,430" are both
  partly legible in the same place (about 60 ms). Same amounts, no
  wrong number, but two figures cross-fading where one should be.
- 610 to 643 ms: the old total alone; "Held out" fades to "None".
- 693 to 893 ms: only the changed digits roll; mid-roll they read as
  blank, never as another digit (9_ _,_30). Lands as 933,730.94.
- Seek check (laptop and phone dark): 2 figures, 12 animations,
  141 steps, 0 frames with old and new in one figure; first frame all
  old, last all new. Audit 1's 905,530 and the backwards count are
  gone.
- Juma: same flight; the headline changes to "ready for sign-off" with
  a fade. No shift on Home.

### Bank detail fix on the pay run's Fix step

- Laptop: at the click the open IBAN form disappears in one frame and
  the rows under it move up 161 px (layout-shift 0.038). Phone: the
  same jump is 253 px (0.20). Then the flight and roll run as on Home,
  and the row reappears under "Done, Fixed" by about 784 ms.
- This is the largest layout jump left in the demo.

### Role switch HR to GM (m1)

- The menu item is chosen at 0 ms; the menu stays on screen until
  about 520 ms, over the switching page.
- 340 ms: the page is already at the top (scroll reset before the
  change). 457 ms: one frame with both headlines legible ("ready for
  sign-off" and "waits for your sign-off"); the top bar holds still.
- 523 ms: GM Home whole. The trend line is not redrawn (m3's once per
  session key keeps m1's intent); only the October tail label fades
  in at about 690 ms.
- One layout shift of 0.014: the stat strip moves 66 px up because the
  GM hero is shorter; it happens inside the fade, not as a visible
  jump.

### Sign-off on Home (GM) (m4)

- 115 to 200 ms: the stamp (Sign-off recorded, Khalid Al Nuaimi, the
  time) lands beside the figure with a slight scale and the ring.
- 332 to 415 ms: only then does the headline fade out and in to
  "October salary file is next" (faint for about 50 ms).
- No shift on the laptop; on the phone one shift of 0.017 (the card
  grows by the stamp's row).

### Sign-off on the pay run (m4)

- 147 ms: the right card loses "Send back" and the note; its height
  eases (no jump: three shifts of 0.001 to 0.002 each, dy under
  15 px, which is the height tween settling).
- 297 to 597 ms: the signature writes itself, letter by letter.
- 897 ms: the stamp card's frame closes round the signature.
- 1,397 ms: "Pay released to the salary file" turns solid (release
  status).

### E-sign sheet (new in this audit)

- Open: laptop, the sheet slides in from the end edge over a scrim in
  about 200 ms; phone, the same full-height sheet (120 to 260 ms). No
  thin frame, no overflow at 393 px, dark mode correct.
- Sign: at about 100 ms the sheet's body jumps to its signed state ("It
  is not your turn to sign this paper") while the sheet is still on
  screen, then slides out (151 to 286 ms). Behind the scrim the
  document card grows by 175 px in one frame (laptop shift 0.028,
  phone 0.13), so the next section jumps down.
- 251 to 685 ms: the typed signature draws in the card; about 985 ms
  the stamp frame closes round it.
- Phone: the "Signed, Undo" toast sits on top of the stamp's ring, so
  the end of the moment is covered.

### Charts (m3)

- Variance (from Home): the route takes about 400 ms to answer (one
  300 ms long task while the report builds). Then the waterfall grows,
  each bar from the previous bar's end, labels after the bars, done
  by about 1,500 ms.
- Variance month step ("Earlier month"): at 97 ms the label already
  says "Sep 2026 against Aug 2026" while the headline still shows
  last month's "14,719.06" at full ink; it dims at 131 to 231 ms and
  "41.67" fades in by 314 ms. For about 100 ms a real amount sits
  under the wrong label. The same click swaps the section tabs for a
  breadcrumb, which moves the whole page 40 px up in one frame
  (shift 0.24, the largest score of any moment).
- Executive (as GM): about 370 ms with no response after the click
  (one 283 ms long task), then a cross-fade from Home, then the tiles,
  sparklines, change bars and department bars move together and the
  change labels land by about 1,500 ms.
- Home on reload: the trend line draws once, the ready rail fills, a
  slow light crosses the hero. On a later visit to Home in the same
  session the line is not redrawn.

### Hide amounts

- On: one 180 ms gesture; the dots arrive out of a blur. Seek over all
  68 running animations: no amount in `main` at any step. With amounts
  hidden an IBAN save runs no roll at all (0 roll columns) and no
  amount appears, laptop and phone.
- Off: the digits come back out of the same blur, with no roll from
  the mask.

### Theme toggle and dark mode

- The theme change is a cross-fade, no shift, no thin frame. Every
  moment above was repeated in dark at 1440x900 and the main ones at
  393x852 in dark: no blank frame, no overflow, the same timings.

## Remaining gaps, ranked

1. **Fix step: the IBAN form vanishes and the list jumps 161 px
   (laptop) or 253 px (phone).** `payrun/FixStep.tsx`: let the form
   collapse on the height tween (`ui/heightTween.ts`, 250 ms
   `--ease-out`) as the chip leaves, the way Home's card already does.
2. **Variance month step: old figure under the new label, and a 40 px
   page jump.** `reports/Variance*`: dim or swap the headline in the
   same frame as the label; keep the section tabs (or reserve the
   breadcrumb's height) on `#/reports/variance/<month>`.
3. **Pay run step: 2 frames of the old step drawn twice.**
   `payrun/PayRun.tsx` `leaveCopy`: hide the live swap
   (`visibility: hidden`) in the same frame the copy is added, or make
   the copy at render time inside the route change.
4. **Why this number: the clone stacks on the source for about 50 ms.**
   `components/explain`: dim the source to 0.35 at launch and bring it
   back on close (audit 1 asked for this; the size change landed, the
   dim did not).
5. **IBAN hand-over: chip and old total legible together for about
   60 ms.** `ui/flight.ts` hand-over: fade the chip out in 80 ms before
   the old total shows through, or start the roll in the first
   hand-over frame so the old digits are already leaving.
6. **E-sign: the sheet body cuts to "signed" before it leaves, and the
   card grows 175 px in one frame behind it.** `people/esign/Sign.tsx`:
   close the sheet on its current content, and grow the card on the
   height tween after the sheet is gone. On phones lift the toast
   above the stamp, or delay it until the ring has landed.
7. **Role switch: the menu lingers about 500 ms over the change, and one
   frame shows both headlines.** `shell` role menu: close it before
   the switch starts; fade out, then in, instead of overlapping.
8. **Record tab panels cut while the underline glides.**
   `ui/templates/RecordTabs.tsx`: slide the panel 8 px along the
   direction of travel (200 ms, `--ease-out`) in step with the
   underline; group pages could fade out, then in, instead of
   overlapping.
9. **Slow first answers on Executive (about 370 ms) and Variance (about
   400 ms).** A long task builds each report on navigation. Prefetch
   on hover or idle, or show the page head at once and build the
   charts into it.

## Tests on this branch

- `pnpm -r typecheck` and `pnpm lines`: green after every merge.
- Unit: web 68 files, 439 tests; demo-data 37 files, 402 tests: green.
- E2E, one worker, reduced motion not emulated, local config on port
  4770: smoke, payrun, home-me, explain-figures, esign-d5,
  dashboards-d3, money-roll, reports-wp7, fix1-consistency, opening:
  110 passed, 8 skipped (desktop-only or phone-only cases), 0 failed.
  leak-scan for hr and it (both its tests each): 4 passed.

## Merge notes

- m1 vs base `ui/Toast.tsx`: kept m1's leaving and wipe, and the base's
  masked toast text.
- m3 vs m1 `home/NetTrend.tsx`: m3's `useChartMotion` with a new
  `session` option, so the line still draws once per session (m1).
- m4 vs m3 `apps/web/DEMO.md`: m3's motion summary plus m4's frame
  capture note.
- m2 vs m1 `listMotion.ts`: m1's section slide and trusted flag, m2's
  card-to-report and duplicate-change join; `LIST_MS` 320 ms on
  `--ease-in-out` (the motion.css values). `FilterList.tsx` keeps m1's
  segment glide and m2's entrance and FLIP. `dash.module.css` takes
  m2's entrance in `Tiles.tsx`.
- `theme/tokens.css` still carried an older 150/200/250 ms scale and
  its own curves; motion.css loaded later and won. The shadow copy is
  removed so motion.css is the one source.
- m2 is fully merged, through 348ce49; its worktree is clean.
