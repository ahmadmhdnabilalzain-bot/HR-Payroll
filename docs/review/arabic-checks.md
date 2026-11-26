# Arabic review: checklist and scanner

> **NEEDS NATIVE REVIEW.** No employee may see Arabic until a native speaker
> has signed `docs/review/arabic-review-pack.md` (section 9).

## 1. Scanner

`docs/review/scan-arabic.mjs` is plain node (22 or later), with no
dependencies. It only reads files. It scans the whole repo except
`node_modules`, `dist`, `.git`, `.claude` (agent worktrees) and
`docs/review` itself.

```
node docs/review/scan-arabic.mjs
node docs/review/scan-arabic.mjs --summary
node docs/review/scan-arabic.mjs --format tsv
node docs/review/scan-arabic.mjs --format json
node docs/review/scan-arabic.mjs --check docs/review/arabic-review-pack.md
```

What it reports for every hit: file, line, area, kind (string, prose,
digits, punct, escape or bidi), the line text, and flags: eastern-digits,
western-digits, placeholder, latin-in-arabic, arabic-punct, bidi-control,
and claim:word for words that could read as approval, compliance,
certification or a legal conclusion. It reads Arabic, Arabic Supplement,
Arabic Extended-A and both Presentation Forms blocks, and reports `\u06xx`
escapes and bidi control characters separately in the summary.

`--check` exits 1 and prints `MISSING file:line [area] text` when an Arabic
run in the repo is not in the pack. It is a drift check, not a proof of
completeness: a run that appears only in an appendix also passes. Use it
in review and in CI.

At the time of writing the scan finds 336 lines in 36 files (463 Arabic
runs), and the pack has 215 logical-string rows (see pack section 2).

## 2. Checklist when Arabic text is added or changed

Before merging a change that touches Arabic:

- [ ] The new text is marked `NEEDS NATIVE REVIEW` in the source file.
- [ ] `node docs/review/scan-arabic.mjs --check` with the pack path
  (docs/review/arabic-review-pack.md) is run, and every MISSING line is
  added to the pack with English, Arabic, context, a risk rating and
  flags.
- [ ] The reviewer-decision column is blank for new or changed rows.
- [ ] No Arabic is shown to an employee unless the pack is signed.
- [ ] No Arabic wording claims approval, compliance, certification,
  official status or a legal conclusion (words flagged `claim:` in the
  scan are checked by hand).
- [ ] Every figure is shown with its source status, and the status word is
  reviewed (`STATUS:*` rows).
- [ ] Plural: the text works for 0, 1, 2, 3-10, 11-99 and 100+, or it
  uses the six-form catalog.
- [ ] Digits and currency follow the decision in glossary section 4.
- [ ] Mixed direction: names, codes, ISO dates, times and amounts are
  wrapped in isolates or placed so they cannot reorder.
- [ ] Gender: the imperative and predicate forms follow the agreed
  convention (pack section 3.5).
- [ ] Terms follow the glossary; any new inconsistency is added to
  glossary section 2.
- [ ] A catalog key exists for the English and the Arabic (a missing Arabic
  key fails typecheck; an unknown trace id falls back to English plus
  "[untranslated]", which an Arabic reader must not see).
- [ ] Tests that pin Arabic wording (pack Appendix A, WORDING) are
  updated together with the text.
- [ ] The consent texts (WhatsApp, meeting recording) have had legal
  review as well as native review, and any change bumps the consent
  version so the hash changes.

## 3. Checklist for the native reviewer

- [ ] Read section 1 and 3 of the pack, then area G first (consent) and
  area A and B (money, legal), then the rest.
- [ ] For every row write ACCEPT, CORRECT (with the Arabic) or REJECT.
- [ ] Answer the style questions in glossary section 4.
- [ ] Choose a term for every inconsistency in glossary section 2.
- [ ] Confirm or reject each term in pack section 4.
- [ ] Note any text that is correct Arabic but wrong for the UAE Gulf
  audience.
- [ ] Fill in the sign-off block (section 9 of the pack).

## 4. Manual checks the scanner cannot do

- Read the Arabic on a real screen and in the CLI terminal with the
  right-to-left direction on.
- Check line breaks of long payslip lines with a long name and a large
  amount.
- Check the letters and any exported PDF for letter-joining and fonts.
- Have counsel read the lines flagged `[CLAIM]` that state a legal limit,
  entitlement or consent.
