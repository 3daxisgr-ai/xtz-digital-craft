// Live engineering drafting sequence, drawn on a 2D canvas (not SVG strokes).
//
// The drawing is a real orthographic set: front view + right side view, with
// construction lines, centre lines, hidden lines, dimension chains with arrow
// heads, radius and hole callouts, a section cut with hatching, a detail
// circle and a title block. Entities are drafted in layers over time, with a
// drafting head (crosshair) tracking the pen, exactly like watching a drawing
// being produced in SolidWorks or Inventor.
//
// Runs entirely off a shared clock object + rAF: zero React re-renders.
import { useEffect, useRef } from "react";

type Pt = [number, number];

type Ent =
  | { k: "line"; a: Pt; b: Pt; layer: Layer; t0: number; t1: number }
  | { k: "circle"; c: Pt; r: number; layer: Layer; t0: number; t1: number }
  | { k: "arc"; c: Pt; r: number; s: number; e: number; layer: Layer; t0: number; t1: number }
  | { k: "dim"; a: Pt; b: Pt; off: number; axis: "h" | "v"; text: string; t0: number; t1: number }
  | { k: "leader"; a: Pt; b: Pt; text: string; t0: number; t1: number }
  | { k: "text"; a: Pt; text: string; size: number; dim?: boolean; t0: number; t1: number }
  | { k: "hatch"; x0: number; y0: number; x1: number; y1: number; t0: number; t1: number }
  | { k: "detail"; c: Pt; r: number; label: string; t0: number; t1: number };

type Layer = "construction" | "outline" | "hidden" | "center" | "section";

const W = 1080; // drawing-space width
const H = 660; // drawing-space height

const INK = {
  construction: "rgba(126,176,230,0.22)",
  outline: "rgba(232,243,255,0.95)",
  hidden: "rgba(178,206,236,0.5)",
  center: "rgba(150,196,240,0.55)",
  section: "rgba(120,178,232,0.6)",
  dim: "rgba(158,204,242,0.78)",
  note: "rgba(214,233,252,0.8)",
};

// ---------------------------------------------------------------- geometry
// front view origin (bottom-left of the L bracket)
const FX = 190;
const FY = 470;
// side view origin
const SX = 620;
const SY = 470;

const p = (x: number, y: number): Pt => [x, y];

function buildEntities(): Ent[] {
  const e: Ent[] = [];
  const push = (x: Ent) => e.push(x);

  // ---- layer 1: construction lines (0.15 – 1.05)
  const cons: Array<[Pt, Pt]> = [
    [p(FX - 70, FY), p(SX + 200, FY)],
    [p(FX - 70, FY - 260), p(SX + 200, FY - 260)],
    [p(FX - 70, FY - 52), p(SX + 200, FY - 52)],
    [p(FX, FY + 70), p(FX, FY - 320)],
    [p(FX + 338, FY + 70), p(FX + 338, FY - 320)],
    [p(FX + 78, FY + 40), p(FX + 78, FY - 320)],
    [p(SX, SY + 60), p(SX, SY - 320)],
    [p(SX + 118, SY + 60), p(SX + 118, SY - 320)],
  ];
  cons.forEach(([a, b], i) =>
    push({ k: "line", a, b, layer: "construction", t0: 0.15 + i * 0.075, t1: 0.45 + i * 0.075 }),
  );

  // ---- layer 2: main outline of the front view (0.95 – 1.95)
  const outline: Pt[] = [
    p(FX, FY),
    p(FX + 338, FY),
    p(FX + 338, FY - 52),
    p(FX + 78, FY - 52),
    p(FX + 78, FY - 260),
    p(FX, FY - 260),
    p(FX, FY),
  ];
  for (let i = 0; i < outline.length - 1; i++) {
    // the inner corner is replaced by a fillet, drawn separately
    if (i === 2) continue;
    push({
      k: "line",
      a: outline[i],
      b: outline[i + 1],
      layer: "outline",
      t0: 0.95 + i * 0.11,
      t1: 1.2 + i * 0.11,
    });
  }
  // fillet at the inner corner + its little tangent trims
  push({ k: "line", a: p(FX + 338, FY - 52), b: p(FX + 120, FY - 52), layer: "outline", t0: 1.28, t1: 1.46 });
  push({ k: "arc", c: p(FX + 120, FY - 94), r: 42, s: Math.PI / 2, e: Math.PI, layer: "outline", t0: 1.46, t1: 1.62 });
  push({ k: "line", a: p(FX + 78, FY - 94), b: p(FX + 78, FY - 260), layer: "outline", t0: 1.62, t1: 1.76 });

  // holes in the front view
  push({ k: "circle", c: p(FX + 39, FY - 214), r: 21, layer: "outline", t0: 1.7, t1: 1.94 });
  push({ k: "circle", c: p(FX + 39, FY - 214), r: 30, layer: "hidden", t0: 1.86, t1: 2.06 });
  push({ k: "circle", c: p(FX + 200, FY - 26), r: 15, layer: "outline", t0: 1.82, t1: 2.02 });
  push({ k: "circle", c: p(FX + 288, FY - 26), r: 15, layer: "outline", t0: 1.9, t1: 2.1 });

  // ---- side view outline
  push({ k: "line", a: p(SX, SY), b: p(SX + 118, SY), layer: "outline", t0: 1.5, t1: 1.66 });
  push({ k: "line", a: p(SX + 118, SY), b: p(SX + 118, SY - 260), layer: "outline", t0: 1.62, t1: 1.8 });
  push({ k: "line", a: p(SX + 118, SY - 260), b: p(SX, SY - 260), layer: "outline", t0: 1.74, t1: 1.9 });
  push({ k: "line", a: p(SX, SY - 260), b: p(SX, SY), layer: "outline", t0: 1.84, t1: 2.0 });

  // ---- layer 3: hidden lines (2.0 – 2.35)
  const hid: Array<[Pt, Pt]> = [
    [p(SX + 30, SY - 260), p(SX + 30, SY)],
    [p(SX + 88, SY - 260), p(SX + 88, SY)],
    [p(SX, SY - 52), p(SX + 118, SY - 52)],
    [p(FX + 78, FY - 26), p(FX + 338, FY - 26)],
  ];
  hid.forEach(([a, b], i) =>
    push({ k: "line", a, b, layer: "hidden", t0: 2.0 + i * 0.07, t1: 2.2 + i * 0.07 }),
  );

  // ---- layer 4: centre lines (2.15 – 2.5)
  const cl: Array<[Pt, Pt]> = [
    [p(FX + 39, FY - 258), p(FX + 39, FY - 170)],
    [p(FX - 5, FY - 214), p(FX + 83, FY - 214)],
    [p(FX + 200, FY - 62), p(FX + 200, FY + 10)],
    [p(FX + 288, FY - 62), p(FX + 288, FY + 10)],
    [p(SX - 18, SY - 214), p(SX + 136, SY - 214)],
  ];
  cl.forEach(([a, b], i) =>
    push({ k: "line", a, b, layer: "center", t0: 2.15 + i * 0.05, t1: 2.32 + i * 0.05 }),
  );

  // ---- layer 5: dimensions (2.35 – 3.0)
  push({ k: "dim", a: p(FX, FY), b: p(FX + 338, FY), off: 62, axis: "h", text: "338,00", t0: 2.34, t1: 2.56 });
  push({ k: "dim", a: p(FX, FY - 260), b: p(FX, FY), off: -66, axis: "v", text: "260,00", t0: 2.42, t1: 2.64 });
  push({ k: "dim", a: p(FX, FY - 52), b: p(FX, FY), off: -22, axis: "v", text: "52", t0: 2.5, t1: 2.68 });
  push({ k: "dim", a: p(FX + 200, FY), b: p(FX + 288, FY), off: 26, axis: "h", text: "88,00", t0: 2.56, t1: 2.74 });
  push({ k: "dim", a: p(SX, SY), b: p(SX + 118, SY), off: 40, axis: "h", text: "118,00", t0: 2.62, t1: 2.8 });

  // ---- radius + hole callouts (2.6 – 3.05)
  push({ k: "leader", a: p(FX + 96, FY - 118), b: p(FX + 8, FY - 152), text: "R25", t0: 2.62, t1: 2.82 });
  push({ k: "leader", a: p(FX + 54, FY - 200), b: p(FX + 152, FY - 236), text: "⌀21 THRU", t0: 2.7, t1: 2.9 });
  push({ k: "leader", a: p(FX + 288, FY - 16), b: p(FX + 368, FY + 26), text: "2× ⌀15 ⌵ ⌀24×90°", t0: 2.78, t1: 2.98 });
  push({ k: "leader", a: p(SX + 118, SY - 150), b: p(SX + 206, SY - 186), text: "TOL ±0,10", t0: 2.86, t1: 3.04 });

  // ---- section cut B-B through the side view, with hatching
  push({ k: "line", a: p(SX - 34, SY - 150), b: p(SX + 152, SY - 150), layer: "section", t0: 2.9, t1: 3.06 });
  push({ k: "text", a: p(SX - 48, SY - 154), text: "B", size: 15, t0: 3.0, t1: 3.1 });
  push({ k: "text", a: p(SX + 158, SY - 154), text: "B", size: 15, t0: 3.0, t1: 3.1 });
  push({ k: "hatch", x0: SX + 2, y0: SY - 258, x1: SX + 116, y1: SY - 152, t0: 2.98, t1: 3.24 });

  // ---- detail circle A on the fillet + annotations
  push({ k: "detail", c: p(FX + 104, FY - 76), r: 62, label: "A", t0: 3.0, t1: 3.2 });
  push({ k: "text", a: p(FX - 12, FY + 118), text: "FRONT VIEW  (1:2)", size: 13, dim: true, t0: 3.02, t1: 3.12 });
  push({ k: "text", a: p(SX - 12, SY + 118), text: "RIGHT VIEW  (1:2)", size: 13, dim: true, t0: 3.06, t1: 3.16 });
  push({ k: "text", a: p(FX - 12, 118), text: "MOUNTING BRACKET — WELDED ASSEMBLY", size: 17, t0: 3.06, t1: 3.18 });
  push({
    k: "text",
    a: p(FX - 12, 142),
    text: "MATERIAL: EN AW-6082 T6   ·   THICKNESS 6 mm   ·   FINISH: BRUSHED + ANODISED CLEAR",
    size: 12,
    dim: true,
    t0: 3.1,
    t1: 3.22,
  });
  push({
    k: "text",
    a: p(FX - 12, 162),
    text: "GENERAL TOL. ISO 2768-mK   ·   DEBURR AND BREAK SHARP EDGES   ·   THIRD ANGLE PROJECTION",
    size: 12,
    dim: true,
    t0: 3.14,
    t1: 3.26,
  });

  return e;
}

// ---------------------------------------------------------------- painting
function ramp(t: number, t0: number, t1: number) {
  return Math.max(0, Math.min(1, (t - t0) / Math.max(0.001, t1 - t0)));
}

function ease(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

function lerpPt(a: Pt, b: Pt, f: number): Pt {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

function strokeStyleFor(x: CanvasRenderingContext2D, layer: Layer) {
  x.setLineDash([]);
  x.shadowBlur = 0;
  switch (layer) {
    case "construction":
      x.strokeStyle = INK.construction;
      x.lineWidth = 1;
      x.setLineDash([5, 7]);
      break;
    case "hidden":
      x.strokeStyle = INK.hidden;
      x.lineWidth = 1.1;
      x.setLineDash([9, 6]);
      break;
    case "center":
      x.strokeStyle = INK.center;
      x.lineWidth = 1;
      x.setLineDash([16, 5, 3, 5]);
      break;
    case "section":
      x.strokeStyle = INK.section;
      x.lineWidth = 1.6;
      x.setLineDash([22, 6, 4, 6]);
      break;
    default:
      x.strokeStyle = INK.outline;
      x.lineWidth = 2;
      x.shadowBlur = 10;
      x.shadowColor = "rgba(130,196,255,0.45)";
  }
}

function arrow(x: CanvasRenderingContext2D, at: Pt, dir: number) {
  const s = 8;
  x.save();
  x.translate(at[0], at[1]);
  x.rotate(dir);
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(-s, s * 0.32);
  x.lineTo(-s, -s * 0.32);
  x.closePath();
  x.fillStyle = INK.dim;
  x.fill();
  x.restore();
}

function drawGrid(x: CanvasRenderingContext2D, a: number) {
  x.save();
  x.globalAlpha = a;
  x.strokeStyle = "rgba(108,164,220,0.10)";
  x.lineWidth = 1;
  for (let i = 0; i <= W; i += 20) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, H);
    x.stroke();
  }
  for (let i = 0; i <= H; i += 20) {
    x.beginPath();
    x.moveTo(0, i);
    x.lineTo(W, i);
    x.stroke();
  }
  x.strokeStyle = "rgba(108,164,220,0.16)";
  for (let i = 0; i <= W; i += 100) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, H);
    x.stroke();
  }
  for (let i = 0; i <= H; i += 100) {
    x.beginPath();
    x.moveTo(0, i);
    x.lineTo(W, i);
    x.stroke();
  }
  x.restore();
}

function drawFrame(x: CanvasRenderingContext2D, a: number) {
  x.save();
  x.globalAlpha = a;
  x.strokeStyle = "rgba(190,222,252,0.35)";
  x.lineWidth = 1.4;
  x.strokeRect(24, 24, W - 48, H - 48);
  x.strokeRect(34, 34, W - 68, H - 68);
  // title block
  const bw = 344;
  const bh = 96;
  const bx = W - 34 - bw;
  const by = H - 34 - bh;
  x.strokeRect(bx, by, bw, bh);
  x.beginPath();
  x.moveTo(bx, by + 34);
  x.lineTo(bx + bw, by + 34);
  x.moveTo(bx, by + 65);
  x.lineTo(bx + bw, by + 65);
  x.moveTo(bx + 210, by);
  x.lineTo(bx + 210, by + bh);
  x.stroke();
  x.fillStyle = "rgba(224,240,255,0.85)";
  x.font = "600 15px ui-monospace, SFMono-Regular, Menlo, monospace";
  x.fillText("TOREO ENGINEERING", bx + 12, by + 23);
  x.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  x.fillStyle = "rgba(190,216,240,0.7)";
  x.fillText("DRW  TR-BRK-0142", bx + 12, by + 55);
  x.fillText("SCALE  1:2", bx + 222, by + 55);
  x.fillText("SHEET  1/1   ISO-A3", bx + 12, by + 85);
  x.fillText("REV  C", bx + 222, by + 85);
  x.fillText("MM", bx + 222, by + 23);
  x.restore();
}

/** Draws the whole sheet for a given time (seconds). Pure function of t. */
function paint(x: CanvasRenderingContext2D, ents: Ent[], t: number) {
  x.clearRect(0, 0, W, H);
  drawGrid(x, ramp(t, 0, 0.5) * 0.9);
  drawFrame(x, ramp(t, 0.25, 0.9));

  let pen: Pt | null = null;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";

  for (const en of ents) {
    const raw = ramp(t, en.t0, en.t1);
    if (raw <= 0) continue;
    const f = ease(raw);
    x.save();

    if (en.k === "line") {
      strokeStyleFor(x, en.layer);
      const b = lerpPt(en.a, en.b, f);
      x.beginPath();
      x.moveTo(en.a[0], en.a[1]);
      x.lineTo(b[0], b[1]);
      x.stroke();
      if (raw < 1) pen = b;
    } else if (en.k === "circle" || en.k === "arc") {
      strokeStyleFor(x, en.layer);
      const s = en.k === "arc" ? en.s : -Math.PI / 2;
      const span = (en.k === "arc" ? en.e - en.s : Math.PI * 2) * f;
      x.beginPath();
      x.arc(en.c[0], en.c[1], en.r, s, s + span);
      x.stroke();
      if (raw < 1) pen = [en.c[0] + Math.cos(s + span) * en.r, en.c[1] + Math.sin(s + span) * en.r];
    } else if (en.k === "dim") {
      x.setLineDash([]);
      x.strokeStyle = INK.dim;
      x.lineWidth = 1;
      const horiz = en.axis === "h";
      const a: Pt = horiz ? [en.a[0], en.a[1] + en.off] : [en.a[0] + en.off, en.a[1]];
      const b: Pt = horiz ? [en.b[0], en.b[1] + en.off] : [en.b[0] + en.off, en.b[1]];
      // extension lines
      x.globalAlpha = 0.6 * f;
      x.beginPath();
      x.moveTo(en.a[0], en.a[1]);
      x.lineTo(a[0] + (horiz ? 0 : Math.sign(en.off) * 6), a[1] + (horiz ? Math.sign(en.off) * 6 : 0));
      x.moveTo(en.b[0], en.b[1]);
      x.lineTo(b[0] + (horiz ? 0 : Math.sign(en.off) * 6), b[1] + (horiz ? Math.sign(en.off) * 6 : 0));
      x.stroke();
      // dimension line grows from the middle outwards
      x.globalAlpha = 1;
      const mid = lerpPt(a, b, 0.5);
      const g0 = lerpPt(mid, a, f);
      const g1 = lerpPt(mid, b, f);
      x.beginPath();
      x.moveTo(g0[0], g0[1]);
      x.lineTo(g1[0], g1[1]);
      x.stroke();
      if (f > 0.94) {
        arrow(x, a, horiz ? Math.PI : Math.PI / 2);
        arrow(x, b, horiz ? 0 : -Math.PI / 2);
      }
      // text
      const ta = ramp(t, en.t1 - 0.06, en.t1 + 0.12);
      if (ta > 0) {
        x.globalAlpha = ta;
        x.fillStyle = INK.dim;
        x.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
        const m = x.measureText(en.text);
        if (horiz) {
          x.fillStyle = "rgba(9,14,20,0.85)";
          x.fillRect(mid[0] - m.width / 2 - 5, mid[1] - 9, m.width + 10, 16);
          x.fillStyle = INK.dim;
          x.fillText(en.text, mid[0] - m.width / 2, mid[1] + 4);
        } else {
          x.translate(mid[0], mid[1]);
          x.rotate(-Math.PI / 2);
          x.fillStyle = "rgba(9,14,20,0.85)";
          x.fillRect(-m.width / 2 - 5, -9, m.width + 10, 16);
          x.fillStyle = INK.dim;
          x.fillText(en.text, -m.width / 2, 4);
        }
      }
      if (raw < 1) pen = g1;
    } else if (en.k === "leader") {
      x.setLineDash([]);
      x.strokeStyle = INK.dim;
      x.lineWidth = 1;
      const knee: Pt = [en.b[0] - Math.sign(en.b[0] - en.a[0]) * 26, en.b[1]];
      const seg1 = lerpPt(en.a, knee, Math.min(1, f * 1.6));
      x.beginPath();
      x.moveTo(en.a[0], en.a[1]);
      x.lineTo(seg1[0], seg1[1]);
      if (f > 0.62) {
        const seg2 = lerpPt(knee, en.b, (f - 0.62) / 0.38);
        x.lineTo(seg2[0], seg2[1]);
      }
      x.stroke();
      arrow(x, en.a, Math.atan2(en.a[1] - knee[1], en.a[0] - knee[0]));
      const ta = ramp(t, en.t1 - 0.05, en.t1 + 0.12);
      if (ta > 0) {
        x.globalAlpha = ta;
        x.fillStyle = INK.note;
        x.font = "12.5px ui-monospace, SFMono-Regular, Menlo, monospace";
        const right = en.b[0] > en.a[0];
        const m = x.measureText(en.text);
        x.fillText(en.text, right ? en.b[0] + 6 : en.b[0] - 6 - m.width, en.b[1] - 5);
      }
      if (raw < 1) pen = seg1;
    } else if (en.k === "text") {
      x.globalAlpha = f;
      x.fillStyle = en.dim ? INK.dim : INK.note;
      x.font = `${en.dim ? "" : "600 "}${en.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      x.fillText(en.text, en.a[0], en.a[1]);
    } else if (en.k === "hatch") {
      x.setLineDash([]);
      x.strokeStyle = "rgba(150,200,240,0.4)";
      x.lineWidth = 1;
      x.save();
      x.beginPath();
      x.rect(en.x0, en.y0, en.x1 - en.x0, en.y1 - en.y0);
      x.clip();
      const span = en.x1 - en.x0 + (en.y1 - en.y0);
      const n = Math.floor(span / 12);
      const shown = Math.floor(n * f);
      for (let i = 0; i <= shown; i++) {
        const o = en.x0 - (en.y1 - en.y0) + i * 12;
        x.beginPath();
        x.moveTo(o, en.y1);
        x.lineTo(o + (en.y1 - en.y0), en.y0);
        x.stroke();
      }
      x.restore();
    } else if (en.k === "detail") {
      x.setLineDash([7, 5]);
      x.strokeStyle = "rgba(150,200,240,0.55)";
      x.lineWidth = 1.2;
      x.beginPath();
      x.arc(en.c[0], en.c[1], en.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
      x.stroke();
      if (f > 0.9) {
        x.setLineDash([]);
        x.globalAlpha = (f - 0.9) / 0.1;
        x.beginPath();
        x.moveTo(en.c[0] - en.r * 0.72, en.c[1] - en.r * 0.72);
        x.lineTo(en.c[0] - en.r - 34, en.c[1] - en.r - 26);
        x.stroke();
        x.fillStyle = INK.note;
        x.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
        x.fillText(`DETAIL ${en.label}  (2:1)`, en.c[0] - en.r - 132, en.c[1] - en.r - 32);
      }
    }
    x.restore();
  }

  // drafting head — a soft crosshair riding the pen
  if (pen) {
    x.save();
    x.globalAlpha = 0.9;
    const g = x.createRadialGradient(pen[0], pen[1], 0, pen[0], pen[1], 34);
    g.addColorStop(0, "rgba(150,214,255,0.45)");
    g.addColorStop(1, "rgba(150,214,255,0)");
    x.fillStyle = g;
    x.fillRect(pen[0] - 34, pen[1] - 34, 68, 68);
    x.strokeStyle = "rgba(198,232,255,0.9)";
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(pen[0] - 11, pen[1]);
    x.lineTo(pen[0] + 11, pen[1]);
    x.moveTo(pen[0], pen[1] - 11);
    x.lineTo(pen[0], pen[1] + 11);
    x.stroke();
    x.restore();
  }
}

export const BLUEPRINT_DURATION = 3.35; // seconds of drafting

export function BlueprintDraft({ clock, offset = 0 }: { clock: { t: number }; offset?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const x = cv.getContext("2d");
    if (!x) return;
    const ents = buildEntities();

    let raf = 0;
    let vw = 0;
    let vh = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      vw = cv.clientWidth;
      vh = cv.clientHeight;
      cv.width = Math.max(1, Math.round(vw * dpr));
      cv.height = Math.max(1, Math.round(vh * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const scale = Math.min((vw * 0.94) / W, (vh * 0.9) / H);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, vw, vh);
      x.save();
      x.translate((vw - W * scale) / 2, (vh - H * scale) / 2);
      x.scale(scale, scale);
      paint(x, ents, clock.t / 1000 - offset);
      x.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [clock, offset]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
