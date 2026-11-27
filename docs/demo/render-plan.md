# Render plan: the demo site

Status: prepared, NOT applied. Nothing here has been run on Render.
Read LEDGER section 14 first. Companion: `go-live-runbook.md`.

Hard rule: only resources named `hr-payroll-*` are touched. Never
`manar-erp`, `manar-erp-jobs`, `manar-erp-einvoicing` or anything else in
the workspace. Blueprints use `existingResources: create_new`, never adopt.

## 1. Which resource

| Item | Value |
| --- | --- |
| Type | Static site (`type: web`, `runtime: static` in the Blueprint) |
| Name | `hr-payroll-demo-site` (the existing placeholder keeps this name; its public URL is `https://hr-payroll-demo-site-223y.onrender.com`) |
| Project / environment | `hr-payroll` / `demo` |
| Workspace | "My Workspace" (`tea-dbt39oek1f9s73ann1g0`), shared with the owner's other project, which we do not touch |
| Region | Not set in the Blueprint. A static site is served from Render's CDN, so the region setting has no effect on visitors. For reference the placeholder sits in the workspace default (Frankfurt was the region noted in LEDGER 15). Fictional data only |
| Plan | Static sites have no instance plan; no paid instance is created |
| Auto deploy | `autoDeployTrigger: "off"` |
| Source | `render.live.yaml` (copied over `render.yaml` at go-live), publish path `./apps/web/dist` |

No database, no API, no env secrets. Only `NODE_VERSION=22`.

## 2. Cost

Hosting a static site on Render is free (LEDGER 14: "static sites are
free to deploy"). So the resource itself costs 0.

Bandwidth and build-minute limits depend on the workspace plan.
render.com could not be fetched from this session (host not on the
allowed network list), so the numbers are UNVERIFIED here. Before the
meeting, open https://render.com/pricing and write the current figures
for the workspace plan into this table:

| Limit | Value |
| --- | --- |
| Outbound bandwidth included per month (workspace plan) | UNVERIFIED |
| Overage per GB | UNVERIFIED |
| Build pipeline minutes included per month | UNVERIFIED |
| Overage per build minute | UNVERIFIED |

Our own load, measured (section 6): first load is about 1.8 MB raw, about
0.6 MB compressed, 42 requests, all same origin. Even 1,000 full views is
roughly 0.6 GB. A build takes seconds on this machine, expected under 3
minutes on Render, so a handful of deploys uses few build minutes.

## 3. How the unlisted link works

- There is no login. Anyone who has the URL can open it, so treat it as
  unlisted, not private. Share it only with the people meant to see it.
- The suffix `-223y` in the hostname is random, which makes the URL hard to
  guess, but it is not a secret.
- Search engines are told not to index it: the header
  `X-Robots-Tag: noindex, nofollow` is sent on every response
  (verified locally). There is no `robots.txt` and no meta robots tag, so
  the header is the only signal. Do not post the link publicly or in
  places crawlers read.
- `Referrer-Policy: no-referrer` stops the link leaking to other sites;
  the app makes no requests to other sites anyway.
- Data is fictional and lives in the browser bundle. Nothing is saved;
  reload restarts the story.
- Deep links work: `https://.../#/pay-run` opens that screen.
- Not a security control. Do not put real data on it.

## 4. How to take it down

Fastest first. Use the Render dashboard, or ask the owner; do not use any
command that touches resources outside `hr-payroll-*`.

1. Suspend: dashboard, service `hr-payroll-demo-site`, Settings,
   Suspend. The URL then stops serving; it can be resumed later. (Tool
   equivalent: suspend on that one service id `srv-dc3urhajnfac73avp20g`
   only.)
2. Put the placeholder back (stops showing the demo, keeps the URL):
   restore `render.yaml` (`git checkout <previous commit> -- render.yaml`),
   push, `plan_blueprint` (only change must be `hr-payroll-demo-site`),
   show the owner, `approve_blueprint`.
3. Delete: dashboard, service, Settings, Delete. This frees the name but
   the URL `-223y` is lost for good. Use only if the owner asks.
4. Fallback that needs no hosting: the offline file (section 7).

Verify afterwards with a cache-busting URL, and re-list services
(read-only) to confirm the `manar-erp*` ids and status are unchanged.

## 5. Exact steps (Blueprint, create_new)

Blueprint `hr-payroll` (`exs-dc3urcui0phs738l6ol0`) exists, autoSync OFF.
The live file only changes the one service `hr-payroll-demo-site`.

1. Owner says yes in chat (written down).
2. Merge branch `host` to the branch Render builds from and push (Render
   builds from the repo, not from this machine).
3. `cp render.live.yaml render.yaml`; commit; push.
4. `plan_blueprint` on `hr-payroll`. Do not approve. Proceed only if: the
   only change is an update to `hr-payroll-demo-site`; nothing is created,
   deleted or adopted; no `manar-erp*` name appears; cost stays 0.
5. Show the owner the plan; wait for yes.
6. `approve_blueprint`. WARNING: this deploys at once, even with
   `autoDeployTrigger: "off"`.
7. Watch `list_deploys` / `get_deploy` until live.
8. Verify with `?v=<time>`: banner "MubinFlow demo: fictional data",
   `/#/pay-run` opens, click script steps 1 to 3, response headers below.
9. Record the result in LEDGER section 14.

If a brand-new site is wanted instead of re-using the placeholder (for
example to keep the old URL as rollback), use a Blueprint with a NEW
name that is still `hr-payroll-*` (for example `hr-payroll-demo-site-b`)
and `existingResources: create_new`. Never reuse a name from outside
`hr-payroll-*`, because Render applies a Blueprint to a resource of the
same name.

Blueprint settings (from `render.live.yaml`):

- build: `corepack enable && corepack prepare pnpm@10.28.0 --activate && pnpm install --frozen-lockfile --filter "@payroll/web..." && pnpm --filter @payroll/web build`
- publish path: `./apps/web/dist`
- route: rewrite `/*` to `/index.html`
- headers: `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer` on `/*`; `Cache-Control: public,
  max-age=31536000, immutable` on `/assets/*`; `Cache-Control: no-cache` on
  `/index.html` and `/`.

## 6. Local verification (2026-11-26)

Ran the exact build command (pnpm 10.28.0, Node 22) with the frozen
lockfile, then served `apps/web/dist` on port 4290 with a small static
server that applies the rewrite and headers from `render.live.yaml`
(Render itself was not used).

- Build passes. Output: 134 files, 3.2 MB on disk (both woff and woff2
  are emitted; browsers fetch only woff2).
- Headers on `/`, `/index.html`, any unknown path: noindex, nosniff,
  no-referrer, `no-cache`. On `/assets/*.js`: `immutable` one-year cache.
- Page load (Chromium): 42 requests, about 1.8 MB raw, about 0.6 MB
  compressed estimate (gzip of text, fonts as is; Render's own
  compression was not measured). Zero requests leave the origin, no
  console or page errors.
- Deep links: `/#/pay-run` and `/#/people` open the right screen, and
  survive reload. An unknown hash `/#/x` shows the app's own "This page
  does not exist" screen.
- 404 behaviour: because of the `/*` rewrite, an unknown path such as
  `/some/path/here` returns `index.html` with status 200 and the Home
  screen, and a missing file such as `/assets/missing.js` returns
  `index.html` (HTML, status 200). There is no HTTP 404. Acceptable for a
  demo; note it if someone tests broken links.
- Caveat: how Render orders a rewrite against an existing file, and its
  compression, were not tested against Render itself. Check on the real
  URL during step 8.

## 7. Offline fallback

`pnpm --filter @payroll/web build:offline` writes
`apps/web/dist-offline/mubinflow-demo.html` (git-ignored). Current
build: 2,555,324 bytes (2.4 MiB; the runbook says about 2 MB). Opened by
file:// in Chromium: loads Home, zero external requests, no errors. The
earlier scratchpad copy `mubinflow-demo-final.html` was 2,294,338 bytes
and is an older build; rebuild before the meeting and copy to the laptop,
USB stick and phone.
