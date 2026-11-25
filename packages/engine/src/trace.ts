import { EngineError } from "./errors";
import type { ResolvedParam } from "./rules/types";
import type { TraceLine, TraceRule } from "./trace-types";

const copyLine = (l: TraceLine): TraceLine => ({
  ...l,
  inputs: { ...l.inputs },
  rules: l.rules.map((r) => ({ ...r })),
});

export class TraceBuilder {
  private readonly entries: TraceLine[] = [];
  private readonly ids = new Set<string>();

  add(line: TraceLine): void {
    if (this.ids.has(line.id)) {
      throw new EngineError(
        "DUPLICATE_TRACE_ID",
        `Duplicate trace line id: ${line.id}`,
        { id: line.id },
      );
    }
    this.ids.add(line.id);
    this.entries.push(copyLine(line));
  }

  lines(): TraceLine[] {
    return this.entries.map(copyLine);
  }
}

export function traceRule(param: ResolvedParam): TraceRule {
  return {
    key: param.key,
    value: String(param.value),
    status: param.status,
    packId: param.packId,
    packVersion: param.packVersion,
    overridden: param.overridden,
  };
}
