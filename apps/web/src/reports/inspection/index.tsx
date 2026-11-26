import { Suspense, type ComponentType } from "react";
import type { ViewProps } from "../../views";
import { Inspection } from "./Inspection";
import { RemediesScreen } from "./Remedies";
import { Room } from "./Room";
import { Loading } from "../../ui/templates";

/** Loads the chunk behind one quiet line, then the screen. */
const wrap = (V: ComponentType<ViewProps>): ComponentType<ViewProps> => {
  function Wrapped(p: ViewProps) {
    return (
      <Suspense fallback={<Loading label="Working it out…" />}>
        <V {...p} />
      </Suspense>
    );
  }
  return Wrapped;
};

function InspectionRoute(p: ViewProps) {
  return p.rest[1] === "room" ? <Room /> : <Inspection {...p} />;
}

/** WP22 screens for the Reports router (HR and the General manager). */
export const INSPECTION_SCREENS: Record<string, {
  view: ComponentType<ViewProps>; gmOnly?: boolean; itOk?: boolean }> = {
  inspection: { view: wrap(InspectionRoute) },
  "error-remedies": { view: wrap(RemediesScreen) },
};

export const INSPECTION_BLURBS: Readonly<Record<string, string>> = {
  "reports.inspection": "What evidence can we hand an inspector for a " +
    "month?",
  "reports.error-remedies": "Which payroll errors were found, and how " +
    "were they put right?",
};
