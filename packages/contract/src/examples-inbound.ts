import {
  INBOUND_PROCESSING_NOTE,
  type InboundItem,
  type InboundSettings,
} from "./inbound";

const ID = "00000000-0000-4000-8000-000000000e01";
const EMP = "00000000-0000-4000-8000-000000000e02";
const AT = "2026-03-01T08:00:00.000Z";

const settings: InboundSettings = { enabled: true,
  allowlist: ["@vendor.test"], acknowledgedProcessing: true, version: 1,
  address: "in+0000000000004000800000000000000a.abcdefghijklmnop@" +
    "in.example.com", provider: "configured",
  note: INBOUND_PROCESSING_NOTE };

const item: InboundItem = { id: ID, status: "received", receivedAt: AT,
  fromAddress: "sara@acme.test", matchedEmployee: { employeeId: EMP,
    name: "Sara A" }, subject: "Taxi receipt",
  textPreview: "See attached.", auth: { spf: "pass", dkim: "pass",
    dmarc: "pass" }, flags: [], attachments: [{ index: 0,
    fileName: "taxi.png", contentType: "image/png", size: 1024,
    status: "kept", skip: null }], rejectReason: null, decision: null };

/** Task 5 examples (email-in). */
export const INBOUND_EXAMPLES: Readonly<Record<string, unknown>> = {
  InboundSettings: settings,
  InboundItem: item,
  InboundItemList: { items: [item] },
  InboundAttachmentContent: "raw bytes",
};
