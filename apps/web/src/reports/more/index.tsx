import { Suspense, type ComponentType } from "react";
import type { ViewProps } from "../../views";
import { BoardPackScreen } from "./Board";
import { OwnerBriefScreen } from "./Brief";
import { ItDashboardScreen } from "./It";
import { LoansReportScreen } from "./LoansReport";
import { Loading } from "../../ui/templates";

/** Loads the chunk behind one quiet line, then the screen. */
const wrap = (V: ComponentType): ComponentType<ViewProps> => {
  function More() {
    return (
      <Suspense fallback={<Loading label="Working it out…" />}>
        <V />
      </Suspense>
    );
  }
  return More;
};

/** WP19 report screens for the Reports router (HR, GM, and IT). */
export const MORE_SCREENS: Record<string, { view: ComponentType<ViewProps>;
  gmOnly?: boolean; itOk?: boolean }> = {
  "owner-brief": { view: wrap(OwnerBriefScreen) },
  "board-pack": { view: wrap(BoardPackScreen), gmOnly: true },
  loans: { view: wrap(LoansReportScreen) },
  "it-dashboard": { view: wrap(ItDashboardScreen), itOk: true },
};

export const MORE_BLURBS: Readonly<Record<string, string>> = {
  "reports.owner-brief": "What needs the owner this week, in one page?",
  "reports.board-pack": "What are the period's figures for the board?",
  "reports.loans": "Who has a loan or advance, and what is still owed?",
  "reports.it-dashboard": "Is access, the connections and the audit " +
    "chain in order?",
};
