import { PageHead } from "../../ui/templates";
import s from "./papers.module.css";

/** Papers are for HR and the General manager only: the shell's words. */
export { Outside } from "../../shell/Outside";

/** A deep link to a record that is not there. */
export function NotFound(p: { what: string; back: string; href: string }) {
  return (
    <div className={s.page}>
      <PageHead title={`No such ${p.what}`}
        lede="It may have been withdrawn, or the link is old."
        back={{ label: p.back, href: p.href }} />
    </div>
  );
}
