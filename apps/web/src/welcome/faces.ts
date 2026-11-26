import type { Fils } from "@payroll/engine";
import {
  dot, face, font, initials, plate, rule, text, tick, wrap,
  type Face, type Palette,
} from "./draw";
import type { Story, StoryApproval, StoryRow } from "./story";

/** Words the faces print, already in the reader's language. */
export interface FaceWords {
  payslip: string;
  month: string;
  netPay: string;
  working: string;
  stopsPay: string;
  fixed: string;
  ibanEnding(last: string): string;
  checksOut: string;
  fileTotal: string;
  heldIn(amount: string): string;
  signedOff(name: string): string;
  signed: string;
  decisions: string;
}

export type MoneyText = (f: Fils) => string;

export const CARD = { w: 2.4, h: 2.35 } as const;
export const LINE_H = 0.3;
export const STEP = { w: 2.2, h: 0.3 } as const;
export const ROW = { w: 3.8, narrow: 2.6, h: 0.5 } as const;
export const TOTAL = { w: 2.6, narrow: 2.4, h: 0.78 } as const;
export const HELD = { w: 2.6, h: 0.22 } as const;
export const APPROVAL = { w: 2.1, h: 1.35 } as const;

const PAD = 72;
const LINE_TOP = 380;
const LINE_STEP = 92;

/** The payslip; returns the face and where the lifting line sits. */
export function payslipFace(p: Palette, s: Story, w: FaceWords,
  m: MoneyText): { f: Face; figureY: number } {
  const f = face(CARD.w, CARD.h);
  plate(f, p, p.card);
  font(f, 30, 500);
  text(f, `${w.payslip} · ${w.month}`, PAD, 110, p.g700);
  font(f, 54, 600);
  text(f, s.payslip.name, PAD, 192, p.ink);
  font(f, 30);
  text(f, s.payslip.role, PAD, 242, p.g700);
  rule(f, p, 300, PAD);
  let figureY = 0;
  s.payslip.lines.forEach((l, i) => {
    const y = LINE_TOP + i * LINE_STEP;
    if (i === s.payslip.figure) {
      /* The slot the figure lifts out of. */
      figureY = y - 12;
      f.ctx.beginPath();
      f.ctx.roundRect(PAD - 24, y - 60, f.w - PAD * 2 + 48, 96, 20);
      f.ctx.fillStyle = p.paper;
      f.ctx.fill();
      return;
    }
    font(f, 34);
    text(f, l.label, PAD, y, p.ink);
    font(f, 34, 500);
    text(f, l.fils === null ? "" : m(l.fils), f.w - PAD, y, p.ink, "right");
  });
  const y = LINE_TOP + s.payslip.lines.length * LINE_STEP;
  rule(f, p, y - 40, PAD);
  font(f, 36, 600);
  text(f, w.netPay, PAD, y + 50, p.ink);
  font(f, 46, 600);
  text(f, m(s.payslip.netFils), f.w - PAD, y + 52, p.ink, "right");
  return { f, figureY };
}

/** The figure that lifts out: the same line, on its own card. */
export function chipFace(p: Palette, s: Story, m: MoneyText): Face {
  const f = face(CARD.w, LINE_H);
  plate(f, p, p.card, 26);
  const l = s.payslip.lines[s.payslip.figure];
  font(f, 34, 500);
  text(f, l?.label ?? "", PAD, 74, p.ink);
  font(f, 34, 600);
  text(f, l?.fils == null ? "" : m(l.fils), f.w - PAD, 74, p.ink, "right");
  return f;
}

/** The caption, then one face per working step (the last in bold). */
export function stepFaces(p: Palette, s: Story, w: FaceWords,
  m: MoneyText): Face[] {
  const cap = face(STEP.w, STEP.h);
  /* On its own plate: on a phone it floats over the payslip. */
  plate(cap, p, p.paper, 22);
  font(cap, 28, 500);
  text(cap, w.working, 56, 72, p.g700);
  const steps = s.payslip.steps.map((st, i, all) => {
    const f = face(STEP.w, STEP.h);
    const last = i === all.length - 1;
    plate(f, p, last ? p.paper : p.card, 22);
    font(f, 30, last ? 600 : 400);
    text(f, st.label, 56, 72, p.ink);
    font(f, 30, last ? 600 : 500);
    if (st.fils !== null) text(f, m(st.fils), f.w - 56, 72, p.ink, "right");
    return f;
  });
  return [cap, ...steps];
}

/** A row of the pay run list; `fixed` draws it after the fix. */
export function rowFace(p: Palette, r: StoryRow, w: FaceWords,
  m: MoneyText, fixed: boolean, width: number = ROW.w): Face {
  const f = face(width, ROW.h);
  /* Narrow rows (phones) print their second line larger. */
  const small = width < ROW.w ? 34 : 28;
  plate(f, p, p.card, 30);
  initials(f, p, r.name, 100, 100, 44);
  font(f, 40, 500);
  text(f, r.name, 180, 92, p.ink);
  font(f, 38, 500);
  text(f, m(r.netFils), f.w - 64, 92, p.ink, "right");
  font(f, small);
  if (r.flag === null) {
    text(f, r.department, 180, 144, p.g700);
    return f;
  }
  if (!fixed) {
    text(f, r.flag.title, 180, 144, p.g700);
    font(f, small, 600);
    text(f, w.stopsPay, f.w - 64, 144, p.ink, "right");
    const tw = f.ctx.measureText(w.stopsPay).width;
    dot(f, f.w - 64 - tw - 22, 135, 8, p.ink);
    return f;
  }
  text(f, `${w.ibanEnding(r.flag.ibanLast4)} · ${w.checksOut}`, 180, 144,
    p.g700);
  /* On a phone the tick alone says it; the words would not fit. */
  const label = width < ROW.w ? "" : w.fixed;
  font(f, small, 500);
  text(f, label, f.w - 64, 144, p.g700, "right");
  const tw = f.ctx.measureText(label).width;
  tick(f, f.w - 64 - tw - (label === "" ? 30 : 44), 116, 30, p.ink);
  return f;
}

/** The salary file total; redrawn while it counts. */
export function totalFace(p: Palette, w: FaceWords, width: number): {
  f: Face; draw(amount: string): void; } {
  const f = face(width, TOTAL.h);
  return { f, draw: (amount) => {
    plate(f, p, p.card, 36);
    font(f, 30, 500);
    text(f, w.fileTotal, 64, 96, p.g700);
    font(f, 72, 600);
    text(f, amount, 64, 214, p.ink);
  } };
}

export function heldFace(p: Palette, w: FaceWords, held: string): Face {
  const f = face(HELD.w, HELD.h);
  font(f, 32, 500);
  text(f, w.heldIn(held), f.w / 2, 58, p.ink, "center");
  return f;
}

export function approvalFace(p: Palette, a: StoryApproval, w: FaceWords,
  m: MoneyText, signed: boolean, badge = false): Face {
  const f = face(APPROVAL.w, APPROVAL.h);
  plate(f, p, p.card, 36);
  /* Cards that fall down a phone cover each other's feet: the state
   * also shows at the top corner there. */
  if (badge && signed) {
    font(f, 28, 600);
    text(f, w.signed, f.w - 56, 96, p.ink, "right");
    const tw = f.ctx.measureText(w.signed).width;
    tick(f, f.w - 56 - tw - 44, 70, 28, p.ink);
  }
  font(f, 36, 600);
  const under = wrap(f, a.title, 64, 108, f.w * 0.62, 46, p.ink, 2);
  font(f, 30);
  text(f, a.who, 64, under + 4, p.g700);
  if (a.amountFils !== null) {
    font(f, 44, 600);
    text(f, m(a.amountFils), 64, 404, p.ink);
  }
  rule(f, p, 440, 64);
  font(f, 28, signed ? 600 : 500);
  if (signed) {
    tick(f, 64, 466, 30, p.ink);
    text(f, w.signedOff(a.signer), 112, 496, p.ink);
  } else {
    dot(f, 74, 486, 8, p.g500);
    text(f, w.decisions, 100, 496, p.g700);
  }
  return f;
}
