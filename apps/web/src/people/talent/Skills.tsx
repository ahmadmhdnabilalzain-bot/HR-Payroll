import { useRef, useState } from "react";
import { useGlide } from "../../ui/glide";
import { useDemo } from "../../demo/state";
import { PageFoot, PageHead } from "../../ui/templates";
import tpl from "../../ui/templates/templates.module.css";
import type { SkillRow } from "../../demo/data/talent-types";
import { profileHref, Status } from "../team/common";
import { fill, T } from "./words";
import s from "./talent.module.css";

const W = T.skills;

/**
 * P63, Skills: people by skill with the level held and the level
 * needed, and a summary per skill. The levels are samples, and the
 * line under the title says how they are worked out.
 */
export function Skills() {
  const { data } = useDemo();
  const [tab, setTab] = useState<"person" | "skill">("person");
  const row = useRef<HTMLDivElement>(null);
  useGlide(row, "line");
  const rows = data.talent.skillMatrix();
  const summary = data.talent.skillSummary();
  const withGap = rows.filter((r) => r.gaps > 0).length;
  const tabs = [{ id: "person", label: W.byPerson },
    { id: "skill", label: W.bySkill }] as const;
  return (
    <div className={tpl.page}>
      <PageHead title={W.title} lede={data.talent.skillBasis} meta={(
        <dl className={s.figures}>
          {[{ label: W.people, value: rows.length },
            { label: W.gaps, value: withGap },
            { label: W.tracked, value: data.talent.skills().length }]
            .map((x) => (
              <div key={x.label}>
                <dt>{x.label}</dt>
                <dd className="tabular">{x.value}</dd>
              </div>))}
        </dl>
      )} />
      <div className={tpl.tabs} role="tablist" ref={row}>
        {tabs.map((x) => (
          <button key={x.id} type="button" role="tab" id={`tab-${x.id}`}
            aria-selected={x.id === tab} aria-controls={`tabpanel-${x.id}`}
            onClick={() => setTab(x.id)}>{x.label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`} className={tpl.tabPanel}>
        {tab === "person" ? (
          <Matrix rows={rows}
            skills={data.talent.skills().map((x) => ({ id: x.id,
              name: x.name }))} />
        ) : (
          <ul className={s.plain} aria-label={W.bySkill}>
            {summary.map((x) => (
              <li key={x.skillId} className={s.line}>
                <span className={s.main}>
                  <span>{x.name}</span>
                  <span className={s.sub}>{x.family}</span>
                </span>
                <span className={s.end}>
                  <span>{x.display.people}</span>
                  <Status tone={x.withGap > 0 ? "warn" : "ok"}>
                    {x.display.gaps}</Status>
                </span>
              </li>))}
          </ul>
        )}
      </div>
      <PageFoot />
    </div>
  );
}

function Matrix(p: { rows: SkillRow[];
  skills: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = p.rows.filter((r) => (!gapsOnly || r.gaps > 0) &&
    words.every((w) => `${r.name} ${r.jobText}`.toLowerCase().includes(w)));
  return (
    <>
      <div className={s.tools}>
        <label className={s.search}>
          <span className="visually-hidden">{W.find}</span>
          <input type="search" value={q} placeholder={W.find}
            onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="button" className={s.toggle} aria-pressed={gapsOnly}
          onClick={() => setGapsOnly(!gapsOnly)}>{W.gapsOnly}</button>
        <span className={s.count} aria-live="polite">
          {fill(W.shown, { n: shown.length, total: p.rows.length })}
        </span>
      </div>
      <div className={s.key}>
        <p className={s.legend}>{W.legend}</p>
        <ul className={s.keyList} aria-label={W.keyTitle}>
          <li><Status tone="ok">{W.keyMet}</Status></li>
          <li><Status tone="warn">{W.keyBelow}</Status></li>
          <li><span className={s.dash} aria-hidden="true">–</span>
            {W.notTrackedShort}</li>
        </ul>
      </div>
      {shown.length === 0 ? <p className={s.note}>{W.empty}</p> : (
        <>
          <div className={`${s.scroll} ${s.wide} ${s.matrix}`} role="region"
            aria-label={W.matrix} tabIndex={0}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">{W.person}</th>
                  {p.skills.map((k) => (
                    <th key={k.id} scope="col">{k.name}</th>))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.employeeId}>
                    <th scope="row">
                      <a href={profileHref(r.employeeId)}
                        className={s.name}>{r.name}</a>
                      <small>{r.jobText}</small>
                    </th>
                    {p.skills.map((k) => (
                      <td key={k.id}><Cell row={r} skillId={k.id} /></td>))}
                  </tr>))}
              </tbody>
            </table>
          </div>
          <ul className={s.cards} aria-label={W.matrix}>
            {shown.map((r) => (
              <li key={r.employeeId} className={s.card}>
                <span className={s.main}>
                  <a href={profileHref(r.employeeId)}
                    className={s.name}>{r.name}</a>
                  <span className={s.sub}>{r.jobText}</span>
                </span>
                <ul>
                  {r.skills.map((k) => (
                    <li key={k.skillId}>
                      <span>{k.name}</span>
                      <Status tone={k.gap > 0 ? "warn" : "ok"}>
                        {fill(W.of, { held: k.held, need: k.required })}
                        <span className="visually-hidden">{" "}
                          {k.gap > 0 ? W.below : W.met}</span>
                      </Status>
                    </li>))}
                </ul>
              </li>))}
          </ul>
        </>
      )}
    </>
  );
}

function Cell(p: { row: SkillRow; skillId: string }) {
  const k = p.row.skills.find((x) => x.skillId === p.skillId);
  if (k === undefined) {
    return (
      <span className={s.dash}>
        <span aria-hidden="true">–</span>
        <span className="visually-hidden">{W.notTracked}</span>
      </span>
    );
  }
  return (
    <Status tone={k.gap > 0 ? "warn" : "ok"}>
      {fill(W.of, { held: k.held, need: k.required })}
      <span className="visually-hidden">{" "}
        {k.gap > 0 ? W.below : W.met}</span>
    </Status>
  );
}
