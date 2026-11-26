import {
  AS_OF,
  dateOf,
  ESIGN_CONSENT,
  ESIGN_KIND_TITLE,
  ESIGN_KINDS,
  ESIGN_NOTE,
  esignDocs,
  esignEmployeeOf,
  esignPacks,
  esignProgress,
  esignRef,
  esignText,
  joinerOfOffer,
  joiningPack,
  offerViews,
  signingProfile,
  signingProfiles,
  type DemoCompany,
} from "@payroll/demo-data";
import type { EsignData } from "./esign-types";

const once = <T>(f: () => T): (() => T) => {
  let v: T | undefined;
  return () => (v ??= f());
};

/** The D5 view over the demo company. Imported only by adapter.ts. */
export function adaptEsign(c: DemoCompany): EsignData {
  const docs = once(() => esignDocs(c));
  const packs = once(() => esignPacks(c).packs);
  const profiles = once(() => signingProfiles(c));
  return {
    asOf: AS_OF,
    note: ESIGN_NOTE,
    consent: ESIGN_CONSENT,
    kinds: ESIGN_KINDS,
    kindTitle: ESIGN_KIND_TITLE,
    employeeId: esignEmployeeOf(c),
    docs, packs, profiles,
    joinerOfOffer: (id, on) => {
      const o = offerViews(c).find((x) => x.id === id);
      return o === undefined ? null : joinerOfOffer(o, on);
    },
    profile: signingProfile,
    pack: (j) => joiningPack(c, j),
    progress: esignProgress,
    ref: esignRef,
    text: esignText,
    date: dateOf,
  };
}
