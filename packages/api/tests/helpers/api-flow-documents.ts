import type { recorder } from "./api-flow";
import { fakePdf } from "./test-app";

type Hitter = ReturnType<typeof recorder>;

/** Tokens and ids the Plan 7 part of the flow needs. */
export interface DocFlow {
  owner: string;
  emp: string;
  c: string;
  /** The employee record linked to `emp`. */
  id: string;
}

const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");

async function file(hit: Hitter, token: string, c: string)
  : Promise<string> {
  const r = await hit("fileUpload", token, c, {}, { name: "p.pdf",
    contentBase64: b64(fakePdf("flow")) });
  return r.body.id;
}

async function vault(hit: Hitter, f: DocFlow): Promise<void> {
  const { owner, c } = f;
  const d = await hit("employeeDocumentCreate", owner, c, { id: f.id },
    { type: "passport", documentNumber: "P0000001",
      expiryDate: "2026-12-20", fileId: await file(hit, owner, c) });
  const id = d.body.id as string;
  await hit("employeeDocumentsList", f.emp, c, { id: f.id });
  await hit("employeeDocumentGet", owner, c, { id });
  const v = await hit("employeeDocumentVersionAdd", owner, c, { id },
    { expiryDate: "2031-12-20", fileId: await file(hit, owner, c) });
  await hit("employeeDocumentVerify", owner, c, { id });
  await hit("employeeDocumentDownload", f.emp, c, { id,
    versionId: v.body.current.id });
  await hit("documentAlerts", owner, c);
  const st = await hit("documentSettingsGet", owner, c);
  await hit("documentSettingsPut", owner, c, {}, st.body);
  await hit("documentRetentionDue", owner, c);
}

/** One call to every Plan 7 route served so far, in a working order. */
export async function documentFlow(hit: Hitter, f: DocFlow)
  : Promise<void> {
  await vault(hit, f);
}
