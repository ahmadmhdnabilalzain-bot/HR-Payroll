import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { waitingFor } from "./model";
import { useEsign, useSigner } from "./Sign";
import s from "./esign.module.css";
import { E } from "./words";

/**
 * Home's "To sign" row: how many papers wait for the viewer's own
 * signature, and one link to them (the employee's Documents to sign,
 * or the register for HR and the General manager). Hidden at zero.
 */
export function ToSignCard() {
  const { state } = useDemo();
  const { rows } = useEsign();
  const me = useSigner();
  const n = waitingFor(rows, me.by).length;
  if (n === 0) return null;
  const staff = state.role === "employee" || state.role === "manager";
  const href = staff ? hrefOf("me", "sign")
    : hrefOf("people", "files", "signatures");
  return (
    <section className={s.home} aria-labelledby="to-sign">
      <div className={s.homeText}>
        <h2 id="to-sign" className={s.homeTitle}>{`${E.hrHome}: ${n}`}</h2>
        <p className={s.note}>{E.hrHomeLine(n)}</p>
      </div>
      <a className={`${b.btn} ${b.secondary} ${s.tall}`} href={href}>
        {staff ? E.toSign : E.openToSign}</a>
    </section>
  );
}
