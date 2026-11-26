import type { ComponentType } from "react";
import type { ViewProps } from "../../views";
import { Catalogue } from "../Catalogue";

/** X34 on its own address: the reports home with the box focused. */
function AskScreen() {
  return <Catalogue autoFocusAsk />;
}

export const ASK_SCREENS: Record<string,
  { view: ComponentType<ViewProps> }> = { ask: { view: AskScreen } };
