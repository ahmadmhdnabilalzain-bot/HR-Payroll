/**
 * Flat faces for the opening's cards, drawn on 2D canvases in the
 * product's typeface and the brand's ink and grey. Every figure arrives
 * as text already formatted by the product's money formatter; nothing
 * here knows an amount.
 */
export interface Palette {
  ink: string;
  paper: string;
  card: string;
  g200: string;
  g300: string;
  g500: string;
  g700: string;
}

/** Texture pixels per world unit: crisp at 2x on a 1080p screen. */
export const PX = 400;
const FONT = "'IBM Plex Sans', system-ui, sans-serif";

export interface Face {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export function face(wUnits: number, hUnits: number): Face {
  const canvas = document.createElement("canvas");
  const w = Math.round(wUnits * PX);
  const h = Math.round(hUnits * PX);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("CINE_NO_2D");
  return { canvas, ctx, w, h };
}

export function font(f: Face, size: number, weight = 400): void {
  f.ctx.font = `${weight} ${size}px ${FONT}`;
}

function rounded(c: CanvasRenderingContext2D, x: number, y: number,
  w: number, h: number, r: number): void {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

/** A card: rounded, filled, with a hairline edge. */
export function plate(f: Face, p: Palette, fill: string, r = 44): void {
  const c = f.ctx;
  c.clearRect(0, 0, f.w, f.h);
  rounded(c, 2, 2, f.w - 4, f.h - 4, r);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = p.g200;
  c.stroke();
}

export function text(f: Face, s: string, x: number, y: number,
  colour: string, align: CanvasTextAlign = "left"): void {
  f.ctx.fillStyle = colour;
  f.ctx.textAlign = align;
  f.ctx.textBaseline = "alphabetic";
  f.ctx.fillText(s, x, y);
}

export function rule(f: Face, p: Palette, y: number, inset: number): void {
  f.ctx.fillStyle = p.g200;
  f.ctx.fillRect(inset, y, f.w - inset * 2, 2);
}

/** Words wrapped to a width; returns the y under the last line. */
export function wrap(f: Face, s: string, x: number, y: number, width: number,
  lh: number, colour: string, maxLines = 2): number {
  const lines: string[] = [];
  let line = "";
  for (const w of s.split(/\s+/)) {
    const next = line === "" ? w : `${line} ${w}`;
    if (f.ctx.measureText(next).width > width && line !== "") {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line !== "") lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    /* Cut the last line shown and mark the cut. */
    shown[maxLines - 1] = `${(shown[maxLines - 1] ?? "")
      .replace(/[,;:]?$/, "")}…`;
  }
  shown.forEach((l, i) => text(f, l, x, y + i * lh, colour));
  return y + shown.length * lh;
}

/** A tick, drawn, not typed (no icon font). */
export function tick(f: Face, x: number, y: number, size: number,
  colour: string): void {
  const c = f.ctx;
  c.beginPath();
  c.moveTo(x, y + size * 0.55);
  c.lineTo(x + size * 0.38, y + size * 0.9);
  c.lineTo(x + size, y + size * 0.1);
  c.lineWidth = size * 0.14;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = colour;
  c.stroke();
}

export function dot(f: Face, x: number, y: number, r: number,
  colour: string): void {
  f.ctx.beginPath();
  f.ctx.arc(x, y, r, 0, Math.PI * 2);
  f.ctx.fillStyle = colour;
  f.ctx.fill();
}

/** Initials on a neutral disc, like the product's avatars. */
export function initials(f: Face, p: Palette, name: string, x: number,
  y: number, r: number): void {
  dot(f, x, y, r, p.g200);
  const parts = name.split(/\s+/).filter(Boolean);
  const ini = ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? ""))
    .toUpperCase();
  font(f, r * 0.8, 500);
  f.ctx.textBaseline = "middle";
  f.ctx.textAlign = "center";
  f.ctx.fillStyle = p.ink;
  f.ctx.fillText(ini, x, y + 2);
}

/** A soft round shadow, for under the cards (contact shadow feel). */
export function shadow(p: Palette): Face {
  const f = face(1, 1);
  const g = f.ctx.createRadialGradient(f.w / 2, f.h / 2, 0, f.w / 2,
    f.h / 2, f.w / 2);
  g.addColorStop(0, p.g500);
  g.addColorStop(1, "transparent");
  f.ctx.globalAlpha = 0.55;
  f.ctx.fillStyle = g;
  f.ctx.fillRect(0, 0, f.w, f.h);
  return f;
}

/** Wait for the weights the faces use, so no texture falls back. */
export async function fontsReady(): Promise<void> {
  if (typeof document.fonts === "undefined") return;
  await Promise.all([400, 500, 600].map((w) =>
    document.fonts.load(`${w} 32px ${FONT}`).catch(() => [])));
}
