# MubinFlow promo video: story and shot list (proposal)

Status: PROPOSAL for the owner to approve. Nothing is filmed, recorded or
edited until the owner says yes (see LEDGER section 21: no in-progress
videos; the promo is the last gate). Length 4:30 (inside the 4 to 5 minute
brief). Features are drawn from `docs/demo/coverage-3.md` (branch count:
176 of 207 rows live). Only live areas appear; nothing in the "not built"
list (pension in the run, bonus run, Arabic review, assistant, commission)
is shown or mentioned. All people, the company and the bank are sample data
shown as such on screen ("MubinFlow demo: fictional data").

## Look and sound

- Ink, paper and one cool grey family. No other accent. Plain paper
  background cards, ink type, thin grey rules.
- Wordmark: "Mubin" in Montserrat Bold, "Flow" in Montserrat Light, ink on
  paper (paper on ink for the closing card). Spelled MubinFlow in all text.
- Captions in Montserrat Medium, sentence case, short. Burned in, so the
  video works with sound off.
- Sound off by default in any web embed (ruling). The master has a quiet
  music bed and one voice; the file is also delivered as a muted loop and
  with subtitles (.srt).
- Voice: calm, plain, one speaker, no hype words. Music: sparse, warm
  piano and soft pulse, builds slightly in scenes 5 to 7, resolves on the
  wordmark.

## Words we do not use

No "compliant", "certified", "guaranteed", "approved by" any authority, no
regulator or ministry endorsement, no "legal", "audit-proof". Use "as we
read the law", "source-cited", "checks the file's layout", "we will
confirm". The salary file scene says the layout matches published bank
guides and is unconfirmed by the authority. E-signature scene says it is a
demonstration of the workflow with no legal validity claimed. The bank is
called "the bank" if mentioned; the story needs no client name.

## Scene list (total 4:30)

Route names follow the app's sections (home, pay-run, people, time, reports,
setup, me). Exact routes and sample figures are read from the build at
record time; figures below are examples and must be re-read from the screen.

| # | Time | Scene | Voice-over | On screen (role, route) | Caption | Music |
|---|---|---|---|---|---|---|
| 1 | 0:00 to 0:20 | Cold open: the problem | "It is the last week of the month. Somewhere, a spreadsheet is about to decide whether people get paid." | Black ink frame, a cell cursor blinking, a list of "final_v7" file names fading out. Graphic only, no app. | Payday should not be a guess | Single low note, silence between |
| 2 | 0:20 to 0:40 | Brand | "MubinFlow. HR and payroll for UAE companies, built to explain itself." | Wordmark builds letter by letter (Bold then Light), then crossfades to Home. If the owner approves the 3D opening (branch cine), its ribbon resolves into the wordmark here; otherwise the flat build. | MubinFlow: HR and payroll for UAE businesses | Piano enters |
| 3 | 0:40 to 1:15 | One sentence | "Home answers one question: can this month be paid, and what is my next step." | HR manager, home. Push in on the sentence ("2 bank details hold October pay") and the five-step strip. | One question, one next step | Steady pulse |
| 4 | 1:15 to 1:55 | Why this number | "Every figure opens up. Gross, deductions, net, each line with the rule behind it." | HR manager, home: open "Why this number" side panel; scroll the working; hover a rule source tag. | Every number can be opened | Same |
| 5 | 1:55 to 2:30 | Fix before payday | "Missing bank detail. A typo the bank would bounce. Caught before payday, not after." | HR manager: "Enter bank details", fill from the sample bank letter, "Save and check"; the held amount flows into the file total (cinematic moment 2 if approved, else a calm count-up). | Caught before payday | Builds |
| 6 | 2:30 to 3:00 | Two people sign | "One person prepares. A different person signs off." | Switch role to General manager; "Approve pay run"; the sign-off stamp (name, role, time) lands. | Prepared by one, signed off by another | Builds |
| 7 | 3:00 to 3:25 | The salary file | "Then the salary file. Checked in plain English. The layout matches published bank guides; we will confirm it with the authority." | HR manager, reports files: generate the file, open the plain-English check report, download. | A file you can read before you send it | Peak, then softer |
| 8 | 3:25 to 3:50 | Gratuity, explained | "When someone leaves, the end-of-service figure shows its working, step by step, with sources." | HR manager, people, a leaver's settlement: the figure lifts into its working (cinematic moment 3 if approved). | End of service, with the working shown | Soft |
| 9 | 3:50 to 4:10 | Employees, on a phone | "Employees ask for leave and see payslips on their own phone. Managers decide in one tap." | Phone capture (390x844): Employee role asks for leave; cut to manager approving; payslip view. Real phone frame is a plain device outline, no brand. | Made for the phone in your pocket | Light |
| 10 | 4:10 to 4:20 | IT and controls | "IT sees who can do what, and a log nobody can quietly edit." | IT manager, setup: roles and access, audit log, auditor access. | Access you can see, a log you can trust | Light |
| 11 | 4:20 to 4:30 | Close | "MubinFlow. Pay people correctly, and show how." | Paper-on-ink wordmark, line "Request a walkthrough" (no URL until hosting is decided). | MubinFlow | Resolve, hold, fade |

Timing note: scene 10 runs 4:10 to 4:20 and the close 4:20 to 4:30; scenes
3 to 9 hold the story spine and can lose 10 to 15 seconds each if the cut
runs long. Optional montage (only if scenes 3 to 9 are trimmed to make room),
drawn only from live rows: documents and letters with verifiable codes,
Emiratisation report, time and leave policies, expenses, privacy and
retention register, payroll forecast. Pick at most four.

## How it would be captured

- Source: the finished, approved build on the offline single-file demo or
  the approved unlisted link; sample data only, fixed "today" of the demo.
- Playwright (Chromium) scripts, one per scene, with the page recording on:
  desktop viewport 1440x900 at device scale 2, light theme, reduced
  idle time; phone scenes at 390x844 scale 3 with mobile emulation and
  touch. Scripts use the same selectors as the e2e suite. Scene scripts
  type with a fixed delay, move a visible cursor overlay, and wait on
  visible states (not fixed sleeps) so retakes are identical.
- Playwright's own video is low quality, so record frames by screenshot
  stream at 60 fps, or use CDP screencast, then encode to ProRes or
  lossless H.264. Each scene is recorded as its own file with a clean
  reset of the demo store, so a retake never needs the others.
- Voice-over: recorded or synthetic voice chosen by the owner; script above
  is the text; subtitles are generated from it, not from audio.
- Sound off by default on any web embed.

## How it would be edited

- Preferred: Remotion project (React) in a scratch folder outside the
  product code. Each scene is a composition: the raw capture as a video
  layer, plus captions, zoom and pan keyframes, the wordmark build, and
  the sign-off and figure-lift graphics redrawn in the same ink and paper
  palette. Render 1920x1080 at 30 fps (H.264, AAC), plus a 1080x1920 cut
  of scenes 3, 5 and 9 for phones.
- Fallback: ffmpeg only (concat, crop and scale, drawtext captions, music
  duck under voice, loudnorm to -16 LUFS). Faster, plainer, no animated
  wordmark.
- Deliverables: 4:30 master, 30-second cut (scenes 2, 3, 5, 11), muted
  loop, .srt subtitles, a still poster. Draft review is by the owner only
  after the full browser walkthrough passes, and only as one final file.

## Decisions for the owner

1. Approve the story, running order and length (or name cuts).
2. Include the 3D opening (branch cine) in scene 2 and the cinematic
   moments in scenes 5, 6 and 8, or keep the calm versions.
3. Voice: recorded by a person or synthetic; English only for now.
4. Closing line and call to action, once the hosting decision is made.
5. Remotion or ffmpeg.
