import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { waitingFor } from "./model";
import { useEsign, useSigner } from "./Sign";

/**
 * Home's "To sign" count for the viewer: how many papers wait for
 * their own signature, and where they are (the employee's Documents to
 * sign, or the register for HR and the General manager). It is one row
 * of Home's To do list, hidden at zero.
 */
export function useToSign(): { n: number; href: string } {
  const { state } = useDemo();
  const { rows } = useEsign();
  const me = useSigner();
  const n = waitingFor(rows, me.by).length;
  const staff = state.role === "employee" || state.role === "manager";
  return { n, href: staff ? hrefOf("me", "sign")
    : hrefOf("people", "files", "signatures") };
}
