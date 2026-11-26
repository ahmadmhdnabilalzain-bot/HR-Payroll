import {
  boardPack,
  buildDemoCompany,
  itDashboard,
  loansReport,
  ownerBrief,
  type BoardPack,
  type ItDashboard,
  type LoansReport,
  type OwnerBrief,
} from "@payroll/demo-data";

/**
 * The owner brief, board pack, loans report and IT dashboard (a lazy
 * chunk). Everything is read from the package's selectors; this file
 * only gathers them.
 */
export interface MoreSource {
  brief: OwnerBrief;
  board: BoardPack;
  loans: LoansReport;
  it: ItDashboard;
}

export function buildMoreSource(): MoreSource {
  const c = buildDemoCompany();
  return { brief: ownerBrief(c), board: boardPack(c),
    loans: loansReport(c), it: itDashboard(c) };
}
