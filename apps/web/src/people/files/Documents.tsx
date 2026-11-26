import { useState } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { Outside } from "../team/common";
import { blobKey, dropFile, hasFile, keepFile, openFile } from "./blobs";
import { Field, SheetForm, useActor, useNames } from "./common";
import { docGroups, nextVersion, sizeText, type DocGroup } from "./docs";
import f from "./files.module.css";
import { D } from "./words";

const LIST = hrefOf("people", "files", "documents");
const MAX = 5 * 1024 * 1024;

/** One line per person with papers: how many papers, latest added. */
interface PersonRow { employeeId: string; groups: DocGroup[] }

/** P41: papers on file, upload a new file, every version kept. */
export function Documents(p: { rest: string[] }) {
  const { data, state } = useDemo();
  const names = useNames();
  const groups = docGroups(data, state);
  const [sheet, setSheet] = useState(false);
  const people = [...new Set(groups.map((g) => g.employeeId))]
    .map((employeeId): PersonRow => ({ employeeId,
      groups: groups.filter((g) => g.employeeId === employeeId) }));
  const id = p.rest[0];
  if (id !== undefined) {
    return <PersonFiles employeeId={id} groups={groups.filter((g) =>
      g.employeeId === id)} />;
  }
  return (
    <>
      <FilterList title={D.title} lede={`${D.lede} ${data.files.files.note}`}
        rows={people} rowKey={(r) => r.employeeId}
        searchText={(r) => names.name(r.employeeId)}
        rowHref={(r) => hrefOf("people", "files", "documents", r.employeeId)}
        segments={[
          { id: "all", label: D.all, match: () => true },
          { id: "new", label: D.expiring, match: (r) => state.uploads
            .some((u) => u.employeeId === r.employeeId) },
        ]}
        columns={[
          { key: "p", label: D.person, render: (r) => (
            <span className={f.stack}><span>{names.name(r.employeeId)}</span>
              <small>{names.title(r.employeeId)}</small></span>) },
          { key: "n", label: D.paper, render: (r) =>
            r.groups.map((g) => g.docType).join(", ") },
          { key: "v", label: D.version, render: (r) => `${r.groups.reduce(
            (n, g) => n + g.versions.length, 0)} on file` },
        ]}
        empty={D.empty}
        actions={state.role !== "gm" ? (
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setSheet(true)}>{D.upload}</button>) : undefined} />
      <Upload open={sheet} employeeId={null} groups={groups}
        onClose={() => setSheet(false)} />
    </>
  );
}

function Upload(p: { open: boolean; employeeId: string | null;
  groups: DocGroup[]; onClose(): void }) {
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const me = useActor();
  const everyone = data.employees();
  const [who, setWho] = useState(p.employeeId ?? everyone[0]?.id ?? "");
  const [type, setType] = useState(data.files.files.types[0] ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const target = p.employeeId ?? who;
  return (
    <SheetForm open={p.open} title={D.upload} submitLabel={D.save}
      onClose={p.onClose} note={D.inBrowser}
      onSubmit={() => {
        if (file === null) return D.noFile;
        if (file.size > MAX) return D.tooBig;
        const version = nextVersion(p.groups, target, type);
        keepFile(blobKey(target, type, version), file);
        dispatch({ type: "files", op: { op: "upload", file: { ...me.who,
          employeeId: target, docType: type, version, fileName: file.name,
          bytes: file.size, note } } });
        toast.show(D.added(version), () => {
          dropFile(blobKey(target, type, version));
          dispatch({ type: "files", op: { op: "unupload",
            employeeId: target, docType: type, version } });
        });
        setFile(null);
        setNote("");
        return null;
      }}>
      {p.employeeId === null && (
        <Field label={D.person}>
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            {everyone.map((x) => (
              <option key={x.id} value={x.id}>{x.name.en}</option>))}
          </select>
        </Field>)}
      <Field label={D.type}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {data.files.files.types.map((x) => <option key={x}>{x}</option>)}
        </select>
      </Field>
      <Field label={D.choose} help={data.files.files.note}>
        <input type="file" onChange={(e) =>
          setFile(e.target.files?.[0] ?? null)} />
      </Field>
      <Field label={D.note} help={D.noteHelp}>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </SheetForm>
  );
}

function PersonFiles(p: { employeeId: string; groups: DocGroup[] }) {
  const { data, state, dispatch } = useDemo();
  const names = useNames();
  const toast = useToast();
  const [sheet, setSheet] = useState(false);
  const all = docGroups(data, state);
  if (data.people.person(p.employeeId) === null) return <Outside />;
  const count = p.groups.reduce((n, g) => n + g.versions.length, 0);
  return (
    <>
      <RecordTabs title={names.name(p.employeeId)}
        lede={names.title(p.employeeId)}
        back={{ label: D.title, href: LIST }}
        stats={[{ label: D.paper, value: p.groups.length },
          { label: D.versions, value: count },
          { label: D.when, value: state.uploads.filter((u) =>
            u.employeeId === p.employeeId).length }]}
        actions={state.role !== "gm" ? (
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setSheet(true)}>{D.upload}</button>) : undefined}
        tabs={[{ id: "papers", label: D.title, render: () => (
          <div className={f.panel}>
            <p className={f.hint}>{data.files.files.note}</p>
            {p.groups.length === 0 && <p className={f.hint}>{D.empty}</p>}
            {p.groups.map((g) => (
              <section key={g.key} aria-label={g.docType}>
                <h2 className={f.title}>{g.docType}</h2>
                {g.numberMasked !== null && (
                  <KeyValues items={[
                    { label: D.number, value: g.numberMasked },
                    { label: D.expires, value: g.expires ?? "" }]} />)}
                <ul className={f.group}>
                  {[...g.versions].reverse().map((v, i) => {
                    const key = blobKey(p.employeeId, g.docType, v.version);
                    const mine = v.by !== null;
                    return (
                      <li key={v.version}>
                        <span className={f.stack}>
                          <span>Version {v.version}, {i === 0 ? D.current
                            : D.older}</span>
                          <small>{v.fileName}{sizeText(v.bytes) === "" ? ""
                            : `, ${sizeText(v.bytes)}`}. {mine && v.by !== null
                            && v.on !== null ? `${D.by} ${names.by(v.by,
                              v.on)}.` : D.before}
                            {v.note !== "" && ` ${v.note}.`}</small>
                        </span>
                        <span className={f.row}>
                          {mine && hasFile(key) && (
                            <button type="button"
                              className={`${b.btn} ${b.secondary}`}
                              onClick={() => openFile(key)}>{D.open}</button>)}
                          {mine && i === 0 && (
                            <button type="button"
                              className={`${b.btn} ${b.quiet}`}
                              onClick={() => { dropFile(key);
                                dispatch({ type: "files", op: { op:
                                  "unupload", employeeId: p.employeeId,
                                docType: g.docType, version: v.version } });
                              toast.show(D.remove); }}>{D.remove}</button>)}
                        </span>
                      </li>);
                  })}
                </ul>
              </section>))}
          </div>) }]} />
      <Upload open={sheet} employeeId={p.employeeId} groups={all}
        onClose={() => setSheet(false)} />
    </>
  );
}
