# Mobile stage checklist (iPhone 13 and newer, Safari)

Used for the mobile pass after the final merge. Sources: the Claude
library skills `vectorlab-ux-skills:viewports`,
`audit-suite:emil-design-engineering`, `mobile-app-design:ios-review`,
`mobile-app-design:ios-screens`, `ui-design-review:ui-review`,
`smooth-ux` and `design:accessibility-review`.

Test sizes: 360, 375, 393 and 430 wide (Chromium imitation; Safari is
not installed here, so the owner checks once on a real iPhone).

## Layout (viewports skill)
- No page-level horizontal overflow: scrollWidth <= clientWidth at every
  size, on every registry area, for all five roles. Wide tables scroll
  inside their own focusable region.
- No type below 12 px (the product floor is 13 px); no fixed widths over
  768 px without wrap or inner scroll.
- The desktop sidebar or panel chrome is gone on narrow; the same places
  are reachable from the bottom bar, More and the section pages.

## Touch (Emil, iOS review)
- Every tap target at least 44 x 44 px, including icon buttons, tabs,
  segments, list actions, close buttons and calendar cells.
- Hover is never the only path. Hover styles live in
  `@media (hover: hover)`; touch gets pressed states.
- Inputs are 16 px or larger so Safari does not zoom on focus (IBAN
  entry, search, forms, sheets).
- No `transition: all`; animate transform and opacity only; no layout
  shift when figures change (tabular numbers, reserved heights).
- Respect `prefers-reduced-motion` everywhere.

## iOS Safari specifics
- Use `100dvh` or `100svh`, not `100vh`, for full-height stages and
  sheets, so the address bar does not cut content.
- Safe areas: `viewport-fit=cover` and `env(safe-area-inset-*)` on the
  bottom bar, sheets and the offline file; content never sits under the
  home indicator or the notch.
- Fixed and sticky elements stay put while the keyboard is open (IBAN
  entry, sign sheet); the focused field scrolls into view.
- No pull-to-refresh or rubber-band that reloads the demo (state would
  reset): `overscroll-behavior` on the page.
- Date fields, selects and file inputs behave (native pickers).
- Drawing a signature with a finger does not scroll the page
  (`touch-action: none` on the canvas only).
- Print and Save as PDF: Safari share sheet works from the letter page.
- `color-scheme` and dark mode follow the system on phones.
- Tap highlight and text-size-adjust set so nothing flashes or inflates.

## Flows to run on a phone, per role
- Employee (Jose): payslip, "Why this number", request leave, expenses,
  time card, Documents to sign (finger signature), help.
- Team manager (Arjun): decide leave and overtime on the row, team today.
- HR: enter both bank details, add a new employee, signing pack, letter.
- General Manager: sign off October pay, owner brief, dashboards.
- IT: audit chain check, access review, data location.
- Search and the command palette; role switch; hide amounts; theme.

## Pass criteria
Zero overflow, zero targets under 44 px, zero inputs under 16 px, zero
console errors, axe clean, every flow above completes, nothing blank
or cut off at 360 and 430. Then the owner checks on a real iPhone.
