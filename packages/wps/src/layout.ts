/** WPS SIF layout parameters. Data only, no logic. */
export interface SifLayout {
  readonly personIdLength: number;
  readonly employerIdLength: number;
  readonly accountLength: number;
  readonly routingLength: number;
  readonly referenceMaxLength: number;
  readonly minPayStart: string;
  readonly lineEnding: string;
  readonly currency: string;
  readonly source: string;
  readonly status: "secondary";
}

export const defaultLayout: SifLayout = {
  personIdLength: 14,
  employerIdLength: 13,
  accountLength: 23,
  routingLength: 9,
  referenceMaxLength: 35,
  minPayStart: "2010-10-01",
  lineEnding: "\r\n",
  currency: "AED",
  source:
    "DIB WPS file format guide v1.1 and Emirates Islamic WPS guide " +
    "(docs/research/2026-11-25-wps-sif-layout.md)",
  status: "secondary",
};
