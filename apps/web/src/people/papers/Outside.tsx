import { hrefOf } from "../../demo/route";
import { PageHead } from "../../ui/templates";
import s from "./papers.module.css";

/** Papers are for HR and the General manager only. */
export function Outside() {
  return (
    <div className={s.page}>
      <PageHead title="Outside your view"
        lede="Requests, letters, visas and warnings are for HR and the
          General manager."
        back={{ label: "People", href: hrefOf("people") }} />
    </div>
  );
}

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
