import { hrefOf } from "../../demo/route";
import { PageHead } from "../../ui/templates";
import s from "./moves.module.css";

/** A record that does not exist: say so, and the way back. */
export function Missing(p: { what: string }) {
  return (
    <div className={s.frame}>
      <PageHead title={`We cannot find that ${p.what}`}
        lede="It may have been removed. Go back to the list."
        back={{ label: "People", href: hrefOf("people") }} />
    </div>
  );
}
