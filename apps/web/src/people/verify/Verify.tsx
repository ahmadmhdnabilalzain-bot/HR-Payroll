import { useDemo } from "../../demo/state";
import { Outside } from "../../shell/Outside";
import type { ViewProps } from "../../views";
import { Check } from "./Check";
import { CodeRecord, Codes } from "./Codes";
import { Expiry } from "./Expiry";
import { Intake } from "./Intake";

/**
 * `#/people/verify/<screen>`: letter codes (P34), the check page that
 * anyone may open, document intake and the expiry list (P54). HR and
 * the General manager work the lists; the check page is open to every
 * role (the registry's `roles` is what the shell guard enforces).
 */
export function Verify(p: ViewProps) {
  const { state } = useDemo();
  const [screen, id] = p.rest;
  if (screen === "check") return <Check />;
  if (state.role !== "hr" && state.role !== "gm") return <Outside />;
  switch (screen) {
    case "letters":
      return id === undefined ? <Codes /> : <CodeRecord id={id} />;
    case "intake": return <Intake />;
    case "expiry": return <Expiry />;
    default: return <Outside />;
  }
}
