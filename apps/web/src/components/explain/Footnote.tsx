import { PageFoot } from "../../ui/templates/PageFoot";

/**
 * Provenance, said once per page and quietly: the templates' own
 * sources line ("Fictional demo data. Rules as we read them."), for a
 * page that is not built on a template. Source statuses for each rule
 * live only in the explain panel.
 */
export function Footnote(p: { className?: string | undefined }) {
  return <PageFoot className={p.className} />;
}
