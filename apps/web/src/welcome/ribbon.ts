import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  type ColorRepresentation,
} from "three";

/** The shape of the ribbon at one moment; scenes blend between these. */
export interface RibbonPose {
  x0: number;
  x1: number;
  y: number;
  z: number;
  /** Height of the waves. */
  amp: number;
  /** How far the sheet turns about its length (radians). */
  twist: number;
  width: number;
  /** Waves along the length. */
  freq: number;
  opacity: number;
}

export function mixPose(a: RibbonPose, b: RibbonPose, t: number): RibbonPose {
  const m = (x: number, y: number): number => x + (y - x) * t;
  return { x0: m(a.x0, b.x0), x1: m(a.x1, b.x1), y: m(a.y, b.y),
    z: m(a.z, b.z), amp: m(a.amp, b.amp), twist: m(a.twist, b.twist),
    width: m(a.width, b.width), freq: m(a.freq, b.freq),
    opacity: m(a.opacity, b.opacity) };
}

const SEGS = 280;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * One continuous sheet of ink, two vertices across and SEGS along,
 * moved on the CPU each frame (560 vertices: cheaper than a shader
 * variant, and easy to reason about). Normals are recomputed so the
 * soft key light rolls along the folds.
 */
export class Ribbon {
  readonly mesh: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly pos: Float32Array;

  constructor(colour: ColorRepresentation) {
    const g = new BufferGeometry();
    this.pos = new Float32Array((SEGS + 1) * 2 * 3);
    g.setAttribute("position", new BufferAttribute(this.pos, 3));
    const idx: number[] = [];
    for (let i = 0; i < SEGS; i += 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(idx);
    const mat = new MeshStandardMaterial({ color: colour, roughness: 0.42,
      metalness: 0.18, side: DoubleSide, transparent: true });
    this.mesh = new Mesh(g, mat);
    this.mesh.frustumCulled = false;
  }

  update(p: RibbonPose, time: number): void {
    this.mesh.visible = p.opacity > 0.005 && p.x1 - p.x0 > 0.01;
    if (!this.mesh.visible) return;
    this.mesh.material.opacity = p.opacity;
    const tau = Math.PI * 2;
    for (let i = 0; i <= SEGS; i += 1) {
      const u = i / SEGS;
      const x = p.x0 + (p.x1 - p.x0) * u;
      const wave = tau * p.freq * u;
      const y = p.y + p.amp * (0.62 * Math.sin(wave + time * 0.21) +
        0.24 * Math.sin(wave * 2.3 + 1.7 + time * 0.13));
      const z = p.z + p.amp * 0.9 * Math.cos(wave * 0.7 + time * 0.17);
      const th = p.twist * Math.sin(tau * 0.55 * u + 0.6 + time * 0.11);
      const w = p.width * 0.5 * smooth(0, 0.07, u) * smooth(1, 0.93, u);
      const cy = Math.cos(th) * w;
      const cz = Math.sin(th) * w;
      const k = i * 6;
      this.pos[k] = x;
      this.pos[k + 1] = y + cy;
      this.pos[k + 2] = z + cz;
      this.pos[k + 3] = x;
      this.pos[k + 4] = y - cy;
      this.pos[k + 5] = z - cz;
    }
    const g = this.mesh.geometry;
    const attr = g.getAttribute("position");
    attr.needsUpdate = true;
    g.computeVertexNormals();
  }
}
