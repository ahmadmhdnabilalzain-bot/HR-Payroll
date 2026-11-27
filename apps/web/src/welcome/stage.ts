import { gsap } from "gsap";
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Fog,
  Group,
  HemisphereLight,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Scene,
  Shape,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import type { Fils } from "@payroll/engine";
import { fontsReady, PX, shadow, type Face, type Palette } from "./draw";
import {
  APPROVAL, approvalFace, CARD, chipFace, heldFace, LINE_H, payslipFace,
  ROW, rowFace, STEP, stepFaces, TOTAL, totalFace,
  type FaceWords, type MoneyText,
} from "./faces";
import { mixPose, Ribbon, type RibbonPose } from "./ribbon";
import type { Story } from "./story";
import { wordmarkGeometry, WORDMARK_ASPECT } from "./wordmark3d";
import { filmForced, gateDone, softwareGL, tooSlow } from "./gate";

export interface StageInput {
  root: HTMLElement;
  /** Where the stage puts its own canvas (a fresh one per mount: a
   * context given up with forceContextLoss cannot be reused). */
  host: HTMLElement;
  canvasClass: string;
  /** True once the caller no longer wants this mount. */
  cancelled(): boolean;
  /** The five scenes' words, in order, faded by the director. */
  copy: HTMLElement[];
  story: Story;
  words: FaceWords;
  money: MoneyText;
  palette: Palette;
  /** Where the story ends (scene units, 0 to 5). */
  end: number;
  /** How long the story takes to get there, and the hold after it. */
  seconds: number;
  hold: number;
  /** The film has played to its end (not called when stopped early). */
  onEnd(): void;
  /** WebGL went away: show the static story instead. */
  onFail(): void;
  /** The window turned between wide and tall: build the scenes again. */
  onRelayout(): void;
}

/* ---------- small maths ---------- */

const clamp = (x: number): number => Math.min(1, Math.max(0, x));
const seg = (u: number, a: number, b: number): number =>
  clamp((u - a) / (b - a));
/** power2.inOut, written out so the director has no tween state. */
const ease = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const es = (u: number, a: number, b: number): number => ease(seg(u, a, b));

/* ---------- ownership: everything made here is disposed here ---------- */

class Owner {
  private readonly items: { dispose(): void }[] = [];
  own<T extends { dispose(): void }>(x: T): T {
    this.items.push(x);
    return x;
  }
  dispose(): void {
    for (const x of this.items.splice(0)) x.dispose();
  }
}

/** Opacity for a whole group; hidden entirely when faded out. */
function fade(o: Object3D, a: number): void {
  o.visible = a > 0.004;
  if (!o.visible) return;
  o.traverse((x) => {
    if (!(x instanceof Mesh)) return;
    const m = x.material as Material & { opacity: number };
    const base = (x.userData["base"] as number | undefined) ?? 1;
    m.opacity = base * a;
  });
}

function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

interface Kit {
  owner: Owner;
  palette: Palette;
  aniso: number;
  shadowTex: CanvasTexture;
  plane: PlaneGeometry;
  /** Portrait layout, chosen at mount (the stage remounts on a flip). */
  narrow: boolean;
}

function texture(k: Kit, f: Face): CanvasTexture {
  const t = k.owner.own(new CanvasTexture(f.canvas));
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = k.aniso;
  t.minFilter = LinearMipmapLinearFilter;
  return t;
}

/** A flat face of `w` by `h` units with a canvas drawn on it. */
function facePlane(k: Kit, f: Face, z = 0): Mesh {
  const m = k.owner.own(new MeshBasicMaterial({ map: texture(k, f),
    transparent: true, toneMapped: false, depthWrite: false }));
  const mesh = new Mesh(k.plane, m);
  mesh.scale.set(f.w / PX, f.h / PX, 1);
  mesh.position.z = z;
  return mesh;
}

/** A card: a thin solid body (it catches the light when it turns),
 * its face, and a soft shadow behind. */
function card(k: Kit, f: Face, w: number, h: number): Group {
  const g = new Group();
  const geo = k.owner.own(new ExtrudeGeometry(roundedRect(w - 0.02,
    h - 0.02, 0.1), { depth: 0.03, bevelEnabled: false,
    curveSegments: 6 }));
  geo.translate(0, 0, -0.031);
  const body = new Mesh(geo, k.owner.own(new MeshStandardMaterial({
    color: k.palette.card, roughness: 0.8, transparent: true })));
  g.add(body);
  g.add(facePlane(k, f, 0.002));
  const sh = new Mesh(k.plane, k.owner.own(new MeshBasicMaterial({
    map: k.shadowTex, transparent: true, depthWrite: false })));
  sh.scale.set(w * 1.35, h * 1.45, 1);
  sh.position.set(0.08, -0.16, -0.5);
  sh.userData["base"] = 0.5;
  g.add(sh);
  return g;
}

/* ---------- the scenes ---------- */

interface Layout {
  vw: number;
  vh: number;
  wide: boolean;
}

/** Where a scene's object sits and how large, beside or under the words. */
function place(g: Group, l: Layout, w: number, h: number): void {
  const aw = l.wide ? l.vw * 0.54 : l.vw * 0.98;
  const ah = l.wide ? l.vh * 0.78 : l.vh * 0.56;
  const k = Math.min(aw / w, ah / h);
  g.scale.setScalar(k);
  g.position.set(l.wide ? l.vw * 0.2 : 0, l.wide ? 0 : -l.vh * 0.16, 0);
}

function payslipScene(k: Kit, s: Story, w: FaceWords, m: MoneyText) {
  const root = new Group();
  const { f, figureY } = payslipFace(k.palette, s, w, m);
  const slip = card(k, f, CARD.w, CARD.h);
  slip.position.x = k.narrow ? 0 : -1.35;
  root.add(slip);
  const chip = new Group();
  const chipY = CARD.h / 2 - figureY / PX;
  chip.add(facePlane(k, chipFace(k.palette, s, m)));
  slip.add(chip);
  const hinges = stepFaces(k.palette, s, w, m).map((sf, i) => {
    const hinge = new Group();
    const p = facePlane(k, sf);
    p.position.y = -STEP.h / 2;
    hinge.add(p);
    hinge.position.set(0.1, -LINE_H / 2 - 0.04 - i * (STEP.h + 0.03), 0);
    chip.add(hinge);
    return hinge;
  });
  return { root, update(u: number, l: Layout): void {
    place(root, l, k.narrow ? 2.9 : 5.4, 3.4);
    const a = seg(u, -0.1, 0.12) * (1 - es(u, 0.8, 0.94));
    fade(root, a);
    if (!root.visible) return;
    root.position.y += es(u, 0.8, 0.96) * 0.9;
    const tIn = es(u, -0.1, 0.3);
    slip.rotation.set(lerp(0.42, 0.04, tIn), lerp(-1.35, -0.2, tIn), 0);
    slip.position.z = lerp(-2.6, 0, tIn);
    const tL = es(u, 0.22, 0.4);
    chip.position.set(lerp(0, k.narrow ? 0.2 : 2.55, tL),
      lerp(chipY, k.narrow ? 0.45 : 1.0, tL),
      lerp(0.004, k.narrow ? 1.0 : 0.75, tL));
    chip.rotation.y = lerp(0, 0.2, tL);
    chip.scale.setScalar(lerp(1, 1.06, tL));
    hinges.forEach((h, i) => {
      const t = es(u, 0.36 + i * 0.05, 0.5 + i * 0.05);
      h.rotation.x = lerp(-Math.PI / 2, 0, t);
      fade(h, a * t);
    });
  } };
}

function listScene(k: Kit, s: Story, w: FaceWords, m: MoneyText) {
  const root = new Group();
  const rowY = (i: number): number => 1.05 - i * (ROW.h + 0.08);
  const rowW = k.narrow ? ROW.narrow : ROW.w;
  const totW = k.narrow ? TOTAL.narrow : TOTAL.w;
  const totX = rowW / 2 - totW / 2;
  /* A phone shows the two flagged rows and the two around them. */
  const onPhone = k.narrow ? s.rows.filter((r, n) => r.flag !== null ||
    s.rows.slice(0, n).filter((x) => x.flag === null).length < 2)
    : s.rows;
  const rows = onPhone.map((r, i) => {
    const g = new Group();
    g.position.y = rowY(i);
    g.add(facePlane(k, rowFace(k.palette, r, w, m, false, rowW)));
    const fixed = r.flag === null ? null
      : facePlane(k, rowFace(k.palette, r, w, m, true, rowW), 0.001);
    if (fixed !== null) g.add(fixed);
    root.add(g);
    return { g, flagged: r.flag !== null, fixed, i };
  });
  const total = totalFace(k.palette, w, totW);
  total.draw(m(s.file.beforeFils));
  const totalMesh = facePlane(k, total.f);
  const totalTex = (totalMesh.material as MeshBasicMaterial).map;
  totalMesh.position.set(totX, 1.95, 0);
  root.add(totalMesh);
  const held = facePlane(k, heldFace(k.palette, w, m(s.file.heldFils)));
  held.position.set(totX, 1.4, 0.2);
  root.add(held);
  /* The held pay flows from the first flagged row into the total. */
  const from = rows.find((r) => r.flagged)?.i ?? 1;
  const y0 = rowY(from);
  const rx = rowW / 2;
  const out = k.narrow ? 0.18 : 0.35;
  const curve = new CatmullRomCurve3([new Vector3(rx, y0, 0.56),
    new Vector3(rx + out, y0 + 0.45, 0.75),
    new Vector3(rx + out - 0.05, 1.45, 0.45),
    new Vector3(rx - 0.05, 1.95, 0.05)]);
  const TUBE = 140;
  const RAD = 8;
  const tubeGeo = k.owner.own(new TubeGeometry(curve, TUBE, 0.032, RAD));
  const tube = new Mesh(tubeGeo, k.owner.own(new MeshStandardMaterial({
    color: k.palette.ink, roughness: 0.4, metalness: 0.15,
    transparent: true })));
  root.add(tube);
  const before = s.file.beforeFils;
  const gap = s.file.afterFils - before;
  let shown = -1n;
  return { root, update(u: number, l: Layout): void {
    if (k.narrow) place(root, l, rowW + 0.6, 3.4);
    else place(root, l, rowW + 1.0, 5.1);
    root.position.y -= (k.narrow ? 0.7 : 0.15) * root.scale.y;
    const a = seg(u, -0.1, 0.12) * (1 - es(u, 0.8, 0.94));
    fade(root, a);
    if (!root.visible) return;
    root.position.y += es(u, 0.8, 0.96) * 0.9;
    const pull = es(u, 0.14, 0.32) * (1 - es(u, 0.7, 0.8));
    const fix = es(u, 0.32, 0.46);
    for (const r of rows) {
      const tIn = es(u, -0.1 + r.i * 0.035, 0.2 + r.i * 0.035);
      r.g.position.y = rowY(r.i) - (1 - tIn) * 0.25;
      if (r.flagged) {
        r.g.position.z = pull * 0.55;
        r.g.position.x = -pull * 0.1;
        r.g.rotation.x = -pull * 0.05;
        fade(r.g, a * tIn);
        if (r.fixed !== null) fade(r.fixed, a * tIn * fix);
        const was = r.g.children[0];
        if (was !== undefined) fade(was, a * tIn * (1 - fix));
      } else {
        fade(r.g, a * tIn * (1 - pull * 0.6));
      }
    }
    const flow = seg(u, 0.44, 0.64);
    tube.visible = flow > 0;
    tubeGeo.setDrawRange(0, Math.floor(flow * TUBE) * RAD * 6);
    fade(held, a * seg(u, 0.56, 0.66));
    /* Whole per mille steps of the gap, in bigint: no float reaches
     * money (the product's rule for tweened amounts). */
    const step = BigInt(Math.round(es(u, 0.52, 0.7) * 1000));
    if (step !== shown && totalTex !== null) {
      shown = step;
      total.draw(m((before + (gap * step) / 1000n) as Fils));
      totalTex.needsUpdate = true;
    }
  } };
}

/** Cards overlap like a hand; each card's words keep to its first
 * two thirds, so the next card never covers them. */
const SPREAD = 1.45;
/** On a phone the hand falls down the screen instead. */
const DROP = 0.62;

function approvalsScene(k: Kit, s: Story, w: FaceWords, m: MoneyText) {
  const root = new Group();
  const n = s.approvals.length;
  const mid = (n - 1) / 2;
  const tilt = [-0.05, 0.035, -0.02, 0.012, -0.03];
  const cards = s.approvals.map((ap, i) => {
    const g = card(k, approvalFace(k.palette, ap, w, m, false), APPROVAL.w,
      APPROVAL.h);
    const signed = facePlane(k, approvalFace(k.palette, ap, w, m, true,
      k.narrow), 0.003);
    g.add(signed);
    root.add(g);
    return { g, signed, i };
  });
  return { root, update(u: number, l: Layout): void {
    if (k.narrow) place(root, l, APPROVAL.w + 0.6, DROP * (n - 1) + 1.9);
    else place(root, l, SPREAD * (n - 1) + APPROVAL.w + 0.5, 2.4);
    const a = seg(u, -0.1, 0.12) * (1 - es(u, 0.8, 0.94));
    fade(root, a);
    if (!root.visible) return;
    root.position.y += es(u, 0.8, 0.96) * 0.9;
    const tIn = es(u, -0.1, 0.25);
    const fan = es(u, 0.16, 0.36);
    for (const c of cards) {
      const d = c.i - mid;
      const sign = es(u, 0.38 + c.i * 0.08, 0.46 + c.i * 0.08);
      const fx = k.narrow ? (c.i % 2 === 0 ? -0.12 : 0.12) : d * SPREAD;
      const fy = k.narrow ? -d * DROP : -d * d * 0.07;
      c.g.position.set(fx * fan, fy * fan - (1 - tIn) * 0.5 - sign * 0.06,
        c.i * 0.04 + Math.sin(sign * Math.PI) * 0.3);
      c.g.rotation.set(lerp(0.5, 0, tIn), 0, lerp(tilt[c.i % 5] ?? 0,
        k.narrow ? -fx * 0.15 : -d * 0.08, fan));
      fade(c.signed, a * sign);
      /* Crossfade, so the two footers never show at once. */
      const was = c.g.children[1];
      if (was !== undefined) fade(was, a * (1 - sign));
    }
  } };
}

/* ---------- the stage ---------- */

export async function mountStage(i: StageInput): Promise<() => void> {
  await fontsReady();
  if (i.cancelled()) return () => undefined;
  const canvas = document.createElement("canvas");
  canvas.className = i.canvasClass;
  canvas.setAttribute("aria-hidden", "true");
  i.host.prepend(canvas);
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true,
      powerPreference: "high-performance" });
  } catch {
    canvas.remove();
    i.onFail();
    return () => undefined;
  }
  const forced = filmForced();
  if (!forced && softwareGL(renderer.getContext())) {
    i.root.dataset["gate"] = "software";
    renderer.dispose();
    canvas.remove();
    i.onFail();
    return () => undefined;
  }
  const owner = new Owner();
  const p = i.palette;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(new Color(p.paper), 1);
  renderer.localClippingEnabled = true;
  const scene = new Scene();
  scene.fog = new Fog(new Color(p.paper), 10, 25);
  const camera = new PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0, 11);
  scene.add(new HemisphereLight(new Color(p.card), new Color(p.g300), 1.7));
  const key = new DirectionalLight(new Color(p.card), 2.1);
  key.position.set(-4, 6, 8);
  scene.add(key);
  const rim = new DirectionalLight(new Color(p.g300), 0.9);
  rim.position.set(5, -3, -4);
  scene.add(rim);

  const narrow = canvas.clientWidth /
    Math.max(1, canvas.clientHeight) < 1.1;
  const kit: Kit = { owner, palette: p,
    aniso: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    shadowTex: new CanvasTexture(shadow(p).canvas),
    plane: owner.own(new PlaneGeometry(1, 1)),
    narrow };
  owner.own(kit.shadowTex);

  const ribbon = new Ribbon(new Color(p.ink));
  owner.own(ribbon.mesh.geometry);
  owner.own(ribbon.mesh.material);
  scene.add(ribbon.mesh);
  const WM_W = 6;
  const clip = new Plane(new Vector3(-1, 0, 0), 0);
  const wmGeo = owner.own(wordmarkGeometry(WM_W));
  const wmMat = owner.own(new MeshStandardMaterial({ color: p.ink,
    roughness: 0.5, metalness: 0.12, transparent: true,
    clippingPlanes: [clip] }));
  const wordmark = new Mesh(wmGeo, wmMat);
  const wmRoot = new Group();
  wmRoot.add(wordmark);
  scene.add(wmRoot);

  const scenes = [payslipScene(kit, i.story, i.words, i.money),
    listScene(kit, i.story, i.words, i.money),
    approvalsScene(kit, i.story, i.words, i.money)];
  for (const sc of scenes) scene.add(sc.root);

  const l: Layout = { vw: 1, vh: 1, wide: true };
  const resize = (): void => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    l.vh = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    l.vw = l.vh * camera.aspect;
    l.wide = camera.aspect >= 1.1;
    if (l.wide === kit.narrow) i.onRelayout();
  };

  /* Ribbon poses: open flow, the line that writes the name, the quiet
   * thread behind the middle scenes, and the closing calm. */
  const pose = (s: number): RibbonPose => {
    const wmW = Math.min(WM_W, l.vw * 0.82);
    const open: RibbonPose = { x0: -l.vw * 0.75, x1: l.vw * 0.75, y: 0,
      z: -0.4, amp: l.wide ? 1.15 : 0.8, twist: 2.4, width: 0.95,
      freq: 1.05, opacity: 1 };
    const sweep = sweepX(s, wmW);
    const line: RibbonPose = { x0: sweep, x1: l.vw * 0.62, y: 0, z: 0.15,
      amp: 0.05, twist: 0.35, width: 0.08, freq: 1.5,
      opacity: 1 - seg(s, 0.62, 0.74) };
    const back: RibbonPose = { x0: -l.vw * 0.8, x1: l.vw * 0.8,
      y: -l.vh * 0.36, z: -7, amp: 0.9, twist: 1.8, width: 0.8, freq: 0.9,
      opacity: 0.42 * seg(s, 0.95, 1.35) };
    const calm: RibbonPose = { x0: -l.vw * 0.7, x1: l.vw * 0.7,
      y: -l.vh * 0.3, z: -2.5, amp: 0.35, twist: 1.1, width: 0.5,
      freq: 0.8, opacity: 0.9 };
    if (s < 0.9) return mixPose(open, line, es(s, 0.0, 0.42));
    if (s < 3.85) return back;
    return mixPose(back, calm, es(s, 3.85, 4.35));
  };
  const sweepX = (s: number, wmW: number): number =>
    lerp(-wmW / 2 - 0.15, wmW / 2 + 0.15, es(s, 0.36, 0.68));

  const copyAlpha = (s: number, n: number): number => {
    const u = s - n;
    if (n === 0) return seg(u, 0.6, 0.72) * (1 - seg(u, 0.86, 0.98));
    if (n === 4) return seg(u, 0.12, 0.4);
    return seg(u, 0.0, 0.14) * (1 - seg(u, 0.78, 0.9));
  };
  const lastCopy = i.copy.map(() => -1);

  const frame = (s: number, time: number): void => {
    const wmScale = Math.min(1, (l.vw * 0.82) / WM_W);
    const wmW = WM_W * wmScale;
    ribbon.update(pose(s), time);
    /* The name: written by the line in scene 1, back for the close. */
    const out = es(s, 0.8, 0.98);
    const back = es(s, 3.9, 4.4);
    const showName = s < 1.15 || s > 3.9;
    wmRoot.visible = showName;
    if (showName) {
      wmRoot.scale.setScalar(wmScale);
      const closeY = l.vh * (l.wide ? 0.17 : 0.2);
      if (s < 2) {
        clip.constant = sweepX(s, wmW);
        wmRoot.position.set(0, out * 0.9 + (l.wide ? 0 : l.vh * 0.04),
          lerp(-0.3, 0, es(s, 0.36, 0.7)));
        wmRoot.rotation.y = lerp(0.18, 0, es(s, 0.3, 0.75));
        wmMat.opacity = 1 - out;
      } else {
        clip.constant = 1e3;
        wmRoot.position.set(0, lerp(closeY - 0.5, closeY, back), 0);
        wmRoot.rotation.y = lerp(-0.12, 0, back);
        wmMat.opacity = back;
      }
    }
    scenes.forEach((sc, n) => sc.update(s - (n + 1), l));
    i.copy.forEach((el, n) => {
      const a = Math.round(copyAlpha(s, n) * 100) / 100;
      if (a === lastCopy[n]) return;
      lastCopy[n] = a;
      el.style.opacity = String(a);
      el.style.transform = `translateY(${(1 - a) * 12}px)`;
      if (n < 4) el.style.visibility = a < 0.01 ? "hidden" : "visible";
    });
    /* A slow drift of the camera with the story, never with the mouse. */
    camera.position.x = Math.sin(s * 0.9) * 0.18;
    camera.position.y = Math.cos(s * 0.7) * 0.1;
    camera.lookAt(0, 0, 0);
  };

  /* Time drives the story at an even pace (each scene eases its own
   * moves); it plays once, holds on the close, and hands back. */
  const progress = { s: 0, intro: 0 };
  performance.mark("opening:start");
  const tween = gsap.timeline({ onComplete: () => {
    /* The film's own length, for the e2e spec and a quick check. */
    performance.measure("opening", "opening:start");
    i.onEnd();
  } })
    .to(progress, { s: i.end, duration: i.seconds, ease: "none" }, 0.15)
    .to(progress, { intro: 1, duration: 1.2, ease: "power2.out" }, 0)
    .to({}, { duration: i.hold });

  /* Render only while the stage is on screen and the tab is shown. */
  let onScreen = true;
  let raf = 0;
  let frames = 0;
  let cpu = 0;
  let since = performance.now();
  /* The gate (gate.ts): frames 30 to 90 after the first scene is drawn
   * on a loaded page; if they run too slowly (weak graphics), the film
   * fades straight into the product. */
  const gaps: number[] = [];
  let last = -1;
  let gated = forced;
  const loop = (now: number): void => {
    raf = requestAnimationFrame(loop);
    if (!gated && document.readyState === "complete") {
      if (last >= 0) gaps.push(now - last);
      last = now;
      const slow = tooSlow(gaps);
      if (slow || gateDone(gaps)) {
        gated = true;
        if (slow) {
          i.root.dataset["gate"] = "slow";
          tween.kill();
          cancelAnimationFrame(raf);
          raf = -1;
          i.onEnd();
          return;
        }
      }
    }
    /* The ribbon always breathes a little, so draw each frame while
     * on screen; the rest is a pure function of the scroll position. */
    const t0 = performance.now();
    const time = now / 1000;
    frame(progress.s, time);
    canvas.style.opacity = String(progress.intro);
    renderer.render(scene, camera);
    cpu += performance.now() - t0;
    frames += 1;
    if (now - since >= 1000) {
      i.root.dataset["fps"] = String(Math.round((frames * 1000) /
        (now - since)));
      i.root.dataset["cpu"] = (cpu / frames).toFixed(2);
      i.root.dataset["calls"] = String(renderer.info.render.calls);
      i.root.dataset["tris"] = String(renderer.info.render.triangles);
      frames = 0;
      cpu = 0;
      since = now;
    }
  };
  const run = (): void => {
    const go = onScreen && document.visibilityState === "visible";
    if (raf < 0) return;
    if (go && raf === 0) raf = requestAnimationFrame(loop);
    if (!go && raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = -1;
    }
  };
  const seen = new IntersectionObserver((e) => {
    onScreen = e.some((x) => x.isIntersecting);
    run();
  });
  seen.observe(i.host);
  document.addEventListener("visibilitychange", run);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const lost = (e: Event): void => {
    e.preventDefault();
    i.onFail();
  };
  canvas.addEventListener("webglcontextlost", lost);
  resize();
  run();

  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    seen.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", run);
    canvas.removeEventListener("webglcontextlost", lost);
    tween.kill();
    owner.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
}
