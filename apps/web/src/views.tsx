import type { ComponentType } from "react";
import type { Section } from "./demo/state";
import { Home } from "./home/Home";
import { PayRun } from "./payrun/PayRun";
import { People } from "./people/People";
import { Reports } from "./reports/Reports";
import { SectionPage } from "./shell/SectionPage";
import { TimeOff } from "./timeoff/TimeOff";

/**
 * The views of the demo, one per top-level section. A section shows in
 * the top bar, the phone bar and the search palette only once it has a
 * view here, so there are never dead links. Builders of other sections
 * add their entry (one line) and nothing else in the shell.
 */
export interface ViewProps {
  /** Path parts after the section (`#/people/emp-001` → ["emp-001"]). */
  rest: string[];
}

export const VIEWS: Partial<Record<Section, ComponentType<ViewProps>>> = {
  home: Home,
  "pay-run": PayRun,
  people: People,
  "time-off": TimeOff,
  reports: Reports,
  s: SectionPage,
};
