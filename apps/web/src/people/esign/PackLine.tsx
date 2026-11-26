import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { linkHref } from "./Esign";
import { lastReminder, packCount } from "./model";
import { useEsign, useSigner } from "./Sign";
import s from "./esign.module.css";
import { E } from "./words";

/**
 * A new person's joining pack on HR's New employee record: "Signing
 * pack: 3 of 7 signed", the last reminder, Send a reminder, and the
 * signing link HR passes on. Nothing when the person has no pack.
 */
export function PackLine(p: { packKey: string }) {
  const { data, state, dispatch } = useDemo();
  const { world, rows } = useEsign();
  const me = useSigner();
  const toast = useToast();
  const pack = world.packs.find((x) => x.key === p.packKey);
  if (pack === undefined) return null;
  const n = packCount(rows, pack);
  const closed = world.closed.has(pack.key);
  const done = n.signed === n.total;
  const last = lastReminder(state.esignLog, pack.key);
  const remind = (): void => {
    dispatch({ type: "esign", entry: { kind: "remind", target: pack.key,
      by: me.by, name: me.name, title: me.title, role: me.role,
      on: data.esign.asOf } });
    toast.show(E.remindToast(pack.name));
  };
  return (
    <span className={s.pack}>
      <span>{closed ? E.packClosed : E.pack(n.signed, n.total)}</span>
      {last !== null && <span>{E.reminded(`${data.esign.date(last.on)
        .display}, ${last.time}`)}</span>}
      {!closed && !done && (
        <span className={s.row}>
          {state.role === "hr" && (
            <button type="button" className={`${b.btn} ${b.quiet} ${s.tall}`}
              aria-label={`${E.remind}: ${pack.name}`} onClick={remind}>
              {E.remind}</button>)}
          <a className={`${b.btn} ${b.quiet} ${s.tall}`}
            href={linkHref(pack.key)}
            aria-label={`${E.openLink}: ${pack.name}`}>{E.openLink}</a>
        </span>)}
    </span>
  );
}
