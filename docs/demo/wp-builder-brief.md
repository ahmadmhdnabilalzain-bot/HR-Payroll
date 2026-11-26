# Brief for area-package builders (WP2 to WP10)

You build one package of screens for the MubinFlow demo (React 19 + Vite +
TypeScript, browser only, fictional data). Product: HR and payroll for UAE
mainland SMEs. First client demo is Friday 15:00 Dubai time. The owner's
bar is 10/10, "Apple is developing this app". Quality of every screen
counts as much as the count of screens.

## Setup
1. Worktree: `git worktree add .claude/worktrees/<wp> -b <wp> demo-web`
   (branch demo-web holds the shell, registry and templates; its head
   commit is at or after baa33d7). Merge the work branch
   `claude/quirky-wozniak-b7xkvr` into yours first if it is newer: it
   carries the demo data packages.
2. `pnpm install` if needed. Read, in this order:
   `apps/web/DEMO.md` (sections "For builders of area packages" and
   "For builders of other sections"), `docs/design/2026-11-26-navigation-
   map.md` (sections 2 to 5, then your package in 7 and your rows in 8),
   `docs/design/2026-11-26-apple-standard-critique.md` (the design rules),
   `packages/demo-data/README.md` (the selectors you read).
3. Work only in your own folder and your own registry file
   `apps/web/src/nav/areas/<your file>.ts`. Never edit shared files:
   shell, tokens, templates, views.tsx beyond your registrations, the
   store beyond append-only actions. If a template cannot do what you need,
   send me the request in your report; do not fork it.

## Rules
- Use the six templates (LF list, RT record, FA form with approval, CA
  calendar, RP report, ST settings). One screen per registry row. Each
  row you finish: set `status: "live"`, register the view.
- Data only from `useDemo()` and demo-data selectors. Never type a figure.
  If you need data that does not exist, say so in the report.
- Money only through `<Money/>`; figures with a working behind them use
  `Explainable`. Dates as the data's display strings.
- Design: the type scale, the one 1200px grid, teal for actions only, at
  most 3 coloured text runs per screen, no repeated labels, status = word
  plus dot, plain words ("Stops pay", "Check"), at most one primary
  action per screen, empty states that say what to do. Motion only through
  the shared helpers; everything falls back under reduced motion.
- Honesty: never say compliant, approved by an authority, certified,
  accepted by a bank or a ministry. Rule-based statements say "as we read
  it" inside the explain panel. Pension for UAE nationals stays "not
  computed". Arabic stays hidden.
- Actions (approve, request, decide, mark done) go through the append-only
  store actions with who, role and date shown. Every action has an undo or
  a plain result message. No dead ends: every button does something.
- Each screen works at 1920x1080, 1280x720 and iPhone 13 to 16 sizes (the
  phone list is a stacked list, not a squeezed table), light and dark,
  axe-clean, no console errors, no outside requests, 44px touch targets.
- 80-character lines; typecheck, `pnpm lines`, unit and e2e tests pass.
  Add unit tests for your selectors and one e2e flow per package.
- Commit after each group of areas with these trailers:
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01VEtrwiojZPAR3EzGZsctYW`.
  Do not push. Do not touch Render or any other repository.

## Report
Commit hashes; rows now live (ids) and rows you skipped with the reason;
data you needed that is missing; template gaps; screenshots (light and
dark, 1920x1080 and iPhone 15) of every area in
`<scratchpad>/demo-web/shots/<wp>/`; the checks you ran.
