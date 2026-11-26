import { isValidIsoDate } from "../dates";
import { EngineError } from "../errors";
import { fils, type Fils } from "../money";
import { selectPack } from "../rules/select";
import type { RulePack } from "../rules/types";
import { VAT_PACKS } from "../rules/vat-pack";
import type { TraceLine, TraceRule, Traced } from "../trace-types";
import { intParam, strParam } from "./params";
import {
  checkDocs,
  corrections,
  placeDocs,
  type Placed,
} from "./vat201-docs";
import { EMIRATES, type Emirate } from "./vat201-layout";
import type {
  BoxFigure,
  FtaBoxInput,
  MiddleBox,
  Vat201,
  Vat201Input,
  Vat201Problem,
  Vat201Warning,
} from "./vat201-types";

export * from "./vat201-layout";
export * from "./vat201-types";

const LAYOUT = "guide-2021-v4.0";

const NOT_COMPUTED = [
  "Additional Reporting Requirements section (not read)",
  "Tax refunds to tourists and imported goods figures come from the " +
    "FTA; they are entered, not computed",
];

const NULL_FIG: BoxFigure = { amount: null, vat: null, adjustment: null };
const f = (x: bigint): Fils => fils(x);

function checkPeriod(input: Vat201Input): void {
  const { periodStart: s, periodEnd: e } = input;
  if (!isValidIsoDate(s) || !isValidIsoDate(e) || s > e) {
    throw new EngineError("INVALID_PERIOD",
      "periodStart and periodEnd must be ISO dates, start first",
      { periodStart: s, periodEnd: e });
  }
}

type Adjust = Vat201Input["adjustments"];

function docFigure(placed: Placed, key: string, adj: Fils | null,
  vatColumn = true): BoxFigure {
  const s = placed.sums.get(key);
  const vat = !vatColumn ? null : s?.vatUnknown ? null : f(s?.vat ?? 0n);
  return { amount: f(s?.amount ?? 0n), vat, adjustment: adj };
}

function ftaFigure(box: string, given: FtaBoxInput,
  problems: Vat201Problem[]): BoxFigure {
  if (given.kind === "entered") {
    return { amount: given.amount, vat: given.vat, adjustment: null };
  }
  if (given.kind === "none") {
    return { amount: f(0n), vat: f(0n), adjustment: null };
  }
  problems.push({ code: "FTA_BOX_NOT_ENTERED", docIds: [], box });
  return { ...NULL_FIG };
}

function box1Of(placed: Placed, adj: Adjust): Record<Emirate, BoxFigure> {
  const out = {} as Record<Emirate, BoxFigure>;
  for (const e of EMIRATES) {
    out[e] = docFigure(placed, `1:${e}`, adj[`1:${e}`] ?? f(0n));
  }
  return out;
}

type Partial7 = Record<Exclude<MiddleBox, "8" | "11">, BoxFigure>;

function middleOf(placed: Placed, input: Vat201Input,
  problems: Vat201Problem[]): Partial7 {
  const adj = input.adjustments;
  return {
    "2": ftaFigure("2", input.box2, problems),
    "3": docFigure(placed, "3", adj["3"] ?? f(0n)),
    "4": docFigure(placed, "4", null, false),
    "5": docFigure(placed, "5", null, false),
    "6": ftaFigure("6", input.box6, problems),
    "7": ftaFigure("7", input.box7, problems),
    "9": docFigure(placed, "9", adj["9"] ?? f(0n)),
    "10": docFigure(placed, "10", adj["10"] ?? f(0n)),
  };
}

/** Column-wise sum; a column null in every figure stays null. */
function sumFigures(figs: BoxFigure[]): BoxFigure {
  const col = (k: keyof BoxFigure): Fils | null => {
    const vals = figs.map((x) => x[k]).filter((v) => v !== null);
    return vals.length === 0 ? null : f(vals.reduce((a, b) => a + b, 0n));
  };
  return { amount: col("amount"), vat: col("vat"),
    adjustment: col("adjustment") };
}

interface Totals {
  box8: BoxFigure;
  box11: BoxFigure;
  box12: Fils | null;
  box13: Fils | null;
  box14: Fils | null;
  box15: boolean | null;
}

const NULL_TOTALS: Totals = { box8: NULL_FIG, box11: NULL_FIG,
  box12: null, box13: null, box14: null, box15: null };

function totals(box1: Record<Emirate, BoxFigure>, m: Partial7,
  refund: boolean): Totals {
  const box8 = sumFigures([...EMIRATES.map((e) => box1[e]), m["2"],
    m["3"], m["4"], m["5"], m["6"], m["7"]]);
  const box11 = sumFigures([m["9"], m["10"]]);
  const box12 = f((box8.vat ?? 0n) + (box8.adjustment ?? 0n));
  const box13 = f((box11.vat ?? 0n) + (box11.adjustment ?? 0n));
  const box14 = f(box12 - box13);
  return { box8, box11, box12, box13, box14,
    box15: box14 < 0n ? refund : null };
}

function isNegative(fig: BoxFigure): boolean {
  return [fig.amount, fig.vat, fig.adjustment]
    .some((v) => v !== null && v < 0n);
}

function negativeBoxes(r: Vat201): Vat201Warning[] {
  const figs: [string, boolean][] = [
    ["1", EMIRATES.some((e) => isNegative(r.box1[e]))],
    ...Object.entries(r.boxes).map(([k, v]): [string, boolean] =>
      [k, isNegative(v)]),
    ["12", (r.box12 ?? 0n) < 0n], ["13", (r.box13 ?? 0n) < 0n],
    ["14", (r.box14 ?? 0n) < 0n],
  ];
  return figs.filter(([, neg]) => neg)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([box]) => ({ code: "NEGATIVE_BOX", box, periodStart: null }));
}

function warningsOf(r: Vat201, input: Vat201Input): Vat201Warning[] {
  const w: Vat201Warning[] = [{ code: "LAYOUT_FROM_2021_GUIDE",
    box: null, periodStart: null }, ...negativeBoxes(r)];
  if (input.refundRequested && r.box14 !== null && r.box14 >= 0n) {
    w.push({ code: "REFUND_NOT_APPLICABLE", box: "15", periodStart: null });
  }
  for (const c of r.corrections.filter((x) => x.overThreshold)) {
    w.push({ code: "VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED", box: null,
      periodStart: c.periodStart });
  }
  const fta = [input.box2, input.box6, input.box7];
  if (input.documents.length === 0 && fta.every((b) => b.kind === "none")) {
    w.push({ code: "NIL_RETURN", box: null, periodStart: null });
  }
  return w;
}

function figText(x: BoxFigure | Fils | boolean | null): string {
  if (x === null || typeof x !== "object") return String(x);
  return `amount=${String(x.amount)} vat=${String(x.vat)} ` +
    `adjustment=${String(x.adjustment)}`;
}

function boxCount(placed: Placed, box: string): number {
  let n = 0;
  for (const [key, s] of placed.sums) {
    if (key === box || key.startsWith(`${box}:`)) n += s.count;
  }
  return n;
}

/** Boxes whose trace counts every document of the period. */
const TOTAL_BOXES = ["8", "11", "12", "13", "14", "15"];

function traceOf(r: Vat201, placed: Placed, rules: TraceRule[],
  docCount: number): TraceLine[] {
  const values: [string, unknown][] = [
    ["1", EMIRATES.map((e) => `${e} ${figText(r.box1[e])}`).join("; ")],
    ...Object.entries(r.boxes).map(([k, v]): [string, unknown] =>
      [k, figText(v)]),
    ["12", figText(r.box12)], ["13", figText(r.box13)],
    ["14", figText(r.box14)], ["15", figText(r.box15)],
  ];
  values.sort((a, b) => Number(a[0]) - Number(b[0]));
  return values.map(([box, result]) => ({
    id: `vat201.box.${box}`,
    label: `VAT 201 box ${box}`,
    formula: "documents mapped to the guide box; totals per the guide",
    inputs: { documents: String(TOTAL_BOXES.includes(box) ? docCount
      : boxCount(placed, box)) },
    result: String(result),
    rules,
  }));
}

function correctionLine(r: Vat201, rule: TraceRule): TraceLine {
  return {
    id: "vat201.corrections",
    label: "Corrections of earlier periods",
    formula: "per corrected period: the documents' Box 14 effect " +
      "(standard sale VAT, minus claimed standard purchase VAT, plus " +
      "reverse-charge VAT minus its claimed part), credit notes " +
      "negative; flagged above the threshold",
    inputs: { periods: String(r.corrections.length) },
    result: r.corrections.map((c) =>
      `${c.periodStart} ${c.netVatEffect.toString()}`).join("; "),
    rules: [rule],
  };
}

function readPack(input: Vat201Input, packs: readonly RulePack[]) {
  const pack = selectPack(packs, input.periodEnd);
  const layout = strParam(pack, "box201Layout");
  if (layout.v !== LAYOUT) {
    throw new EngineError("INVALID_PARAM",
      `only the ${LAYOUT} layout is supported`,
      { key: "box201Layout", value: layout.v });
  }
  const threshold = intParam(pack, "errorCorrectionThresholdFils",
    undefined, 0);
  return { layout, threshold };
}

/**
 * Form VAT 201 boxes from the period's documents (Ruling 4 layout).
 * Any problem leaves the return incomplete with null totals; nothing
 * is clamped to zero and no input tax is decided here.
 */
export function computeVat201(
  input: Vat201Input,
  packs: readonly RulePack[] = VAT_PACKS,
): Traced<Vat201> {
  checkPeriod(input);
  const { layout, threshold } = readPack(input, packs);
  checkDocs(input.documents, input.periodStart);
  const placed = placeDocs(input.documents);
  const problems = [...placed.problems];
  const box1 = box1Of(placed, input.adjustments);
  const m = middleOf(placed, input, problems);
  const t = problems.length > 0 ? NULL_TOTALS
    : totals(box1, m, input.refundRequested);
  const r: Vat201 = {
    status: problems.length > 0 ? "incomplete" : "complete",
    box1, boxes: { ...m, "8": { ...t.box8 }, "11": { ...t.box11 } },
    box12: t.box12, box13: t.box13, box14: t.box14, box15: t.box15,
    corrections: corrections(input.documents, threshold.v),
    problems, warnings: [], excludedDocIds: placed.excluded,
    notComputed: [...NOT_COMPUTED],
  };
  r.warnings = warningsOf(r, input);
  const trace = [...traceOf(r, placed, [layout.rule],
    input.documents.length), correctionLine(r, threshold.rule)];
  return { value: r, trace };
}
