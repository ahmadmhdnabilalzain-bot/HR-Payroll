# Handover

Read this first. Keep it current: update it in the same commit as any change
of state. Last updated: 2026-11-25.

## What this project is

An HR and payroll product for UAE SMEs (about 10 to 250 employees,
mainland first). The edge: payroll that is correct, explainable and
source-cited, with an open API and Arabic from the start.

## Where things are

| Need | File |
|---|---|
| Owner decisions, instructions, future plan | `LEDGER.md` |
| Market research and competitor facts | `docs/research/2026-11-25-competitor-analysis.md` |
| Approved design | `docs/superpowers/specs/2026-11-25-uae-sme-hr-payroll-design.md` |
| Advisor's proof of features, superiority, market plan | `docs/superpowers/specs/2026-11-25-advisor-proof.md` |
| Combined competitor feature list (union, with plan status) | `docs/superpowers/specs/2026-11-25-combined-feature-list.md` |
| What could make us unique (proposals, rival-correctness leads) | `docs/superpowers/specs/2026-11-25-unique-candidates.md` |
| Code and debugging standards | `docs/engineering-standards.md` |
| Implementation plans | `docs/superpowers/plans/` |

## Current state

- Research: done. Design v2: approved by the owner, with amendments (see the
  block at the top of the design doc).
- Advisor's proof written (`docs/superpowers/specs/2026-11-25-advisor-proof.md`);
  **waiting for the owner to review it.**
- Code: **none yet.** The owner set this gate.
- Branch: `claude/quirky-wozniak-b7xkvr`. No pull request.

## Next step

1. Owner reviews the advisor's proof and answers its one question (how the
   product will be sold).
2. Write Plan 1 (payroll engine) and build it with tests first. Sources to
   read for its rules: the labour law and its executive regulation on
   `uaelegislation.gov.ae` (links in the proof doc).

## Tooling checked in this environment (25 Nov 2026)

Node v22, npm 10, pnpm 10, PostgreSQL client 16, Docker 29, Python 3.13.
Registry versions seen: typescript 7.0.2, vitest 5.1.2, decimal.js 10.6.0,
fast-check 4.11.0, zod 4.6.7, tsx 4.23.15. Re-check before pinning.

## Known risks

See design doc section 9 and `LEDGER.md` section 4.
