import { useState } from "react";
import { useDemo } from "../../demo/state";
import { Status } from "../../people/team/common";
import { Field, SheetForm, useActor, useNames }
  from "../../people/files/common";
import f from "../../people/files/files.module.css";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList } from "../../ui/templates";
import { M } from "./words";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Line { id: string; employeeId: string; site: string;
  when: string; inside: boolean; mine: boolean }

/** T12: phone clock-in with a site area, and a way to try it. */
export function Phone() {
  const { data, state } = useDemo();
  const names = useNames();
  const W = M.phone;
  const sites = data.files.clock.sites();
  const lines: Line[] = [
    ...state.clocks.filter((c) => c.via === "phone").map((c): Line => ({
      id: c.id, employeeId: c.employeeId, site: c.site,
      when: `${names.day(c.on)}, ${c.time}`, inside: c.inside, mine: true })),
    ...data.files.clock.phone().map((p): Line => ({
      id: `p-${p.employeeId}`, employeeId: p.employeeId, site: p.site,
      when: p.when, inside: p.inside, mine: false })),
  ];
  return (
    <>
      <FilterList title={W.title} lede={`${W.lede} ${
        data.files.clock.geofenceNote}`} rows={lines} rowKey={(l) => l.id}
      searchText={(l) => names.name(l.employeeId)}
      segments={[
        { id: "all", label: W.all, match: () => true },
        { id: "out", label: W.outside, match: (l) => !l.inside },
      ]}
      columns={[
        { key: "p", label: W.person, render: (l) =>
          names.name(l.employeeId) },
        { key: "s", label: W.site, render: (l) => l.site },
        { key: "w", label: W.when, render: (l) => l.when },
        { key: "t", label: W.status, render: (l) => (
          <Status tone={l.inside ? "ok" : "warn"}>
            {l.inside ? W.inside : W.outsideWord}</Status>) },
      ]}
      empty={W.empty} actions={<Try via="phone" />} />
      <section className={f.after} aria-label={W.sites}>
        <h2 className={f.title}>{W.sites}</h2>
        <ul className={f.group}>
          {sites.map((s) => (
            <li key={s.id}><span className={f.stack}><span>{s.name}</span>
              <small>{W.radius}: {s.radius} m</small></span>
            <span className={f.value}>{W.staff}: {s.staff}</span></li>))}
        </ul>
      </section>
    </>
  );
}

/** A sheet to record one clock-in, by phone or at the kiosk. */
export function Try(p: { via: "phone" | "kiosk" }) {
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const me = useActor();
  const names = useNames();
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState(me.id);
  const [site, setSite] = useState("");
  const [time, setTime] = useState("08:30");
  const sites = data.files.clock.sites();
  const W = p.via === "phone" ? M.phone : M.kiosk;
  const label = p.via === "phone" ? M.phone.try : M.kiosk.scan;
  return (
    <>
      <button type="button" className={`${b.btn} ${b.primary}`}
        onClick={() => { setWho(me.id); setSite(sites[0]?.id ?? "");
          setOpen(true); }}>{label}</button>
      <SheetForm open={open} title={label} submitLabel={W.submit}
        onClose={() => setOpen(false)}
        note={p.via === "phone" ? data.files.clock.geofenceNote
          : M.kiosk.face}
        onSubmit={() => {
          if (!TIME.test(time)) return W.badTime;
          const place = sites.find((s) => s.id === site);
          const inside = place !== undefined;
          dispatch({ type: "files", op: { op: "clock", draft: { ...me.who,
            employeeId: who, via: p.via,
            site: place?.name ?? M.phone.nowhere, inside, time } } });
          toast.show(p.via === "phone" ? M.phone.done(names.name(who))
            : M.kiosk.done(names.name(who)));
          return null;
        }}>
        <Field label={M.phone.person}>
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            {data.employees().map((x) => (
              <option key={x.id} value={x.id}>{x.name.en}</option>))}
          </select>
        </Field>
        <Field label={p.via === "phone" ? M.phone.where : M.kiosk.site}>
          <select value={site} onChange={(e) => setSite(e.target.value)}>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}
            </option>)}
            {p.via === "phone" && <option value="">{M.phone.nowhere}
            </option>}
          </select>
        </Field>
        <Field label={M.phone.time}>
          <input value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </SheetForm>
    </>
  );
}

/** A grid that looks like a code, from the site's name (deterministic). */
function Code(p: { seed: string }) {
  let n = 0;
  for (const ch of p.seed) n = (n * 31 + ch.charCodeAt(0)) % 2147483647;
  const cells: boolean[] = [];
  for (let i = 0; i < 169; i++) {
    n = (n * 48271) % 2147483647;
    cells.push(n % 2 === 0);
  }
  const eye = (x: number, y: number): boolean =>
    (x < 3 && y < 3) || (x > 9 && y < 3) || (x < 3 && y > 9);
  return (
    <svg className={f.mark} viewBox="0 0 13 13" role="img"
      aria-label={M.kiosk.code} shapeRendering="crispEdges">
      {cells.map((on, i) => on || eye(i % 13, Math.floor(i / 13)) ? (
        <rect key={i} x={i % 13} y={Math.floor(i / 13)} width="1"
          height="1" fill="currentColor" />) : null)}
    </svg>
  );
}

/** T16: kiosk check-in with a code on the wall; no face matching. */
export function Kiosk() {
  const { data, state } = useDemo();
  const names = useNames();
  const W = M.kiosk;
  const lines = state.clocks.filter((c) => c.via === "kiosk");
  return (
    <>
      <FilterList title={W.title} lede={`${W.lede} ${W.face}`} rows={lines}
        rowKey={(l) => l.id} searchText={(l) => names.name(l.employeeId)}
        segments={[{ id: "all", label: "All", match: () => true }]}
        columns={[
          { key: "p", label: W.person, render: (l) =>
            names.name(l.employeeId) },
          { key: "s", label: W.site, render: (l) => l.site },
          { key: "w", label: W.when, render: (l) =>
            `${names.day(l.on)}, ${l.time}` },
          { key: "t", label: W.status, render: () => (
            <Status tone="ok">{W.checked}</Status>) },
        ]}
        empty={W.empty} actions={<Try via="kiosk" />} />
      <section className={f.after} aria-label={W.site}>
        <ul className={f.group}>
          {data.files.clock.sites().map((s) => (
            <li key={s.id}><span className={f.stack}><span>{s.name}</span>
              <small>{W.code}</small></span><Code seed={s.id} /></li>))}
        </ul>
      </section>
    </>
  );
}
