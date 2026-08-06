// ---------------------------------------------------------------------------
// The single source of truth for the intro part.
//
// One parametric solid model (millimetres, engineering origin at the bottom
// left rear corner) drives BOTH:
//   • the 2D engineering drawing that is drafted in Act I, and
//   • the 3D assembly that is extruded, wireframed, shaded and exploded after.
//
// The blueprint is a true orthographic projection of these solids — front view
// (looking down -Z) and right view (looking down -X) — so the drawing and the
// rendered model can never disagree.
// ---------------------------------------------------------------------------
import type { FinishKey } from "./materials";

export type Axis = "x" | "y" | "z";

type Common = {
  name: string;
  finish: FinishKey;
  /** metres-per-mm agnostic: explode direction/distance in scene units */
  blow: [number, number, number];
  /** perpendicular bow of the flight path so parts arc instead of sliding */
  bow: [number, number, number];
  spin: [number, number, number];
  mass: number;
  delay: number;
};

export type Solid =
  | (Common & { kind: "box"; size: [number, number, number]; center: [number, number, number] })
  | (Common & { kind: "cyl"; r: number; length: number; axis: Axis; center: [number, number, number] });

/** mm → scene units */
export const MM = 1 / 60;

/** TR-BRK-0142 — welded mounting bracket, the part in the drawing. */
export const MODEL: Solid[] = [
  {
    name: "Base plate",
    kind: "box",
    size: [338, 52, 118],
    center: [169, 26, 59],
    finish: "aluminum",
    blow: [0, -2.4, 0],
    bow: [0.8, 0, 0.5],
    spin: [0.12, 0.4, -0.08],
    mass: 2.4,
    delay: 0,
  },
  {
    name: "Vertical web",
    kind: "box",
    size: [78, 208, 118],
    center: [39, 156, 59],
    finish: "aluminum",
    blow: [-3.2, 1.1, -0.4],
    bow: [0, 1.4, 1.2],
    spin: [0.25, -0.8, 0.3],
    mass: 1.6,
    delay: 0.08,
  },
  {
    name: "Stiffening rib",
    kind: "box",
    size: [24, 96, 90],
    center: [96, 74, 59],
    finish: "black",
    blow: [1.2, 2.4, -1.9],
    bow: [1.4, 0, 1.0],
    spin: [1.0, 0.5, 0.7],
    mass: 0.9,
    delay: 0.16,
  },
  {
    name: "Bearing boss",
    kind: "cyl",
    r: 34,
    length: 132,
    axis: "z",
    center: [39, 196, 59],
    finish: "steel",
    blow: [-1.2, 2.0, 2.9],
    bow: [-1.4, 0.6, 0],
    spin: [0.8, 1.6, 0.2],
    mass: 0.9,
    delay: 0.22,
  },
  {
    name: "Bronze bush",
    kind: "cyl",
    r: 21,
    length: 150,
    axis: "z",
    center: [39, 196, 59],
    finish: "brass",
    blow: [-1.6, -1.2, 3.4],
    bow: [-1.0, -1.2, 0],
    spin: [1.4, 0.4, 1.0],
    mass: 0.45,
    delay: 0.3,
  },
  {
    name: "Bolt A",
    kind: "cyl",
    r: 13,
    length: 76,
    axis: "y",
    center: [230, 30, 34],
    finish: "steel",
    blow: [1.8, -2.0, -1.9],
    bow: [0, 1.5, -0.8],
    spin: [1.3, 2.1, 0],
    mass: 0.5,
    delay: 0.26,
  },
  {
    name: "Bolt B",
    kind: "cyl",
    r: 13,
    length: 76,
    axis: "y",
    center: [290, 30, 84],
    finish: "steel",
    blow: [2.4, -2.0, 2.0],
    bow: [0, 1.6, 0.9],
    spin: [-1.2, 2.0, 0],
    mass: 0.5,
    delay: 0.32,
  },
];

// ------------------------------------------------------------------ bounds
function extents(s: Solid): { min: [number, number, number]; max: [number, number, number] } {
  const c = s.center;
  if (s.kind === "box") {
    const h = [s.size[0] / 2, s.size[1] / 2, s.size[2] / 2];
    return { min: [c[0] - h[0], c[1] - h[1], c[2] - h[2]], max: [c[0] + h[0], c[1] + h[1], c[2] + h[2]] };
  }
  const half: [number, number, number] =
    s.axis === "x" ? [s.length / 2, s.r, s.r] : s.axis === "y" ? [s.r, s.length / 2, s.r] : [s.r, s.r, s.length / 2];
  return {
    min: [c[0] - half[0], c[1] - half[1], c[2] - half[2]],
    max: [c[0] + half[0], c[1] + half[1], c[2] + half[2]],
  };
}

export const MODEL_BOUNDS = (() => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const s of MODEL) {
    const e = extents(s);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], e.min[i]);
      max[i] = Math.max(max[i], e.max[i]);
    }
  }
  return { min: min as [number, number, number], max: max as [number, number, number] };
})();

/** Model centre in mm — used to recentre the 3D assembly on the origin. */
const CEN: [number, number, number] = [
  (MODEL_BOUNDS.min[0] + MODEL_BOUNDS.max[0]) / 2,
  (MODEL_BOUNDS.min[1] + MODEL_BOUNDS.max[1]) / 2,
  (MODEL_BOUNDS.min[2] + MODEL_BOUNDS.max[2]) / 2,
];

/** Scene-space home position of a solid (mm model, recentred and scaled). */
export function homeOf(s: Solid): [number, number, number] {
  return [(s.center[0] - CEN[0]) * MM, (s.center[1] - CEN[1]) * MM, (s.center[2] - CEN[2]) * MM];
}

/** Fixed rotation that orients a cylinder along its declared axis. */
export function rotationOf(s: Solid): [number, number, number] {
  if (s.kind !== "cyl") return [0, 0, 0];
  if (s.axis === "z") return [Math.PI / 2, 0, 0];
  if (s.axis === "x") return [0, 0, Math.PI / 2];
  return [0, 0, 0];
}

// ---------------------------------------------------------- 2D projection
export type Layer = "construction" | "outline" | "hidden" | "center" | "section";
export type Pt = [number, number];

export type Ent =
  | { k: "line"; a: Pt; b: Pt; layer: Layer; t0: number; t1: number }
  | { k: "circle"; c: Pt; r: number; layer: Layer; t0: number; t1: number }
  | { k: "arc"; c: Pt; r: number; s: number; e: number; layer: Layer; t0: number; t1: number }
  | { k: "dim"; a: Pt; b: Pt; off: number; axis: "h" | "v"; text: string; t0: number; t1: number }
  | { k: "leader"; a: Pt; b: Pt; text: string; t0: number; t1: number }
  | { k: "text"; a: Pt; text: string; size: number; dim?: boolean; t0: number; t1: number }
  | { k: "hatch"; x0: number; y0: number; x1: number; y1: number; t0: number; t1: number }
  | { k: "detail"; c: Pt; r: number; label: string; t0: number; t1: number };

export const SHEET_W = 1080;
export const SHEET_H = 660;

// where each orthographic view sits on the sheet (drawing units == mm)
const FX = 150; // front view origin X (model x = 0)
const FY = 500; // baseline Y (model y = 0)
const SX = 620; // right view origin X (model z = 0)

type Rect = { x0: number; y0: number; x1: number; y1: number };
type Shape =
  | { kind: "rect"; rect: Rect; depth: number; hidden?: boolean }
  | { kind: "circle"; c: Pt; r: number; depth: number; hidden?: boolean };

function rectOf(min: number, max: number, ymin: number, ymax: number, ox: number): Rect {
  return { x0: ox + min, y0: FY - ymax, x1: ox + max, y1: FY - ymin };
}

function contains(a: Rect, b: Rect) {
  return a.x0 <= b.x0 + 0.5 && a.y0 <= b.y0 + 0.5 && a.x1 >= b.x1 - 0.5 && a.y1 >= b.y1 - 0.5;
}

/** Silhouettes of every solid in one orthographic view. */
function project(view: "front" | "right"): Shape[] {
  const out: Shape[] = [];
  for (const s of MODEL) {
    const e = extents(s);
    const ox = view === "front" ? FX : SX;
    const depth = view === "front" ? e.max[2] : e.max[0];
    const hAxis = view === "front" ? 0 : 2; // horizontal model axis in this view
    const circleAxis = view === "front" ? "z" : "x";

    if (s.kind === "cyl" && s.axis === circleAxis) {
      const cx = ox + (view === "front" ? s.center[0] : s.center[2]);
      out.push({ kind: "circle", c: [cx, FY - s.center[1]], r: s.r, depth });
    } else {
      out.push({
        kind: "rect",
        rect: rectOf(e.min[hAxis], e.max[hAxis], e.min[1], e.max[1], ox),
        depth,
      });
    }
  }

  // Anything fully behind (and inside the silhouette of) a nearer solid is
  // drawn as a hidden line — exactly how a draughtsman would resolve it.
  for (const a of out) {
    if (a.kind !== "rect") continue;
    for (const b of out) {
      if (b === a || b.kind !== "rect") continue;
      if (b.depth > a.depth && contains(b.rect, a.rect)) a.hidden = true;
    }
  }
  return out;
}

function rectLines(r: Rect, layer: Layer, t0: number, step: number): Ent[] {
  const pts: Pt[] = [
    [r.x0, r.y1],
    [r.x1, r.y1],
    [r.x1, r.y0],
    [r.x0, r.y0],
    [r.x0, r.y1],
  ];
  return pts.slice(0, 4).map((a, i) => ({
    k: "line" as const,
    a,
    b: pts[i + 1],
    layer,
    t0: t0 + i * step,
    t1: t0 + i * step + 0.2,
  }));
}

const fmt = (v: number) => v.toFixed(2).replace(".", ",");

/**
 * Drafts the sheet for the model: construction grid, both view silhouettes,
 * hidden detail, centre lines, dimension chains, callouts, a section cut and
 * the annotation block. Timings are in seconds from the start of the intro.
 */
export function buildBlueprintEntities(): Ent[] {
  const e: Ent[] = [];
  const B = MODEL_BOUNDS;
  const front = project("front");
  const right = project("right");

  // ---- construction lines (0.15 – 1.05)
  const cons: Array<[Pt, Pt]> = [
    [[FX - 60, FY], [SX + B.max[2] + 90, FY]],
    [[FX - 60, FY - B.max[1]], [SX + B.max[2] + 90, FY - B.max[1]]],
    [[FX - 60, FY - 52], [SX + B.max[2] + 90, FY - 52]],
    [[FX, FY + 60], [FX, FY - B.max[1] - 70]],
    [[FX + B.max[0], FY + 60], [FX + B.max[0], FY - B.max[1] - 70]],
    [[FX + 78, FY + 40], [FX + 78, FY - B.max[1] - 40]],
    [[SX, FY + 60], [SX, FY - B.max[1] - 70]],
    [[SX + B.max[2], FY + 60], [SX + B.max[2], FY - B.max[1] - 70]],
  ];
  cons.forEach(([a, b], i) =>
    e.push({ k: "line", a, b, layer: "construction", t0: 0.15 + i * 0.07, t1: 0.45 + i * 0.07 }),
  );

  // ---- visible + hidden geometry of both views (0.95 – 2.35)
  const emit = (shapes: Shape[], base: number) => {
    let i = 0;
    for (const s of shapes) {
      const hidden = s.hidden === true;
      const layer: Layer = hidden ? "hidden" : "outline";
      const t0 = base + (hidden ? 1.05 : 0) + i * 0.07;
      if (s.kind === "rect") e.push(...rectLines(s.rect, layer, t0, 0.045));
      else e.push({ k: "circle", c: s.c, r: s.r, layer, t0, t1: t0 + 0.22 });
      i++;
    }
  };
  emit(front, 0.95);
  emit(right, 1.35);

  // ---- centre lines through every turned feature (2.15 – 2.5)
  let ci = 0;
  for (const s of [...front, ...right]) {
    if (s.kind !== "circle") continue;
    const t0 = 2.15 + ci * 0.05;
    e.push({ k: "line", a: [s.c[0] - s.r - 14, s.c[1]], b: [s.c[0] + s.r + 14, s.c[1]], layer: "center", t0, t1: t0 + 0.16 });
    e.push({ k: "line", a: [s.c[0], s.c[1] - s.r - 14], b: [s.c[0], s.c[1] + s.r + 14], layer: "center", t0: t0 + 0.03, t1: t0 + 0.19 });
    ci++;
  }
  // bolt axes in the front view
  for (const s of MODEL) {
    if (s.kind !== "cyl" || s.axis !== "y") continue;
    const x = FX + s.center[0];
    const t0 = 2.15 + ci * 0.05;
    e.push({ k: "line", a: [x, FY + 16], b: [x, FY - s.center[1] - s.length / 2 - 16], layer: "center", t0, t1: t0 + 0.18 });
    ci++;
  }

  // ---- dimension chains, generated from the real model numbers (2.34 – 2.9)
  e.push({ k: "dim", a: [FX, FY], b: [FX + B.max[0], FY], off: 74, axis: "h", text: fmt(B.max[0] - B.min[0]), t0: 2.34, t1: 2.56 });
  e.push({ k: "dim", a: [FX, FY - B.max[1]], b: [FX, FY], off: -70, axis: "v", text: fmt(B.max[1] - B.min[1]), t0: 2.42, t1: 2.64 });
  e.push({ k: "dim", a: [FX, FY - 52], b: [FX, FY], off: -26, axis: "v", text: "52", t0: 2.5, t1: 2.68 });
  const bolts = MODEL.filter((s) => s.kind === "cyl" && s.axis === "y");
  if (bolts.length === 2) {
    e.push({
      k: "dim",
      a: [FX + bolts[0].center[0], FY],
      b: [FX + bolts[1].center[0], FY],
      off: 30,
      axis: "h",
      text: fmt(bolts[1].center[0] - bolts[0].center[0]),
      t0: 2.56,
      t1: 2.74,
    });
  }
  e.push({ k: "dim", a: [SX, FY], b: [SX + B.max[2], FY], off: 46, axis: "h", text: fmt(B.max[2] - B.min[2]), t0: 2.62, t1: 2.8 });

  // ---- feature callouts taken straight from the solids (2.62 – 3.05)
  const boss = MODEL.find((s) => s.name === "Bearing boss");
  const bush = MODEL.find((s) => s.name === "Bronze bush");
  if (boss && boss.kind === "cyl") {
    e.push({
      k: "leader",
      a: [FX + boss.center[0] + boss.r * 0.7, FY - boss.center[1] - boss.r * 0.7],
      b: [FX + boss.center[0] + 150, FY - boss.center[1] - 66],
      text: `⌀${boss.r * 2} BOSS`,
      t0: 2.62,
      t1: 2.82,
    });
  }
  if (bush && bush.kind === "cyl") {
    e.push({
      k: "leader",
      a: [FX + bush.center[0], FY - bush.center[1] + bush.r],
      b: [FX + bush.center[0] + 176, FY - bush.center[1] + 74],
      text: `⌀${bush.r * 2} H7 THRU`,
      t0: 2.7,
      t1: 2.9,
    });
  }
  if (bolts[0] && bolts[0].kind === "cyl") {
    e.push({
      k: "leader",
      a: [FX + bolts[0].center[0], FY - 52],
      b: [FX + bolts[0].center[0] + 96, FY + 26],
      text: `2× ⌀${bolts[0].r * 2} THRU`,
      t0: 2.78,
      t1: 2.98,
    });
  }
  e.push({ k: "leader", a: [SX + 118, FY - 150], b: [SX + 206, FY - 190], text: "TOL ±0,10", t0: 2.86, t1: 3.04 });

  // ---- section B-B through the right view
  e.push({ k: "line", a: [SX - 34, FY - 150], b: [SX + B.max[2] + 34, FY - 150], layer: "section", t0: 2.9, t1: 3.06 });
  e.push({ k: "text", a: [SX - 48, FY - 154], text: "B", size: 15, t0: 3.0, t1: 3.1 });
  e.push({ k: "text", a: [SX + B.max[2] + 40, FY - 154], text: "B", size: 15, t0: 3.0, t1: 3.1 });
  e.push({ k: "hatch", x0: SX + 2, y0: FY - B.max[1] + 2, x1: SX + B.max[2] - 2, y1: FY - 152, t0: 2.98, t1: 3.24 });

  // ---- detail circle on the boss + annotation block
  if (boss) {
    e.push({ k: "detail", c: [FX + boss.center[0], FY - boss.center[1]], r: 76, label: "A", t0: 3.0, t1: 3.2 });
  }
  e.push({ k: "text", a: [FX - 12, FY + 108], text: "FRONT VIEW  (1:2)", size: 13, dim: true, t0: 3.02, t1: 3.12 });
  e.push({ k: "text", a: [SX - 12, FY + 108], text: "RIGHT VIEW  (1:2)", size: 13, dim: true, t0: 3.06, t1: 3.16 });
  e.push({ k: "text", a: [FX - 12, 112], text: "TR-BRK-0142 — MOUNTING BRACKET, WELDED ASSEMBLY", size: 17, t0: 3.06, t1: 3.18 });
  e.push({
    k: "text",
    a: [FX - 12, 136],
    text: "MATERIAL: EN AW-6082 T6   ·   PLATE 52 mm   ·   FINISH: BRUSHED",
    size: 12,
    dim: true,
    t0: 3.1,
    t1: 3.22,
  });
  e.push({
    k: "text",
    a: [FX - 12, 156],
    text: "GENERAL TOL. ISO 2768-mK   ·   DEBURR AND BREAK SHARP EDGES   ·   THIRD ANGLE PROJECTION",
    size: 12,
    dim: true,
    t0: 3.14,
    t1: 3.26,
  });

  return e;
}
