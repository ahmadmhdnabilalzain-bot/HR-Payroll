import { useMemo, useState } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { ALL_AREAS } from "../../nav/areas";
import { mayOpen, routeOf } from "../../nav/registry";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { PageHead } from "../../ui/templates";
import tp from "../../ui/templates/templates.module.css";
import { useMakerChecker } from "../../pay/parts";
import { useReportCrumbs } from "../fmt";
import s from "./checks.module.css";

/** X12: ready report templates; each opens a report that exists. */
export function TemplatesScreen() {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const mc = useMakerChecker();
  const crumbs = useReportCrumbs();
  const choices = useMemo(() => data.checks.templateChoices(), [data]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const filterOf = (id: string, kind: string): string => picked[id] ??
    (kind === "month" ? choices.months[0]!.value : "");
  const ctx = { data, state };
  const hrefFor = (areaId: string, filter: string): string | null => {
    const area = ALL_AREAS.find((a) => a.id === areaId);
    if (area === undefined || area.status !== "live") return null;
    const r = routeOf(area, ctx);
    if (!mayOpen(state.role, r)) return null;
    return hrefOf(r.section, ...(r.rest ?? []),
      ...(filter === "" ? [] : [filter]));
  };
  const options = (kind: string): { value: string; label: string }[] =>
    kind === "month" ? choices.months
      : [{ value: "", label: "All cost centres" }, ...choices.departments];
  const words = (kind: string, filter: string): string =>
    kind === "none" || filter === "" ? "" : options(kind).find((o) =>
      o.value === filter)?.label ?? "";

  const save = (id: string): void => {
    const t = data.checks.templates.find((x) => x.id === id)!;
    const filter = filterOf(id, t.filter);
    if (state.savedViews.some((v) => v.templateId === id &&
      v.filter === filter)) {
      toast.show("That view is already saved");
      return;
    }
    const name = data.checks.viewName(t, words(t.filter, filter));
    const vid = `view-${state.nextView}`;
    dispatch({ type: "view-save", view: { name, templateId: id, filter,
      by: mc.makerId, role: state.role, on: mc.today } });
    toast.show(`Saved ${name}`, () => dispatch({ type: "view-remove",
      id: vid }));
  };
  const remove = (id: string): void => {
    const v = state.savedViews.find((x) => x.id === id);
    if (v === undefined) return;
    dispatch({ type: "view-remove", id });
    toast.show(`Removed ${v.name}`, () => dispatch({ type: "view-save",
      view: { name: v.name, templateId: v.templateId, filter: v.filter,
        by: v.by, role: v.role, on: v.on } }));
  };
  const cards = data.checks.templates.filter((t) =>
    hrefFor(t.areaId, "") !== null);
  const views = state.savedViews.flatMap((v) => {
    const t = data.checks.templates.find((x) => x.id === v.templateId);
    const href = t === undefined ? null : hrefFor(t.areaId, v.filter);
    return href === null ? [] : [{ v, href }];
  });
  return (
    <div className={tp.page}>
      <PageHead title="Report templates" crumbs={crumbs}
        lede={"Ready reports. Pick a template, set what you want to see, " +
          "and open it, or save the view to come back to."} />
      <ul className={s.gallery} aria-label="Templates">
        {cards.map((t) => {
          const filter = filterOf(t.id, t.filter);
          const id = `tpl-${t.id}`;
          return (
            <li key={t.id} className={s.card}>
              <h2>{t.title}</h2>
              <p>{t.asks}</p>
              {t.filter !== "none" && (
                <label className={tp.field} htmlFor={id}>
                  <span>{t.filterLabel}</span>
                  <select id={id} value={filter}
                    onChange={(e) => setPicked({ ...picked,
                      [t.id]: e.target.value })}>
                    {options(t.filter).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className={s.cardActs}>
                <a className={`${b.btn} ${b.secondary}`}
                  href={hrefFor(t.areaId, filter)!}
                  aria-label={`Open ${t.title}`}>Open</a>
                <button type="button" className={`${b.btn} ${b.quiet}`}
                  aria-label={`Save my view of ${t.title}`}
                  onClick={() => save(t.id)}>Save my view</button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className={s.wrap}>
        <h2 className={s.h2}>My views</h2>
        {views.length === 0 ? (
          <p className={s.basis}>No saved views yet. Pick a template and
            choose Save my view.</p>
        ) : (
          <ul className={s.views} aria-label="My views">
            {views.map(({ v, href }) => (
              <li key={v.id}>
                <a href={href}>{v.name}</a>
                <span className={s.muted}>{`Saved ` +
                  formatDate(v.on, lang)}</span>
                <button type="button" className={`${b.btn} ${b.quiet}`}
                  aria-label={`Remove ${v.name}`}
                  onClick={() => remove(v.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <p className={s.basis}>
          A template opens the report that already exists, set to the
          month or cost centre you pick. Saved views stay in this demo.
        </p>
      </div>
    </div>
  );
}
