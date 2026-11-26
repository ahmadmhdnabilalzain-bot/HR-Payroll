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
  await hit("employeeDocumentVerify", owner, c, { id },
    { versionId: v.body.current.id });
  await hit("employeeDocumentDownload", f.emp, c, { id,
    versionId: v.body.current.id });
  await hit("documentAlerts", owner, c);
  const st = await hit("documentSettingsGet", owner, c);
  await hit("documentSettingsPut", owner, c, {}, st.body);
  await hit("documentRetentionDue", owner, c);
}

async function library(hit: Hitter, f: DocFlow): Promise<void> {
  const { owner, c } = f;
  const d = await hit("libraryCreate", owner, c, {}, { title: "Policy",
    category: "policy", fileId: await file(hit, owner, c),
    requiresAck: true, audience: { allStaff: true, departmentIds: [],
      employeeIds: [], roles: [] } });
  const id = d.body.id as string;
  await hit("libraryList", f.emp, c);
  await hit("libraryGet", f.emp, c, { id });
  const v = await hit("libraryVersionAdd", owner, c, { id },
    { fileId: await file(hit, owner, c), requiresAck: true });
  await hit("libraryDownload", f.emp, c, { id });
  await hit("libraryAcknowledge", f.emp, c, { id },
    { versionId: v.body.current.id });
  await hit("libraryReceipts", owner, c, { id });
  await hit("libraryAudiencePut", owner, c, { id }, { allStaff: false,
    departmentIds: [], employeeIds: [f.id], roles: [] });
}

async function templates(hit: Hitter, f: DocFlow): Promise<void> {
  const { owner, c } = f;
  await hit("letterFields", owner, c);
  const list = await hit("letterTemplatesList", owner, c);
  const ar = list.body.items.find((t: { lang: string }) =>
    t.lang === "ar");
  const body = { title: "Note", paragraphs: ["To: {{input.addressee}}"] };
  const t = await hit("letterTemplateCreate", owner, c, {}, { kind: "noc",
    name: "Custom", lang: "en", body });
  const id = t.body.id as string;
  await hit("letterTemplateGet", owner, c, { id });
  const v = await hit("letterTemplateVersionAdd", owner, c, { id },
    { body });
  await hit("letterTemplatePublish", owner, c, { id,
    versionId: v.body.versions[1].id });
  await hit("letterTemplateNativeReview", owner, c, { id: ar.id,
    versionId: ar.current.id }, { reviewerName: "Native Reviewer" });
}

async function letters(hit: Hitter, f: DocFlow): Promise<void> {
  const { owner, c } = f;
  const list = await hit("letterTemplatesList", owner, c);
  const noc = list.body.items.find((t: { kind: string; lang: string }) =>
    t.kind === "noc" && t.lang === "en");
  const body = { templateId: noc.id, employeeId: f.id, inputs: {
    "input.addressee": "Bank", "input.purpose": "Loan" } };
  await hit("letterPreview", owner, c, {}, body);
  const l = await hit("letterIssue", owner, c, {}, body);
  const id = l.body.id as string;
  await hit("lettersList", f.emp, c);
  await hit("letterGet", f.emp, c, { id });
  await hit("letterDownload", f.emp, c, { id });
  await hit("letterAcknowledge", f.emp, c, { id });
}

async function emiratisation(hit: Hitter, f: DocFlow): Promise<void> {
  const { owner, c } = f;
  await hit("employeeEmiratisationPut", owner, c, { id: f.id }, {
    skilled: true, workPermitValid: true, paidViaWps: true,
    gpssaRegistered: null });
  await hit("emiratisationSettingsPut", owner, c, {}, {
    sectorInScope: true, overrides: { largeRequiredRounding: "DOWN" } });
  await hit("emiratisationReport", owner, c);
}

/** One call to every Plan 7 route, in a working order. */
export async function documentFlow(hit: Hitter, f: DocFlow)
  : Promise<void> {
  await vault(hit, f);
  await library(hit, f);
  await templates(hit, f);
  await letters(hit, f);
  await emiratisation(hit, f);
}
