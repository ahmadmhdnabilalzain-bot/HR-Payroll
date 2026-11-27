# Go-live runbook: demo site on Render

Prepared, NOT applied. Nothing below has been run. Read LEDGER section 14
first. Final URL: https://hr-payroll-demo-site-223y.onrender.com

Warning: a Blueprint sync deploys by itself, even with autoDeployTrigger
"off". Copying `render.live.yaml` over `render.yaml` and syncing
DEPLOYS IMMEDIATELY. Do it only after the owner says yes in chat.

Hard rule: never touch `manar-erp`, `manar-erp-jobs`,
`manar-erp-einvoicing` or anything not named `hr-payroll-*`.

## Before going live

- Owner has approved the previews in chat (the go-ahead is written down).
- The hosting branch is merged to the branch Render builds from, and
  pushed (the Blueprint builds from the repo, not from this machine).
- `pnpm --filter @payroll/web build` passes on that commit.
- The offline file and QR code exist (see "If the network fails").

## Steps

1. On the branch Render builds from, copy the live Blueprint over the
   placeholder: `cp render.live.yaml render.yaml`. Commit and push.
2. Run `plan_blueprint` on Blueprint `hr-payroll`
   (`exs-dc3urcui0phs738l6ol0`). Do not approve yet.
3. Read the plan. Proceed only if ALL hold:
   - the only change is an update to `hr-payroll-demo-site`;
   - no resource is created, deleted or adopted;
   - nothing named `manar-erp*` appears at all;
   - cost stays 0 (free static site).
   If anything else shows, stop and keep the placeholder.
4. Show the owner the plan. Wait for a yes.
5. `approve_blueprint`. This deploys the site at once.
6. Watch the deploy (`list_deploys`, then `get_deploy`) until `live`.
   Expected build time: under 3 minutes.
7. Verify with a cache-busting URL, so no old copy is shown:
   `https://hr-payroll-demo-site-223y.onrender.com/?v=<today's time>`
   Check: top left says "MubinFlow demo: fictional data"; no blank page;
   `/#/pay-run` opens the pay run; the click script steps 1 to 3 work.
8. Re-list services (read-only `list_services`). Confirm
   `hr-payroll-demo-site` is live and that `manar-erp`, `manar-erp-jobs`
   and `manar-erp-einvoicing` are unchanged (same ids, same status).
9. Add the result to LEDGER section 14.

## Rollback

1. Restore the placeholder: `git checkout <previous commit> -- render.yaml`
   (or copy the old file back) and push.
2. `plan_blueprint`: the only change must be `hr-payroll-demo-site`
   going back to the placeholder. Show the owner, then
   `approve_blueprint`.
3. Verify with a cache-busting URL that the placeholder page shows.
4. If the sync itself fails, use the offline file below. Do not delete or
   recreate the service.

## Checklist on a real iPhone (Safari, mobile data and Wi-Fi)

- [ ] The link opens over https with no certificate warning.
- [ ] The page loads in under 5 seconds on mobile data.
- [ ] Top left says "MubinFlow demo: fictional data".
- [ ] No text is cut off or runs off the right edge; no sideways scroll.
- [ ] Portrait and landscape both work.
- [ ] Home shows "2 bank details are missing. Pay is held until they are fixed.".
- [ ] Tap "Enter bank details", "Fill from bank letter", "Save and check"
      twice; the sentence changes to "ready for approval".
- [ ] Tap the round initials, choose the General manager, tap "Approve
      October pay"; the page reads "salary file is next".
- [ ] Open the page directly at `/#/pay-run`; it shows the pay run.
- [ ] Reload: the story restarts (nothing is saved, as told to guests).
- [ ] Scan the QR code (qr-demo-link.png) with the camera; it opens.
- [ ] Add to Home Screen shows the app icon.
- [ ] Search engines are told not to index (header `X-Robots-Tag`).

## If the network fails

1. Offline file: `mubinflow-demo.html` (about 2 MB, one file, no
   internet needed). Keep a copy on the laptop desktop and on a USB
   stick; also on the owner's phone. Open by double click (Chrome or
   Safari). Rebuild: `pnpm --filter @payroll/web build:offline`, output
   `apps/web/dist-offline/mubinflow-demo.html`.
2. Guests' phones: AirDrop or message the file; it opens from Files.
3. Screen recording: record the click script (steps 1 to 4) on the
   laptop beforehand, keep it on the desktop, and play it full screen if
   even the laptop fails. Say so plainly: "this is a recording".
4. Phones without the file: show the QR code later, when the network is
   back; do not wait for it in the meeting.
