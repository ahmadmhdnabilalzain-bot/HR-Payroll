import type { LetterPage } from "../../src/pdf/renderer";

export const seg = (text: string, isolate = false) => ({ text, isolate });

/** A small English letter page; override any field. */
export const page = (over: Partial<LetterPage> = {}): LetterPage => ({
  lang: "en", heading: "Example Co",
  dateLine: [seg("Date: "), seg("2026-11-26", true)],
  refLine: [seg("Reference: "), seg("R-1", true)],
  title: [seg("Salary Certificate")],
  paragraphs: [[seg("Name: "), seg("Sample Employee")]],
  issuerLines: ["HR Officer"], watermark: null, ...over });
