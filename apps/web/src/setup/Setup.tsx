import { useEffect } from "react";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { areasFor, firstRoute } from "../nav/registry";
import { Outside } from "../shell/Outside";
import type { ViewProps } from "../views";
import { AuditorAccess } from "./auditor/AuditorAccess";
import { SetupAccess } from "./access/SetupAccess";
import { SetupErp } from "./erp";
import { SetupPrivacy } from "./privacy/SetupPrivacy";
import { SetupMore } from "./more";
import { SetupRules } from "./rules/SetupRules";
import { SetupRuleChange } from "./rule-change";
import { SetupMigration } from "./migration/SetupMigration";
import { SetupStructure } from "./structure/SetupStructure";
import { SetupHome } from "./home/SetupHome";

/**
 * One Setup view for the registry. Rule screens live under
 * `#/setup/rules/...`; access, connections and data under their own
 * prefixes (`access`, `connections`, `data`).
 */
export function Setup(p: ViewProps) {
  const { state } = useDemo();
  if (p.rest.length === 0 && areasFor(state.role, "setup").length > 0) {
    return <SetupHome />;
  }
  const bare = p.rest.length === 0 ||
    (p.rest[0] === "access" && p.rest.length === 1);
  return bare ? <SetupFront /> : <SetupArea {...p} />;
}

/**
 * Bare `#/setup` is the Setup home (every area and its state) for a
 * role that may open Setup. `#/setup/access` names no page: such a
 * role goes to its first area (the hash is replaced, so Back
 * does not land here again); any other role sees "not found".
 */
function SetupFront() {
  const { data, state } = useDemo();
  const first = areasFor(state.role, "setup").length === 0 ? null
    : firstRoute(state.role, "setup", { data, state });
  const to = first === null ? null
    : hrefOf(first.section, ...(first.rest ?? []));
  useEffect(() => {
    if (to !== null && to !== location.hash) location.replace(to);
  }, [to]);
  return to === null ? <Outside missing /> : null;
}

function SetupArea(p: ViewProps) {
  if (p.rest[0] === "erp") return <SetupErp {...p} />;
  if (p.rest[0] === "auditor") return <AuditorAccess />;
  if (p.rest[0] === "more") return <SetupMore {...p} />;
  if (p.rest[0] === "privacy") return <SetupPrivacy {...p} />;
  if (p.rest[0] === "structure") return <SetupStructure {...p} />;
  if (p.rest[0] === "migration") return <SetupMigration {...p} />;
  if (p.rest[0] === "rule-change") return <SetupRuleChange {...p} />;
  return p.rest[0] === "rules" ? <SetupRules {...p} /> : <SetupAccess {...p} />;
}
