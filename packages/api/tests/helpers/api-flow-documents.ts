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

/** One call to every Plan 7 route served so far, in a working order. */
export async function documentFlow(hit: Hitter, f: DocFlow)
  : Promise<void> {
  await hit("fileUpload", f.owner, f.c, {}, { name: "p.pdf",
    contentBase64: b64(fakePdf("flow")) });
}
