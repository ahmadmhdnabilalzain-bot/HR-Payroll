# Engineering Standards

The owner's rule: organized code, no long lines, always easy to debug, and a
ready handover in the repo at all times. These rules are enforced by tooling
where possible, not by memory.

## Layout and size

- One responsibility per file. Split by responsibility, not by technical
  layer.
- Line length: **80 characters maximum** (enforced by the formatter and
  linter; the build fails on violations).
- Functions: aim for under 30 lines. If a function needs a comment to explain
  a block, extract the block and name it.
- No file over about 300 lines; split first.

## Debuggability

- **Pure engine.** Payroll code has no database, network or clock access.
  Inputs in, result and trace out. Any failure reproduces from one JSON file.
- **Trace everything.** Every number in a result records its inputs and the
  rule-pack id and version that produced it.
- **Fail loudly and specifically.** Errors carry a stable code, the offending
  value and where it came from. No silent fallbacks; no swallowed errors.
- **Explicit types at boundaries.** Validate all external input with a schema
  at the edge; inside, trust the types.
- **No hidden state.** Time, randomness and configuration are passed in.
- **Structured logging** with a request or run id on every line (once there is
  a service).
- **Reproduce first.** Every bug fix starts with a failing test that captures
  it.

## Rules and money

- Money is integer fils. No floating point. Rounding mode is an explicit,
  named parameter.
- Every statutory value (rate, cap, divisor, threshold) lives in a rule-pack
  parameter with a source URL and a status: `sourced` or `unsourced`.
  Unsourced values have no default; the engine refuses to run without an
  explicit value and says so.

## Testing

- Test-driven: failing test, then the minimum code, then refactor.
- Case library: each case is a data file with inputs, expected output, and
  the source of the rule. A runner prints pass or fail per case with the
  trace on failure.
- Property tests for invariants (totals equal the sum of lines, no negative
  net pay without an explicit reason, re-running a run gives identical
  output).

## Git and handover

- Small commits with clear messages. Tests pass on every commit.
- Update `HANDOVER.md` in the same commit as any change of state or next
  step. Update `LEDGER.md` whenever the owner decides or instructs anything.
- Never commit secrets, real employee data or real bank details.
