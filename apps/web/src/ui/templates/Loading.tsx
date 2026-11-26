import m from "./motion.module.css";
import s from "./templates.module.css";

/**
 * Loading, for a lazy chunk or data still on its way: a skeleton in
 * the shape of a page (a title, a line, four rows) with a slow shimmer,
 * never a blank. It shows only after 120 ms, so a quick load never
 * flashes it. Screen readers hear `label` once (role="status").
 * `page` (the default) sets it in the page column, where a page would
 * be; false when it already sits inside one.
 */
export function Loading(p: { label: string; rows?: number;
  page?: boolean }) {
  const rows = Math.max(1, Math.min(p.rows ?? 4, 6));
  const bones = (
    <div className={m.skeleton} role="status" aria-busy="true">
      <span className="visually-hidden">{p.label}</span>
      <span className={m.bone} data-w="title" aria-hidden="true" />
      <span className={m.bone} data-w="lede" aria-hidden="true" />
      <span className={m.rows} aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className={m.bone} data-w="row" />
        ))}
      </span>
    </div>
  );
  return p.page === false ? bones : <div className={s.page}>{bones}</div>;
}
