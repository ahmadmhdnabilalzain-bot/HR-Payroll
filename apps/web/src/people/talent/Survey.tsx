import type { SurveyView } from "../../demo/data/talent-types";
import { KeyValues, RecordTabs } from "../../ui/templates";
import { Outside, Progress, Status } from "../team/common";
import { talentHref } from "./common";
import { fill, T } from "./words";
import s from "./talent.module.css";

const W = T.surveys;

/** One survey: results and groups once closed, the dates before. */
export function Survey(p: { view: SurveyView | null; minGroup: number }) {
  const v = p.view;
  if (v === null) return <Outside />;
  const back = { label: W.back, href: talentHref("surveys") };
  const why = fill(W.why, { n: p.minGroup });
  if (v.status === "scheduled") {
    return (
      <RecordTabs title={v.name} lede={why} back={back}
        stats={[{ label: W.opens, value: v.opensOn.display },
          { label: W.closes, value: v.closesOn.display },
          { label: W.invited, value: v.invited }]}
        tabs={[{ id: "details", label: W.details, render: () => (
          <>
            <KeyValues items={[
              { label: W.status, value: W.scheduled },
              { label: W.invited, value: v.display.response },
              { label: W.anon, value: why }]} />
            <p className={s.note}>
              {fill(W.notYet, { date: v.closesOn.display })}</p>
          </>) }]} />
    );
  }
  const hidden = v.groups.filter((g) => !g.shown).length;
  const engagement = v.themes.find((x) => x.id === "th-engagement");
  return (
    <RecordTabs title={v.name} lede={why} back={back}
      stats={[{ label: W.score, value: engagement === undefined ? "–"
        : `${engagement.favourablePct}%` },
      { label: W.answered, value: `${v.answered} of ${v.invited}` },
      { label: W.rate, value: `${v.responsePct}%` }]}
      tabs={[
        { id: "results", label: W.results, render: () => (
          <>
            <p className={s.note}>{W.scoreNote}</p>
            <ul className={s.plain} aria-label={W.results}>
              {v.themes.map((x) => (
                <li key={x.id} className={s.line}>
                  <span>{x.question}</span>
                  <Progress pct={x.favourablePct}
                    label={`${x.favourablePct}%`} />
                </li>))}
            </ul>
          </>) },
        { id: "groups", label: W.groups, render: () => (
          <>
            <p className={s.note}>
              {hidden === 0 ? W.anon : hidden === 1 ? W.hiddenOne
                : fill(W.hiddenNote, { n: hidden })}</p>
            <ul className={s.plain} aria-label={W.groups}>
              {v.groups.map((g) => (
                <li key={g.departmentId} className={s.line}>
                  <span>{g.departmentText}</span>
                  <Status tone={g.shown ? "ok" : "plain"}>
                    {g.display.answers}</Status>
                </li>))}
            </ul>
          </>) },
      ]} />
  );
}
