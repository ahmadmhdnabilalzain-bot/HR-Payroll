/**
 * The opening's weak-graphics gate (stage.ts): a software renderer
 * never gets the film, and slow first frames fade it into the product.
 */

/** The gate times only the frames GATE_FROM to GATE_TO after the
 * first scene is drawn on a loaded page (never the page load or the
 * shader compiles), and gives the film way to the product only when
 * GATE_RUN frames in a row run a median above GATE_MS (under 20 fps:
 * a laptop that cannot hold the film, not one that hitched once). */
export const GATE_FROM = 30;
export const GATE_TO = 90;
export const GATE_RUN = 30;
export const GATE_MS = 50;

/** `?film=1` keeps the film on any graphics (checks, a slow demo). */
export function filmForced(): boolean {
  return new URLSearchParams(location.search).get("film") === "1";
}

/** A software renderer (no graphics chip): never the film. */
export function softwareGL(gl: WebGLRenderingContext |
  WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(ext === null ? gl.RENDERER
      : ext.UNMASKED_RENDERER_WEBGL));
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i
      .test(name);
  } catch {
    return false;
  }
}

function median(xs: number[]): number {
  const o = [...xs].sort((x, y) => x - y);
  const m = o.length >> 1;
  return o.length % 2 === 1 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
}

/**
 * Whether the frame gaps so far (ms apart; gap 0 follows the first
 * scene's frame) are too slow: some GATE_RUN consecutive gaps between
 * GATE_FROM and GATE_TO with a median above GATE_MS.
 */
export function tooSlow(gaps: number[]): boolean {
  const end = Math.min(gaps.length, GATE_TO);
  for (let j = GATE_FROM; j + GATE_RUN <= end; j++) {
    if (median(gaps.slice(j, j + GATE_RUN)) > GATE_MS) return true;
  }
  return false;
}

/** Whether the gate has seen all the frames it times. */
export function gateDone(gaps: number[]): boolean {
  return gaps.length >= GATE_TO;
}
