import { ExtrudeGeometry, type BufferGeometry } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { WORDMARK_PATH } from "../shell/Wordmark";

/** The outlined wordmark's box (shell/Wordmark.tsx viewBox). */
const VIEW_W = 5739;
const VIEW_H = 795;
const BASELINE = 787;

/**
 * The owner's wordmark as a shallow solid, from the same outlined path
 * as the product's logo, so no font file is needed and the letters are
 * exactly the logo's. Centred on the origin, `width` world units wide.
 */
export function wordmarkGeometry(width: number): BufferGeometry {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" ' +
    `viewBox="0 0 ${VIEW_W} ${VIEW_H}"><path transform=` +
    `"translate(0,${BASELINE})" d="${WORDMARK_PATH}"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const g = new ExtrudeGeometry(shapes, { depth: 70, bevelEnabled: true,
    bevelThickness: 8, bevelSize: 5, bevelSegments: 2, curveSegments: 7 });
  /* SVG y runs down: a half turn about x puts the letters upright and
   * keeps the faces' winding (a negative scale would turn them out). */
  g.rotateX(Math.PI);
  g.translate(-VIEW_W / 2, VIEW_H / 2, 0);
  const k = width / VIEW_W;
  g.scale(k, k, k);
  g.computeBoundingBox();
  return g;
}

/** Height over width of the wordmark. */
export const WORDMARK_ASPECT = VIEW_H / VIEW_W;
