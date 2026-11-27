/**
 * The opening's weak-graphics gate (stage.ts): a software renderer
 * never gets the film, and slow first frames fade it into the product.
 */

/** Frames timed before the gate decides, after the first few (shader
 * compiles), and the average frame time above which the film gives
 * way to the product (25 fps: integrated graphics at 150 % scaling). */
export const GATE_FRAMES = 20;
export const GATE_SKIP = 4;
export const GATE_MS = 40;

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

/** Whether the frames timed so far (ms apart) are too slow. */
export function tooSlow(gaps: number[]): boolean {
  const timed = gaps.slice(GATE_SKIP, GATE_SKIP + GATE_FRAMES);
  if (timed.length < GATE_FRAMES) return false;
  return timed.reduce((a, b) => a + b, 0) / timed.length > GATE_MS;
}
