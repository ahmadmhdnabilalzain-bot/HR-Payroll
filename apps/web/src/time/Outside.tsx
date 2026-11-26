import { hrefOf } from "../demo/route";
import b from "../ui/button.module.css";
import { PageHead } from "../ui/templates";
import t from "../ui/templates/templates.module.css";
import { W } from "./words";

/** A deep link the role may not open: plain words, a way back. */
export function Outside() {
  return (
    <div className={t.page}>
      <PageHead title={W.outside} lede={W.outsideHelp} />
      <p>
        <a className={`${b.btn} ${b.secondary}`}
          href={hrefOf("time-off")}>{W.back}</a>
      </p>
    </div>
  );
}
