import type { Fils } from "@payroll/engine";
import type { Figures } from "../../demo/figures";
import type { Verdict } from "../../demo/state";
import type { MoreSource } from "./source";

type OwnerBrief = MoreSource["brief"];
type BriefItem = OwnerBrief["items"][number];
type BoardPack = MoreSource["board"];

/** The brief's live inputs: the shared figures and the run's verdict. */
export interface BriefLiveInput {
  fig: Figures;
  verdict: Verdict | undefined;
  /** The settlement total as the shared state has it (other dues in). */
  settlementFils: Fils | null;
}

export interface LiveRow {
  amount: Fils | null;
  count: number | null;
  next: string;
}

/** One brief row as the demo stands now; the package wrote the rest. */
export function briefLive(i: BriefItem, x: BriefLiveInput): LiveRow {
  const same: LiveRow = { amount: i.amount, count: i.count, next: i.next };
  switch (i.live) {
    case "issues-open":
      return { ...same, count: x.fig.open, next: x.fig.open === 0
        ? "Nothing left to fix." : i.next };
    case "held":
      return { ...same, amount: x.fig.heldNetFils,
        next: x.fig.heldNetFils === 0n ? "Nothing is held out now."
          : i.next };
    case "settlement":
      return { ...same, amount: x.settlementFils ?? i.amount };
    case "approvals-waiting":
      if (x.verdict === "approve") return { ...same,
        next: "Signed off. The salary file can be made." };
      if (x.verdict === "decline") return { ...same,
        next: "Declined. The run goes back to be corrected." };
      return same;
    default: return same;
  }
}

/** The owner brief's table rows: item, what next, figure. */
export function briefRows(brief: OwnerBrief, x: BriefLiveInput,
  m: (f: Fils) => string): string[][] {
  const rows = brief.items.map((i) => {
    const n = briefLive(i, x);
    const figure = n.amount !== null ? m(n.amount)
      : n.count !== null ? String(n.count) : "";
    return [`${i.area}: ${i.item}`, `${i.text} ${n.next}`, figure];
  });
  return [...rows, ...brief.dates.map((d) =>
    [`Dates: ${d.label}`, d.text, ""])];
}

/** The board pack's rows, the live ones read from the shared figures. */
export function boardRows(board: BoardPack, fig: Figures,
  m: (f: Fils) => string): string[][] {
  return board.rows.map((r) => {
    const text = r.live === "issues-open" ? String(fig.open) : r.text;
    return [`${r.topic}: ${r.measure}`, r.note,
      r.amount !== null ? m(r.amount) : (text ?? "")];
  });
}
