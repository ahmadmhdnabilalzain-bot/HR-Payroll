# Safari and laptop compatibility: fail-open audit

Date: 2026-11-27. Branch `saf1`, from `claude/quirky-wozniak-b7xkvr`.

The owner reported two things. In Reports, "I just see tabs, nothing is
clickable". On the GM dashboard, the items are not clickable. The owner's
devices are an iPhone 13 Pro Max on Safari (iOS version unknown, so
15.4 and up is assumed) and an Asus Vivobook running Windows (Edge or
Chrome, integrated graphics, 125 to 150 % scaling).

WebKit is not installed here, so this is a static audit against MDN
browser-compat-data (offline, `@mdn/browser-compat-data`). It is backed
by a Chromium walk with the optional APIs stubbed away.

## Most likely cause of the reported symptom

**A view transition that never ended.**

While a view transition runs, the browser draws the page as snapshots
in a layer over everything. Every tap goes to that layer. Our route
slide and role switch had a few features:

- They named the top bar, the group tabs and the phone tabs as their
  own groups, drawn live.
- They faded the page in from `opacity: 0` (`route-in`).
- They had no cap.

If such a transition stalls, the owner sees the tabs, no page under
them, and nothing that reacts to a tap. That is the report word for
word, on Reports (a group-tab page) and after the role switch to GM
(which runs through the same transition).

Safari ships View Transitions from 18.0, so any iPhone on iOS 18 or 26
takes this path. Plain Chromium could not reproduce it: an unstubbed
walk of HR and GM Home and Reports at 428x926 and 1366x768 found no
dead items.

**Fixed (826b444):** every view transition now goes through
`ui/viewTransition.ts`.

- WebKit (Safari, and every iOS browser) gets no view transitions: the
  page just changes. `?vt=1` turns them back on there, to try a fixed
  Safari.
- Elsewhere each transition is capped at 1.5 s. After that it is
  skipped, and its flags (`data-route-motion`, `data-route-pace`,
  `--route-dir`, `data-list-motion` and the temporary names) are
  cleared.
- A throw from `startViewTransition` runs the change plainly.
- The update runs exactly once, even if the browser never calls it.

All four call sites use it: route motion, list motion, the theme switch
and the role switch.

## Everything else that could leave content hidden, inert or unclickable

Each item has a backstop. `FAIL_OPEN_MS` is 1.2 s, in `ui/seen.ts`.

| Mechanism | Risk | Fix |
|---|---|---|
| Report and dashboard sections below the fold (`data-reveal="wait"`, opacity 0) | Waited for an IntersectionObserver report | `onSeen`: the observer, plus a geometry check on any scroll (capture), on resize and after 1.2 s |
| Entrance veil (`[data-veil]::after`, opaque) | Removed only on the animation's `finish` | A timer at delay + duration + 1.2 s finishes it and removes the veil; leaving ghosts are removed |
| Charts (built paused at frame 0) | Played only when observed | `onSeen`, then a finish-all timer |
| Explain triggers on HR dashboards (opacity 0 through their hidden section) | Hidden while the section waited | Fixed by the reveal fix |
| First-load opening (`inert` shell under the film) | A hung or failed chunk kept the product inert | A 14 s cap, and a caught import that goes straight to the product |
| Opening on weak graphics | A slow film on integrated GPUs | A software renderer skips the film. If 30 frames in a row (timed from frame 30 to 90 after the first scene, on a loaded page) run a median over 50 ms, the film fades into the product. `?film=1` keeps the film; the opening spec uses it |
| Still opening's scenes (opacity 0 until observed) | Hidden; and a crash with no observer | `onSeen` |
| Chip flights (IBAN save, fixed row) | The value was saved only on the fade's `finish` | A timer lands the value |
| Figure roll | The old figure was kept until the animations settled | A timer settles it |
| Explain flight copy, pay run leaving copy | Removed only on `finish` | A timer removes them |
| `scrollTo({ behavior: "instant" })` | TypeError on Safari before 16.4, thrown after the render in the list swap and role switch | Numeric `scrollTo(x, y)` (d4846f9) |
| `requestIdleCallback` (not in Safari) | | Already falls back to `setTimeout` (demo/prefetch.ts) |
| `inert` (15.5), `@starting-style` (17.5), `transition-behavior` (17.4), `popover` (17) | Ignored where unsupported | Fail open by nature: the final state shows |
| Dialog exit (`useModal`) | Waited for `transitionend` | Already had a timer backstop |

## Build target

`es2022` shipped class static blocks (Safari 16.4+) and logical
assignment. The target is now
`["es2020", "safari15", "chrome100", "edge100", "firefox100"]` (c5215aa).
Syntax and CSS are lowered: no CSS nesting ships, and
`-webkit-backdrop-filter` and `-webkit-text-size-adjust` are present.

The web tsconfig lib is ES2022, so `toSorted`, `findLast` (beyond 15.4),
iterator helpers and `Object.groupBy` cannot be used. `.toArray()` in the
bundle is three.js's own method.

## Static findings left as they are (cosmetic)

- **`color-mix()` with variables:** 78 uses, mostly box-shadow, scrims
  and a few backgrounds. Safari before 16.2 drops them, so those shadows
  and tints are missing on iOS 15.4 to 16.1. Nothing becomes hidden or
  blocked.
- **`accent-color`:** BCD says Safari 26.2. The control is drawn in the
  system colour before that.
- **`overscroll-behavior`:** partial before Safari 16.
- **`text-wrap: balance`:** 17.5.
- **`scrollbar-gutter`:** 18.2.
- **Unguarded `:hover` rules:** 116 rules, against 56 inside
  `@media (hover: hover)`. A tapped item can keep its hover tint until
  the next tap on iOS or a touchscreen laptop. This is cosmetic.
- **Phone step dots on the pay run:** they are visually hidden on
  purpose (1 px, clipped; the thin bar is what the eye reads). The walk
  now skips them.

## Checks that passed (Chromium)

- **iPhone viewport:** `viewport-fit=cover`, 21 `env(safe-area-inset-*)`
  uses, `100vh` with a `dvh` fallback. At 428x926 (touch, mobile), no
  text input, select or textarea was below 16 px on any HR or employee
  route, so iOS will not zoom on focus. No route overflowed sideways.
- **Laptop sizes:** no horizontal overflow on any HR route at 1366x768
  (DPR 1), 1536x864 (DPR 1.25) or 1280x720 (DPR 1.5).
- **Unit tests:** `tests/unit/fail-open.test.ts`, 11 tests. They cover
  the transition cap, skip and throw paths, WebKit detection, the
  `onSeen` fallback, the film gate and the PDF hand-over.
- **Fail-open walk** (`e2e/failopen.spec.ts`, `FAILOPEN_PROFILE=absent`):
  - Before the fixes, GM Reports at 428x926 found 24 hidden or veiled
    items (sections still hidden, veils left on, Explain triggers at
    opacity 0).
  - After the fixes, the same routes came back clean.
  - The full walk over every role, route and size was stopped part way
    by the machine freeze: 86 HR routes at 428x926 and 23 at 1366x768,
    with no hidden or inert finding except the step dots above.

## PDF on iPhone

`src/pdf/ios.ts` provides `savePdf(blob, name)`.

- **On iPhone and iPad:** it tries the share sheet with the file, then a
  new tab, then a visible "Open PDF" link (a fresh tap that Safari
  allows).
- **Elsewhere:** it downloads.

The blob address is kept for 5 minutes. pdf1 should call it from the
tap's handler; DEMO.md has the note.

## Not verified without real Safari

- **The cause.** The stuck-transition explanation fits the words of the
  report but was not reproduced on WebKit. The WebKit switch takes
  Safari off that path whatever the WebKit bug is.
- **Hit-testing, `inert`, `-webkit-` prefixes and 100dvh/safe areas on
  a real notch and home indicator.**
- **`navigator.share` with files, and the new-tab and blob behaviour.**
  This depends on the iOS version and on the tap still being recent.
- **The opening's frame-time gate on a real Intel UHD at 150 %.** Its
  threshold was chosen, not measured there. Headless SwiftShader runs
  at 10 to 25 fps and is skipped as software.

## Still to run (Monday, after the gate)

1. The full `FAILOPEN_PROFILE=absent` walk at 1366x768, 1536x864 and
   1920x1080 for all roles, then 428x926.
2. `FAILOPEN_PROFILE=stall`.
3. The opening cases at the end of the spec.
4. `pnpm -r typecheck`, then the web and demo-data unit tests, on the
   final tip. The last two commits (d4846f9 and bfeae3a) were made
   during the freeze without a typecheck.

Run the walk with one worker against `vite preview` of a fresh build, on
a local config at port 5310 or above that is not committed.
