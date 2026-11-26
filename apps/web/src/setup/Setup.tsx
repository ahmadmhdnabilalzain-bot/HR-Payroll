import type { ViewProps } from "../views";
import { SetupAccess } from "./access/SetupAccess";
import { SetupPrivacy } from "./privacy/SetupPrivacy";
import { SetupMore } from "./more";
import { SetupRules } from "./rules/SetupRules";
import { SetupMigration } from "./migration/SetupMigration";
import { SetupStructure } from "./structure/SetupStructure";

/**
 * One Setup view for the registry. Rule screens live under
 * `#/setup/rules/...`; access, connections and data under their own
 * prefixes (`access`, `connections`, `data`).
 */
export function Setup(p: ViewProps) {
  if (p.rest[0] === "more") return <SetupMore {...p} />;
  if (p.rest[0] === "privacy") return <SetupPrivacy {...p} />;
  if (p.rest[0] === "structure") return <SetupStructure {...p} />;
  if (p.rest[0] === "migration") return <SetupMigration {...p} />;
  return p.rest[0] === "rules" ? <SetupRules {...p} /> : <SetupAccess {...p} />;
}
