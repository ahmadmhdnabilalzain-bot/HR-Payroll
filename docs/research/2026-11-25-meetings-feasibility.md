# In-App Meetings: Feasibility (25 Nov 2026)

One researcher, 11 searches, snippets only. No legal conclusions. UNVERIFIED
means check the official page before relying on it.

## Real-time video and audio options

| Option | Notes |
|---|---|
| Twilio Video | The announced end-of-life was reversed in Oct 2024; still a standalone product (confirm in Twilio's changelog) |
| LiveKit | Open source: self-host or LiveKit Cloud; recording metered as transcode minutes; region pinning only on higher plans; a Middle East region was not found |
| Daily | Usage-based, about $0.004 per participant-minute reported by a third party (UNVERIFIED); recording and transcription cost extra |
| Agora | Per participant-minute with a free tier (10,000 minutes a month); regional needs go to contract |
| Zoom SDKs | Meeting SDK per host or tier, Video SDK per session minute (secondhand, UNVERIFIED) |
| Jitsi, Teams or Meet embedding | Not found in these searches |

Self-hosting (LiveKit or Jitsi) could keep media in a UAE cloud region. That is
an architecture inference, not a sourced claim.

## UAE telecom rules (verify with TDRA and counsel)

Secondary sources say VoIP and video calling is restricted to licensed or
approved providers, that over-the-top services partner with licensed operators
(Etisalat, du), and that illegal VoIP use may be an offence. Sources disagree on
which apps are permitted. **Whether an enterprise app embedding meetings between
employees counts as a regulated service was not found.** No 2025 to 2026 TDRA
update found. This must be checked before any meeting feature ships.

## Transcription

- No independent 2026 benchmark for Gulf Arabic mixed with English was found.
  Vendor claims only (Speechmatics, Cohere); one academic paper found Whisper
  large-v3-turbo best of those tested, on a small single-speaker corpus.
- Residency: Azure Speech keeps data in the resource's region (UAE North listed,
  STT availability to be checked); AWS Transcribe lists Gulf Arabic (ar-AE),
  me-central-1 availability not confirmed; Google, Deepgram, OpenAI UAE
  residency not found. A self-hosted Whisper-class model is an option for
  residency control.
- Test candidates on our own audio before choosing.

## Summaries and tasks (engineering guidance, not sourced)

- Structured output per item: decision or task, owner, due date, and a verbatim
  quote span with timestamps; reject any item without a quote.
- Risks: invented tasks or deadlines, wrong owner (similar names, Arabic
  transliteration), dropped negation, speech-recognition errors carried into the
  summary.
- Safe pattern: items stay "proposed"; the organizer or assignee confirms or
  edits each one before the task manager creates it; show the transcript
  segment and an audio link beside each item. Never auto-assign.

## Consent and privacy (what to check)

PDPL (Federal Decree-Law 45 of 2021) and whether its executive regulations are in
force (sources conflict). Commentary says monitoring rests on notice and
consent, which can be withdrawn, with explicit and specific consent and limited
retention. Checklist: an in-meeting recording banner, pre-join notice, a
non-recorded mode, a per-company retention setting, access limited to
participants and the organizer, an audit log, processor terms with any
transcription or language-model vendor, cross-border rules, DIFC and ADGM
regimes. Employee consent validity under a power imbalance is a question for
counsel. No source addressed meeting recording directly.

## Rivals

Zoho Cliq: AI transcript, summary and action items (Arabic support not shown).
Keka: AI transcription, summaries and action items for 1:1s via Teams, Zoom and
Meet integrations. Microsoft Copilot in Teams: Arabic recap added in 2024,
licence required. Zoho Meeting and Bayzat: not found.
