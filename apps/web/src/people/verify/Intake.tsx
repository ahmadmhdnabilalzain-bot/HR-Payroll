import { useState, type DragEvent } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList } from "../../ui/templates";
import { blobKey, dropFile, keepFile } from "../files/blobs";
import { Field, SheetForm, useActor } from "../files/common";
import { docGroups, nextVersion, sizeText } from "../files/docs";
import { Stack } from "../papers/Status";
import { intakeRows, whenOf, type IntakeRow } from "./model";
import v from "./verify.module.css";
import { V } from "./words";

const MAX = 5 * 1024 * 1024;
const KINDS = /^(application\/pdf|image\/)/;

/** P54: every document that came in, and the one way to add a scan. */
export function Intake() {
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const [sheet, setSheet] = useState(false);
  const rows = intakeRows(data, state, lang);
  const nameOf = (id: string): string =>
    data.people.person(id)?.name[lang] ?? id;
  return (
    <>
      <FilterList title={V.intakeTitle}
        lede={`${V.intakeLede} ${data.verify.intakeNote}`}
        rows={rows} rowKey={(r) => r.id}
        searchText={(r) => `${r.fileName} ${r.from} ${r.filedTo}`}
        rowHref={(r: IntakeRow) => r.employeeId === null
          ? undefined : hrefOf("people", "files", "documents",
            r.employeeId)}
        segments={[
          { id: "all", label: V.segAll, match: () => true },
          { id: "new", label: V.segNew, match: (r) => r.isNew },
          { id: "open", label: V.segOpen, match: (r) =>
            r.employeeId === null },
        ]}
        columns={[
          { key: "f", label: V.file, render: (r) => (
            <Stack main={r.fileName} sub={r.from} />) },
          { key: "s", label: V.source, render: (r) => r.source },
          { key: "r", label: V.received, render: (r) => `${
            whenOf(r.receivedIso, lang)}${r.time === "" ? ""
            : `, ${r.time}`}` },
          { key: "b", label: V.receivedBy,
            render: (r) => nameOf(r.receivedBy) },
          { key: "t", label: V.filedTo, render: (r) => r.filedTo },
        ]}
        empty={V.intakeEmpty}
        actions={(
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setSheet(true)}>{V.drop}</button>
        )} />
      <Take open={sheet} onClose={() => setSheet(false)} />
    </>
  );
}

function Take(p: { open: boolean; onClose(): void }) {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const me = useActor();
  const people = data.people.people().filter((x) => x.status !== "left");
  const [who, setWho] = useState(people[0]?.id ?? "");
  const [type, setType] = useState(data.files.files.types[0] ?? "");
  const [expires, setExpires] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent<HTMLLabelElement>): void => {
    e.preventDefault();
    setOver(false);
    setFile(e.dataTransfer.files[0] ?? null);
  };
  return (
    <SheetForm open={p.open} title={V.sheetTitle} submitLabel={V.save}
      onClose={p.onClose} note={V.hereNote}
      onSubmit={() => {
        if (file === null) return V.needFile;
        if (file.size > MAX) return V.tooBig;
        if (!KINDS.test(file.type)) return V.fileHelp;
        if (who === "") return V.needPerson;
        const version = nextVersion(docGroups(data, state), who, type);
        keepFile(blobKey(who, type, version), file);
        dispatch({ type: "files", op: { op: "upload", file: { ...me.who,
          employeeId: who, docType: type, version, fileName: file.name,
          bytes: file.size, note: "Scan taken in at document intake" } } });
        const next = state.nextIntake;
        dispatch({ type: "verify-intake", draft: { ...me.who,
          employeeId: who, docType: type, version, fileName: file.name,
          bytes: file.size, expires: expires === "" ? null : expires } });
        toast.show(V.taken, () => {
          dropFile(blobKey(who, type, version));
          dispatch({ type: "files", op: { op: "unupload", employeeId: who,
            docType: type, version } });
          dispatch({ type: "verify-unintake", id: `in-new-${next}` });
        });
        setFile(null);
        setExpires("");
        return null;
      }}>
      <Field label={V.fileLabel} help={V.fileHelp}>
        <span className={v.drop} data-over={over}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)} onDrop={drop}>
          <span>{file === null ? V.pickFile : `${file.name} ${
            sizeText(file.size)}`}</span>
          <input type="file" accept="application/pdf,image/*"
            aria-label={V.fileLabel}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </span>
      </Field>
      <Field label={V.personLabel}>
        <select value={who} onChange={(e) => setWho(e.target.value)}>
          {people.map((x) => (
            <option key={x.id} value={x.id}>{x.name[lang]}</option>))}
        </select>
      </Field>
      <Field label={V.typeLabel}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {data.files.files.types.map((x) => <option key={x}>{x}</option>)}
        </select>
      </Field>
      <Field label={V.expiryLabel} help={V.expiryHelp}>
        <input type="date" value={expires}
          onChange={(e) => setExpires(e.target.value)} />
      </Field>
    </SheetForm>
  );
}
