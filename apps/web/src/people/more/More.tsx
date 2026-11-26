import { useDemo } from "../../demo/state";
import { Outside } from "../../shell/Outside";
import type { ViewProps } from "../../views";
import { Cover } from "../../home/extra/Cover";
import { NewEmployee } from "./NewEmployee";

/**
 * `#/people/more/<screen>`: the new-employee sheet (P04) and approval
 * cover (H10). HR and the General manager only.
 */
export function More(p: ViewProps) {
  const { state } = useDemo();
  if (state.role !== "hr" && state.role !== "gm") return <Outside />;
  return p.rest[0] === "cover" ? <Cover /> : <NewEmployee />;
}
