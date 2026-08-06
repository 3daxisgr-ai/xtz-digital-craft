// Shared PBR material library for the portfolio 3D scenes.
// Every texture is generated procedurally on the client (no network fetch), so
// the first frame is never blocked waiting on an asset download.
//
// Brushed aluminium is built from three procedural layers:
//   1. anisotropic brush streaks  -> roughness variation along one axis
//   2. micro imperfections        -> blotches, fingerprints, faint machining rings
//   3. a matching micro-normal    -> catches the key light like real ground metal
import * as THREE from "three";

type Canvas2D = { c: HTMLCanvasElement; x: CanvasRenderingContext2D };

function canvas2d(size: number): Canvas2D | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const x = c.getContext("2d");
  if (!x) return null;
  return { c, x };
}

function finish(c: HTMLCanvasElement, repeat = 2) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

let _rough: THREE.Texture | null | undefined;
let _normal: THREE.Texture | null | undefined;

/** Brush streaks + fingerprints + machining rings, packed as a roughness map. */
export function roughnessMap(): THREE.Texture | null {
  if (_rough !== undefined) return _rough;
  const cv = canvas2d(1024);
  if (!cv) return (_rough = null);
  const { c, x } = cv;

  // base roughness
  x.fillStyle = "#7d7d7d";
  x.fillRect(0, 0, 1024, 1024);

  // 1. anisotropic brushing — thousands of hairline streaks along X
  for (let i = 0; i < 5200; i++) {
    const y = Math.random() * 1024;
    const w = 40 + Math.random() * 900;
    const v = 108 + Math.random() * 62;
    x.strokeStyle = `rgba(${v},${v},${v},${0.05 + Math.random() * 0.16})`;
    x.lineWidth = Math.random() < 0.86 ? 0.6 : 1.4;
    x.beginPath();
    x.moveTo(Math.random() * 1024, y);
    x.lineTo(Math.random() * 1024 + w, y + (Math.random() - 0.5) * 0.8);
    x.stroke();
  }

  // 2. faint machining arcs (turned surfaces)
  for (let i = 0; i < 60; i++) {
    x.strokeStyle = `rgba(150,150,150,${0.02 + Math.random() * 0.04})`;
    x.lineWidth = 1 + Math.random() * 2;
    x.beginPath();
    x.arc(512 + (Math.random() - 0.5) * 400, 512 + (Math.random() - 0.5) * 400, 40 + Math.random() * 460, 0, Math.PI * 2);
    x.stroke();
  }

  // 3. fingerprints / handling smudges — soft rougher blobs
  for (let i = 0; i < 26; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const r = 40 + Math.random() * 130;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(190,190,190,${0.05 + Math.random() * 0.07})`);
    g.addColorStop(1, "rgba(190,190,190,0)");
    x.fillStyle = g;
    x.fillRect(px - r, py - r, r * 2, r * 2);
  }

  // 4. a few crisp micro scratches (soft edge wear)
  for (let i = 0; i < 90; i++) {
    x.strokeStyle = `rgba(${60 + Math.random() * 50},${60 + Math.random() * 50},${70 + Math.random() * 50},${0.12 + Math.random() * 0.2})`;
    x.lineWidth = 0.5;
    const sx = Math.random() * 1024;
    const sy = Math.random() * 1024;
    x.beginPath();
    x.moveTo(sx, sy);
    x.lineTo(sx + (Math.random() - 0.5) * 180, sy + (Math.random() - 0.5) * 26);
    x.stroke();
  }

  return (_rough = finish(c, 2));
}

/** Matching micro-normal so the brushing actually catches light. */
export function microNormalMap(): THREE.Texture | null {
  if (_normal !== undefined) return _normal;
  const cv = canvas2d(1024);
  if (!cv) return (_normal = null);
  const { c, x } = cv;
  x.fillStyle = "rgb(128,128,255)";
  x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 4200; i++) {
    const y = Math.random() * 1024;
    const d = (Math.random() - 0.5) * 26;
    x.strokeStyle = `rgba(128,${Math.round(128 + d)},255,${0.25 + Math.random() * 0.4})`;
    x.lineWidth = Math.random() < 0.8 ? 0.7 : 1.6;
    x.beginPath();
    x.moveTo(Math.random() * 1024 - 200, y);
    x.lineTo(Math.random() * 1024 + 200, y + (Math.random() - 0.5) * 0.6);
    x.stroke();
  }
  return (_normal = finish(c, 2));
}

export type FinishKey = "aluminum" | "steel" | "black" | "brass" | "copper";

type FinishSpec = {
  label: string;
  color: string;
  metalness: number;
  roughness: number;
  anisotropy: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
  normalScale: number;
};

/** Physically plausible shop finishes. Values are measured-ish, not stylised. */
export const FINISHES: Record<FinishKey, FinishSpec> = {
  aluminum: {
    label: "Brushed aluminium",
    color: "#c8ccd2",
    metalness: 0.95,
    roughness: 0.28,
    anisotropy: 0.85,
    clearcoat: 0.06,
    clearcoatRoughness: 0.5,
    envMapIntensity: 1.15,
    normalScale: 0.28,
  },
  steel: {
    label: "Stainless steel",
    color: "#b6bcc4",
    metalness: 0.98,
    roughness: 0.22,
    anisotropy: 0.6,
    clearcoat: 0.1,
    clearcoatRoughness: 0.35,
    envMapIntensity: 1.3,
    normalScale: 0.2,
  },
  black: {
    label: "Powder coated black",
    color: "#22262b",
    metalness: 0.18,
    roughness: 0.52,
    anisotropy: 0.1,
    clearcoat: 0.35,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.85,
    normalScale: 0.45,
  },
  brass: {
    label: "Brass",
    color: "#c2a45c",
    metalness: 1,
    roughness: 0.3,
    anisotropy: 0.5,
    clearcoat: 0.05,
    clearcoatRoughness: 0.4,
    envMapIntensity: 1.25,
    normalScale: 0.24,
  },
  copper: {
    label: "Copper",
    color: "#b06a45",
    metalness: 1,
    roughness: 0.34,
    anisotropy: 0.45,
    clearcoat: 0.05,
    clearcoatRoughness: 0.45,
    envMapIntensity: 1.2,
    normalScale: 0.24,
  },
};

/** Build a fresh material instance for a finish (callers own disposal). */
export function createFinishMaterial(
  key: FinishKey,
  overrides: Partial<THREE.MeshPhysicalMaterialParameters> = {},
): THREE.MeshPhysicalMaterial {
  const f = FINISHES[key];
  const rough = roughnessMap();
  const norm = microNormalMap();
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(f.color),
    metalness: f.metalness,
    roughness: f.roughness,
    envMapIntensity: f.envMapIntensity,
    clearcoat: f.clearcoat,
    clearcoatRoughness: f.clearcoatRoughness,
    ...overrides,
  });
  // anisotropy landed in three 0.163+ — guard so older bundles still build
  (m as unknown as { anisotropy?: number }).anisotropy = f.anisotropy;
  (m as unknown as { anisotropyRotation?: number }).anisotropyRotation = Math.PI / 2;
  if (rough) m.roughnessMap = rough;
  if (norm) {
    m.normalMap = norm;
    m.normalScale = new THREE.Vector2(f.normalScale, f.normalScale);
  }
  return m;
}
