// Server-only geometry fingerprinting.
// Goal: same actual 3D geometry -> same hash, even if the file was renamed,
// re-saved from different software, or has different metadata/comments.
//
// STL (binary + ASCII): parse triangles, quantize vertices to 0.001mm,
// canonicalise (sort vertices inside each triangle, then sort triangles
// lexicographically), sha256 the packed float buffer.
//
// OBJ: parse vertex + face lines only (drop comments/normals/uvs/mtl refs),
// quantize + canonicalise faces, then sha256.
//
// Other formats (STEP/3MF/…): fall back to sha256 of raw file bytes.
// Renames don't change bytes, so this is still stable across renames — it
// just won't detect two mathematically-identical parts saved from different
// exporters. That's clearly documented so admins understand the limit.

import { createHash } from "node:crypto";

const QUANT = 1000; // 0.001 mm

function quant(n: number): number {
  // -0 -> 0, NaN -> 0
  if (!Number.isFinite(n)) return 0;
  const q = Math.round(n * QUANT);
  return q === 0 ? 0 : q;
}

type Tri = [number, number, number, number, number, number, number, number, number];

function canonicalTriangle(v1: [number, number, number], v2: [number, number, number], v3: [number, number, number]): Tri {
  const verts: Array<[number, number, number]> = [
    [quant(v1[0]), quant(v1[1]), quant(v1[2])],
    [quant(v2[0]), quant(v2[1]), quant(v2[2])],
    [quant(v3[0]), quant(v3[1]), quant(v3[2])],
  ];
  verts.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return [
    verts[0][0], verts[0][1], verts[0][2],
    verts[1][0], verts[1][1], verts[1][2],
    verts[2][0], verts[2][1], verts[2][2],
  ];
}

function hashTriangles(tris: Tri[]): string {
  // Sort triangles lexicographically for order-independence.
  tris.sort((a, b) => {
    for (let i = 0; i < 9; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  });
  // Deduplicate exact duplicates.
  const buf = Buffer.alloc(tris.length * 9 * 4);
  let prev: Tri | null = null;
  let outIdx = 0;
  for (const t of tris) {
    if (prev && t.every((v, i) => v === prev![i])) continue;
    for (let i = 0; i < 9; i++) buf.writeInt32LE(t[i], (outIdx * 9 + i) * 4);
    outIdx += 1;
    prev = t;
  }
  const trimmed = buf.subarray(0, outIdx * 9 * 4);
  const h = createHash("sha256");
  h.update("stlgeom:v1:");
  const meta = Buffer.alloc(4);
  meta.writeUInt32LE(outIdx, 0);
  h.update(meta);
  h.update(trimmed);
  return h.digest("hex");
}

function parseBinarySTL(bytes: Uint8Array): Tri[] | null {
  if (bytes.byteLength < 84) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tri = dv.getUint32(80, true);
  const expected = 84 + tri * 50;
  if (tri === 0 || Math.abs(bytes.byteLength - expected) > 4) return null;
  const out: Tri[] = [];
  let p = 84;
  for (let i = 0; i < tri; i++) {
    // skip normal (12 bytes)
    p += 12;
    const v1: [number, number, number] = [dv.getFloat32(p, true), dv.getFloat32(p + 4, true), dv.getFloat32(p + 8, true)]; p += 12;
    const v2: [number, number, number] = [dv.getFloat32(p, true), dv.getFloat32(p + 4, true), dv.getFloat32(p + 8, true)]; p += 12;
    const v3: [number, number, number] = [dv.getFloat32(p, true), dv.getFloat32(p + 4, true), dv.getFloat32(p + 8, true)]; p += 12;
    p += 2; // attribute
    out.push(canonicalTriangle(v1, v2, v3));
  }
  return out;
}

function parseAsciiSTL(text: string): Tri[] | null {
  const lines = text.split(/\r?\n/);
  const verts: Array<[number, number, number]> = [];
  const out: Tri[] = [];
  for (const raw of lines) {
    const s = raw.trim();
    if (s.startsWith("vertex")) {
      const parts = s.split(/\s+/);
      if (parts.length >= 4) verts.push([+parts[1], +parts[2], +parts[3]]);
      if (verts.length === 3) {
        out.push(canonicalTriangle(verts[0], verts[1], verts[2]));
        verts.length = 0;
      }
    }
  }
  return out.length ? out : null;
}

function parseOBJ(text: string): Tri[] | null {
  const verts: Array<[number, number, number]> = [];
  const out: Tri[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const s = raw.trim();
    if (s.length === 0 || s.startsWith("#")) continue;
    if (s.startsWith("v ")) {
      const p = s.split(/\s+/);
      if (p.length >= 4) verts.push([+p[1], +p[2], +p[3]]);
    } else if (s.startsWith("f ")) {
      const p = s.split(/\s+/).slice(1).map((tok) => parseInt(tok.split("/")[0], 10));
      if (p.length < 3) continue;
      // triangulate fan
      for (let i = 1; i < p.length - 1; i++) {
        const a = verts[p[0] - 1], b = verts[p[i] - 1], c = verts[p[i + 1] - 1];
        if (!a || !b || !c) continue;
        out.push(canonicalTriangle(a, b, c));
      }
    }
  }
  return out.length ? out : null;
}

function rawFallback(prefix: string, bytes: Uint8Array): string {
  const h = createHash("sha256");
  h.update(prefix);
  h.update(bytes);
  return h.digest("hex");
}

/**
 * Compute a deterministic geometry hash for a 3D model file.
 * Returns a stable hex string; identical geometry -> identical hash regardless
 * of filename. Falls back to a raw-byte sha256 for unsupported formats.
 */
export async function computeGeometryHash(
  bytes: Uint8Array,
  fileName: string,
): Promise<{ hash: string; mode: "stl" | "obj" | "raw"; triangles: number | null }> {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();

  if (ext === "stl") {
    // Detect binary vs ASCII robustly (ASCII "solid" prefix is a hint, not proof).
    const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.byteLength, 512))).trim().toLowerCase();
    const looksAscii = head.startsWith("solid") && /facet\s+normal/.test(head);
    const tris = looksAscii
      ? parseAsciiSTL(new TextDecoder().decode(bytes))
      : parseBinarySTL(bytes) ?? parseAsciiSTL(new TextDecoder().decode(bytes));
    if (tris && tris.length) {
      return { hash: hashTriangles(tris), mode: "stl", triangles: tris.length };
    }
  }

  if (ext === "obj") {
    const tris = parseOBJ(new TextDecoder().decode(bytes));
    if (tris && tris.length) {
      return { hash: hashTriangles(tris), mode: "obj", triangles: tris.length };
    }
  }

  return { hash: rawFallback(`raw:${ext}:`, bytes), mode: "raw", triangles: null };
}

/**
 * Deterministic quote fingerprint. Same geometry + same options + same
 * pricing engine version → identical fingerprint → cached analysis reused.
 */
export function quoteFingerprint(input: {
  geometry_hash: string;
  material_code: string;
  quantity: number;
  use_type: string;
  pricing_engine_version: string;
  options?: Record<string, unknown>;
}): string {
  const parts = [
    "toreo-qfp:v1",
    input.geometry_hash,
    input.material_code.trim().toLowerCase(),
    String(Math.max(1, Math.floor(Number(input.quantity) || 1))),
    input.use_type.trim().toLowerCase(),
    input.pricing_engine_version,
    JSON.stringify(input.options ?? {}),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}
