import type { DemoData } from "../../demo/data/types";
import type { DemoState } from "../../demo/state";

export interface DocVersion { version: number; fileName: string;
  bytes: number; note: string; by: string | null; on: string | null }

export interface DocGroup { key: string; employeeId: string;
  docType: string; versions: DocVersion[];
  /** Masked number and expiry, for papers with one. */
  numberMasked: string | null; expires: string | null }

/** Each person's papers by type, with every version, oldest first. */
export function docGroups(d: DemoData, s: DemoState): DocGroup[] {
  const map = new Map<string, DocGroup>();
  for (const x of d.files.files.onFile()) {
    map.set(`${x.employeeId}|${x.docType}`, { key: `${x.employeeId}|${
      x.docType}`, employeeId: x.employeeId, docType: x.docType,
    versions: [{ ...x.first, by: null, on: null }],
    numberMasked: x.numberMasked, expires: x.expires.display });
  }
  for (const u of s.uploads) {
    const key = `${u.employeeId}|${u.docType}`;
    const g = map.get(key) ?? { key, employeeId: u.employeeId,
      docType: u.docType, versions: [], numberMasked: null, expires: null };
    g.versions = [...g.versions, { version: u.version, fileName: u.fileName,
      bytes: u.bytes, note: u.note, by: u.by, on: u.on }]
      .sort((a, b) => a.version - b.version);
    map.set(key, g);
  }
  return [...map.values()];
}

export const nextVersion = (groups: DocGroup[], employeeId: string,
  docType: string): number => {
  const g = groups.find((x) => x.employeeId === employeeId &&
    x.docType === docType);
  return g === undefined ? 1 : Math.max(...g.versions.map((v) => v.version))
    + 1;
};

export function sizeText(bytes: number): string {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
