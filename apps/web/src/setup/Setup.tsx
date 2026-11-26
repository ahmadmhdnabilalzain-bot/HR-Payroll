import type { ViewProps } from "../views";
import { SetupAccess } from "./access/SetupAccess";
import { SetupRules } from "./rules/SetupRules";

/**
 * One Setup view for the registry. Rule screens live under
 * `#/setup/rules/...`; access, connections and data under their own
 * prefixes (`access`, `connections`, `data`).
 */
export function Setup(p: ViewProps) {
  return p.rest[0] === "rules" ? <SetupRules {...p} /> : <SetupAccess {...p} />;
}
