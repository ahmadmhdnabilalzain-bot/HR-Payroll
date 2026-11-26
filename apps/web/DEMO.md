# Client demo (apps/web)

A browser-only demo of the product for a client showing: fictional
data from `@payroll/demo-data`, no backend, no network calls, nothing
saved (a reload starts the story again).

## Run and host

```bash
pnpm --filter @payroll/web dev      # http://localhost:5173
pnpm --filter @payroll/web build    # static site in apps/web/dist
pnpm --filter @payroll/web preview  # serve dist on :4173
```

- Hash routing (`#/home`): every visit loads `index.html`, so a static
  host needs no rewrite rule. A host that rewrites unknown paths to
  `index.html` also works.
- `?ar=1` shows the Arabic switch; `?ar=0` hides it. By default Arabic
  follows `DEMO_AR_REVIEWED` from the data package (false today).

## Decisions (Claude's calls, scene 1)

- **Shell:** no sidebar. A slim top bar holds the wordmark, five
  sections, search, hide amounts, theme, language and role. Sections
  not built yet are shown but inert. On a phone the sections move to a
  bottom bar.
- **Data:** one adapter (`src/demo/data/adapter.ts`) is the only file
  that imports the package, and it loads as a lazy chunk so the
  engine's gratuity code stays out of the entry chunk. Screens read a
  thin view (`src/demo/data/types.ts`). No figure is typed in a
  component.
- **Money:** one formatter (`formatMoney`, with `moneyParts` built from
  the same text), integer fils, tabular figures, left to right inside
  Arabic. Tweens step in whole per mille of the gap (bigint), so no
  float touches money.
- **Honest actions:** each issue offers the step its `fixKind` allows:
  enter IBAN (an inline form that checks the shape), mark reviewed, or
  start renewal. Settled items move down with undo. Needs-confirmation
  items (pension, settlement) sit apart and are not counted as open.
  Approve and Decline appear only for the checker. Everyone else sees
  "Waiting for {name}". Maker and checker are always shown.
- **Tracker:** progress only, never a gate. Approving with issues still
  open marks review as "N open issues" instead of done.
- **Motion:** CSS plus small hand-written code (no GSAP or Motion):
  150 to 250 ms ease-out, number tweens on change only (no count-up on
  load), FLIP list reorder, view-transition crossfade on the theme
  switch, a 150 ms palette. `prefers-reduced-motion` turns all of it
  off, JS tweens included.
- **Fonts:** IBM Plex Sans and IBM Plex Sans Arabic (300 to 600). The
  logo is the owner's outlined wordmark (docs/brand/logo/final), so no
  logo font is loaded.
- **Words:** no "compliant", "approved", "certified" or "guaranteed"
  in the catalog or in displayed data (`tests/unit/demo-copy.test.ts`).
- **Lint:** the repo has no linter. `pnpm typecheck`, `pnpm lines` and
  the style tests (no physical directions, no colour literals) are the
  checks.

## Checks

`pnpm --filter @payroll/web test` (unit tests, including selectors,
the money formatter and copy) and `pnpm --filter @payroll/web e2e`
(smoke tests on the built site). The screenshot and axe scripts live
outside the repo (scratchpad).
