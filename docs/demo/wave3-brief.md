# Brief for wave-3 builders (data plus screens, one package each)

You add MISSING feature rows to the Mubinflow demo (React 19 + Vite + TS,
apps/web, browser only, fictional data, UAE only; the product is HR and
payroll for UAE mainland SMEs). First client meeting is tomorrow; the owner
wants HR and payroll at 80 percent of the 207 rows in
docs/design/2026-11-26-navigation-map.md (section 8). You own the rows listed
in your prompt and nothing else; other agents own the other rows.

## Setup
1. `git -C /home/user/HR-Payroll worktree add .claude/worktrees/<wp> -b <wp> integ`
   and work there. Run `pnpm install` if needed.
2. Read: docs/demo/wp-builder-brief.md (the rules; follow it), apps/web/DEMO.md
   ("For builders of area packages": the six templates, registry, store),
   docs/design/2026-11-26-navigation-map.md (sections 2 to 4 and your rows in 8),
   packages/demo-data/README.md and one finished example of each kind: a data
   file (packages/demo-data/src/wpd-talent.ts) and its adapter and screens
   (apps/web/src/people/talent/, apps/web/src/demo/data/talent.ts,
   apps/web/src/nav/areas/people-talent.ts).
3. For each row: (a) if data is missing, add it in ONE new file
   packages/demo-data/src/wpe-<name>.ts (selectors with display strings, no
   randomness, derived from existing employees, approvals, documents and
   figures; never contradict existing numbers; money only through the engine;
   tests first with vitest, including a banned-words scan: never 'approved',
   'certified', 'compliant' for authority decisions; use signed off, booked,
   declined; no raw ISO dates) and add only an export line to
   packages/demo-data/src/index.ts; (b) add the screen in your own folder
   under apps/web/src (use the templates through public props only; another
   lane is restyling them), an adapter file in apps/web/src/demo/data/ if the
   screen needs data (the only importer of the data package, lazily loaded,
   add the file to the allow-list in apps/web/tests/unit/boundaries.test.ts,
   one path per line), and a registry file apps/web/src/nav/areas/<name>.ts
   with its import and spread in nav/areas/index.ts (one entry per line);
   (c) a one-line dispatch in the owning view (People.tsx, Reports.tsx,
   Setup.tsx, PayArea.tsx or TimeRouter, whichever the section uses).
   Actions (decide, request, mark done) are append-only store slices like
   apps/web/src/demo/papers-state.ts, always with who, role and date and an undo.
4. Rules that always apply: UAE only (no other country); no claims of
   compliance, certification or approval by an authority; pension for UAE
   nationals stays 'Not computed'; Arabic stays hidden; plain words; one
   primary action per screen; ink and grey palette (no accent colour; colour
   only for state, always with a word); role guard via the registry `roles`
   field (the shell guard enforces it); 44px touch targets; axe clean; no
   outside requests; 80-character lines (`pnpm lines`); typecheck; unit tests;
   one e2e flow per package.
5. Commit after each group with trailers
   `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and
   `Claude-Session: https://claude.ai/code/session_01VEtrwiojZPAR3EzGZsctYW`.
   Do not push. Do not touch Render or any other repository.

## Report (under 300 words)
Commit hashes; row ids made live; rows skipped and why; shared files touched;
screenshots (light and dark, 1920x1080 and iPhone 15) in
/tmp/claude-0/-home-user-HR-Payroll/55600167-2f81-585b-8597-bc047d967ec5/scratchpad/demo-web/shots/<wp>/.
