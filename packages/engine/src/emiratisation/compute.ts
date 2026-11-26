import { boolParam, fixedParam, intParam } from "../gratuity-params";
import { fils, mulDiv, type Fils } from "../money";
import {
  EMIRATISATION_DISCLAIMER,
  EMIRATISATION_PACKS,
  FINE_2026_NOTE,
} from "../rules/emiratisation-pack";
import { selectPack } from "../rules/select";
import type { ParamValue, RulePack } from "../rules/types";
import { TraceBuilder } from "../trace";
import type { TraceRule } from "../trace-types";
import { activeOn, notCountedReasons } from "./count";
import {
  checkpointsParam,
  dateParam,
  tryInt,
  tryRounding,
  type ParamCtx,
} from "./params";
import type {
  EmiratisationBand,
  EmiratisationEmployee,
  EmiratisationInput,
  EmiratisationResult,
  EmiratisationStatus,
  NotCounted,
} from "./types";

type Active = EmiratisationEmployee[];

interface Banding {
  band: EmiratisationBand;
  checkpoint: string | null;
  missing: string[];
}

interface Counted {
  nationals: number;
  counted: number;
  notCounted: NotCounted[];
}

interface Outcome {
  status: EmiratisationStatus;
  required: number | null;
  shortfall: number | null;
  fineExposure: Fils | null;
  fineNote: string | null;
}

const NA = "not applicable";

function bandFor(n: number, large: bigint, mid: bigint,
  sector: boolean | null): EmiratisationBand {
  if (BigInt(n) >= large) return "large";
  if (BigInt(n) < mid || sector === false) return "none";
  return sector === true ? "mid" : "unknown";
}

function checkpointOf(ctx: ParamCtx, band: EmiratisationBand,
  asOf: string, rules: TraceRule[]): string | null {
  if (band === "none") return null;
  const key = band === "large" ? "largeCheckpoints" : "midCheckpoints";
  const list = checkpointsParam(ctx, key, asOf.slice(0, 4));
  rules.push(list.rule);
  return list.v.find((d) => d >= asOf) ?? null;
}

function banding(ctx: ParamCtx, input: EmiratisationInput, n: number,
  t: TraceBuilder): Banding {
  const large = intParam(ctx.pack, "bandLargeMinHeadcount", ctx.ov, 1);
  const mid = intParam(ctx.pack, "bandMidMinHeadcount", ctx.ov, 1);
  const band = bandFor(n, large.v, mid.v, input.sectorInScope);
  const rules = [large.rule, mid.rule];
  const checkpoint = checkpointOf(ctx, band, input.asOf, rules);
  t.add({ id: "emiratisation.band", label: "Band and checkpoint",
    formula: "large at the large minimum; mid from the mid minimum " +
      "when the sector is in scope",
    inputs: { headcount: String(n),
      sectorInScope: String(input.sectorInScope) },
    result: `${band}, checkpoint ${checkpoint ?? "none"}`, rules });
  return { band, checkpoint,
    missing: band === "unknown" ? ["sectorInScope"] : [] };
}

function skilledOf(band: EmiratisationBand, active: Active,
  t: TraceBuilder): { count: number | null; missing: string[] } {
  const large = band === "large";
  const missing = large ? active.filter((e) => e.skilled === null)
    .map((e) => `skilled:${e.employeeId}`) : [];
  const count = large ? active.filter((e) => e.skilled === true).length
    : null;
  t.add({ id: "emiratisation.skilled", label: "Skilled headcount",
    formula: "active employees marked skilled (large band only)",
    inputs: { notEntered: String(missing.length) },
    result: count === null ? NA : String(count), rules: [] });
  return { count, missing };
}

function largeRequired(ctx: ParamCtx, checkpoint: string,
  skilled: number, rules: TraceRule[]): number | null {
  const bps = tryInt(ctx, `largeTargetBps_${checkpoint}`);
  const mode = tryRounding(ctx);
  if (bps !== null) rules.push(bps.rule);
  if (mode !== null) rules.push(mode.rule);
  if (bps === null || mode === null) return null;
  return Number(mulDiv(fils(BigInt(skilled)), bps.v, 10000n, mode.v));
}

function midRequired(ctx: ParamCtx, checkpoint: string,
  rules: TraceRule[]): number | null {
  const req = tryInt(ctx, `midRequired_${checkpoint}`);
  if (req === null) return null;
  rules.push(req.rule);
  return Number(req.v);
}

function requiredOf(ctx: ParamCtx, b: Banding, skilled: number | null,
  t: TraceBuilder): number | null {
  const rules: TraceRule[] = [];
  let required: number | null = null;
  if (b.checkpoint !== null && b.band === "large") {
    required = largeRequired(ctx, b.checkpoint, skilled ?? 0, rules);
  } else if (b.checkpoint !== null && b.band === "mid") {
    required = midRequired(ctx, b.checkpoint, rules);
  }
  t.add({ id: "emiratisation.required", label: "Required nationals",
    formula: b.band === "large"
      ? "skilled headcount x target bps / 10000, rounded"
      : "required count for the checkpoint",
    inputs: { band: b.band, checkpoint: b.checkpoint ?? "none",
      skilledHeadcount: String(skilled) },
    result: required === null ? "needs input" : String(required), rules });
  return required;
}

function countedOf(ctx: ParamCtx, band: EmiratisationBand, active: Active,
  asOf: string, t: TraceBuilder): Counted {
  const wage = intParam(ctx.pack, "minWageFils", ctx.ov, 0);
  const from = dateParam(ctx, "minWageCountingFrom");
  const base = fixedParam(ctx.pack, "minWageBase", ctx.ov,
    "recurring-monthly-total");
  const skilledOnly = boolParam(ctx.pack,
    "largeCountSkilledNationalsOnly", ctx.ov);
  const needSkill = band === "large" && skilledOnly.v;
  const nationals = active.filter((e) => e.isUaeNational);
  const notCounted: NotCounted[] = [];
  let counted = 0;
  for (const e of nationals) {
    const reasons = notCountedReasons(e, asOf, wage.v, from.v);
    if (reasons.length > 0) notCounted.push({ employeeId: e.employeeId,
      reasons });
    else if (!needSkill || e.skilled === true) counted += 1;
  }
  t.add({ id: "emiratisation.counted", label: "Counted nationals",
    formula: "active nationals with every counting condition met",
    inputs: { nationals: String(nationals.length),
      skilledOnly: String(needSkill) },
    result: String(counted),
    rules: [wage.rule, from.rule, base.rule, skilledOnly.rule] });
  return { nationals: nationals.length, counted, notCounted };
}

function fineOf(ctx: ParamCtx, checkpoint: string, shortfall: number,
  t: TraceBuilder): Pick<Outcome, "fineExposure" | "fineNote"> {
  const rules: TraceRule[] = [];
  let fine: Fils | null = fils(0n);
  if (shortfall > 0) {
    const per = tryInt(ctx, `finePerPostPerYear_${checkpoint.slice(0, 4)}`);
    if (per !== null) rules.push(per.rule);
    fine = per === null ? null : fils(BigInt(shortfall) * per.v);
  }
  t.add({ id: "emiratisation.fine", label: "Estimated yearly fine",
    formula: "shortfall x fine per unfilled post per year",
    inputs: { shortfall: String(shortfall) },
    result: fine === null ? "needs input" : String(fine), rules });
  return { fineExposure: fine, fineNote: fine === null ? FINE_2026_NOTE
    : null };
}

function noFine(t: TraceBuilder, why: string): void {
  t.add({ id: "emiratisation.fine", label: "Estimated yearly fine",
    formula: "shortfall x fine per unfilled post per year", inputs: {},
    result: why, rules: [] });
}

function outcomeOf(ctx: ParamCtx, b: Banding, required: number | null,
  counted: number, missingInputs: string[], t: TraceBuilder): Outcome {
  const empty = { required: null, shortfall: null, fineExposure: null,
    fineNote: null };
  if (b.band === "none") {
    noFine(t, NA);
    return { status: "not-applicable", ...empty };
  }
  if (missingInputs.length > 0 || required === null ||
    b.checkpoint === null) {
    noFine(t, "needs input");
    return { status: "needs-input", ...empty };
  }
  const shortfall = Math.max(0, required - counted);
  return { status: shortfall === 0 ? "on-target" : "below-target",
    required, shortfall, ...fineOf(ctx, b.checkpoint, shortfall, t) };
}

/**
 * Emiratisation headcount report on asOf: a planning estimate from
 * secondary sources. Unsourced params never throw; they are listed in
 * missingParams. Throws INVALID_DATE, NO_PACK_FOR_DATE, or INVALID_PARAM
 * for an override of the wrong form.
 */
export function computeEmiratisation(
  input: EmiratisationInput,
  packs: readonly RulePack[] = EMIRATISATION_PACKS,
  overrides?: Record<string, ParamValue>,
): EmiratisationResult {
  const ctx: ParamCtx = { pack: selectPack(packs, input.asOf),
    ov: overrides, missing: [] };
  const t = new TraceBuilder();
  const active = input.employees.filter((e) => activeOn(e, input.asOf));
  t.add({ id: "emiratisation.headcount", label: "Headcount",
    formula: "employees joined on or before the date and not yet left",
    inputs: { asOf: input.asOf, employees: String(input.employees.length) },
    result: String(active.length), rules: [] });
  const b = banding(ctx, input, active.length, t);
  const skilled = skilledOf(b.band, active, t);
  const required = requiredOf(ctx, b, skilled.count, t);
  const c = countedOf(ctx, b.band, active, input.asOf, t);
  const missingInputs = [...b.missing, ...skilled.missing];
  const out = outcomeOf(ctx, b, required, c.counted, missingInputs, t);
  return { asOf: input.asOf, checkpoint: b.checkpoint, band: b.band,
    status: out.status, headcount: active.length,
    skilledHeadcount: skilled.count, nationals: c.nationals,
    countedNationals: c.counted, required: out.required,
    shortfall: out.shortfall, notCounted: c.notCounted, missingInputs,
    missingParams: [...ctx.missing], fineExposure: out.fineExposure,
    fineNote: out.fineNote, trace: t.lines(), disclaimer:
      EMIRATISATION_DISCLAIMER };
}
