// Engineering portfolio dataset. Models are procedural assemblies so every
// project supports wireframe / section / exploded views without external files.

export type PartKind = "box" | "cylinder" | "tube" | "sphere" | "cone" | "torus";

export type Part = {
  name: string;
  kind: PartKind;
  /** three.js geometry args */
  args: number[];
  position: [number, number, number];
  rotation?: [number, number, number];
  /** direction the part travels in an exploded view */
  explode: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
};

export type FileKind = "STEP" | "STL" | "DXF" | "SLDPRT" | "SLDASM" | "PDF" | "RENDER";

export type Project = {
  slug: string;
  title: string;
  fileKind: FileKind;
  fileName: string;
  summary: string;
  description: string;
  industry: string;
  process: string;
  material: string;
  thickness: string;
  weight: string;
  technology: string;
  software: string;
  machine: string;
  leadTime: string;
  tolerance: string;
  finish: string;
  year: number;
  views: number;
  featured: boolean;
  status: "Delivered" | "In production" | "Prototype";
  tags: string[];
  accent: string;
  /** index of the last completed manufacturing stage (0-based) */
  stage: number;
  parts: Part[];
};

export const STAGES = [
  "CAD Design",
  "Engineering Review",
  "Prototype",
  "Laser Cutting",
  "Bending",
  "Welding",
  "Assembly",
  "Quality Control",
  "Finished Product",
] as const;

const STEEL = "#b9c4d1";
const DARK_STEEL = "#7d8895";
const BRASS = "#c9a23f";
const POLYMER = "#3f4a5a";

export const PROJECTS: Project[] = [
  {
    slug: "structural-mounting-bracket",
    title: "Structural Mounting Bracket",
    fileKind: "STEP",
    fileName: "TR-BRK-0142.step",
    summary: "Load-bearing weldment for a conveyor gantry retrofit.",
    description:
      "A folded and welded mounting bracket carrying a 220 kg dynamic load on a food-processing conveyor gantry. Laser-cut from 6 mm S355, press-brake formed on a single setup and MIG welded with full-penetration corner seams. Gussets were added after FEA showed peak stress at the fold radius.",
    industry: "Industrial Automation",
    process: "Fiber laser cutting · Press-brake bending · MIG welding",
    material: "S355 structural steel",
    thickness: "6 mm",
    weight: "3.42 kg",
    technology: "Sheet metal fabrication",
    software: "SolidWorks",
    machine: "AKJ fiber laser · DurmaPress press brake",
    leadTime: "6 working days",
    tolerance: "±0.15 mm",
    finish: "Zinc-rich primer, RAL 7016 topcoat",
    year: 2025,
    views: 1840,
    featured: true,
    status: "Delivered",
    tags: ["weldment", "structural", "FEA"],
    accent: "#5aa9ff",
    stage: 8,
    parts: [
      { name: "Base plate", kind: "box", args: [3.6, 0.22, 2.4], position: [0, -0.6, 0], explode: [0, -1.6, 0], color: STEEL, metalness: 0.85, roughness: 0.32 },
      { name: "Vertical web", kind: "box", args: [0.22, 2.2, 2.4], position: [-1.5, 0.5, 0], explode: [-1.8, 0.4, 0], color: DARK_STEEL, metalness: 0.85, roughness: 0.34 },
      { name: "Gusset A", kind: "box", args: [1.2, 1.2, 0.18], position: [-0.8, 0.1, 0.9], explode: [0.4, 0.6, 1.8], rotation: [0, 0, -0.45], color: STEEL, metalness: 0.8, roughness: 0.4 },
      { name: "Gusset B", kind: "box", args: [1.2, 1.2, 0.18], position: [-0.8, 0.1, -0.9], explode: [0.4, 0.6, -1.8], rotation: [0, 0, -0.45], color: STEEL, metalness: 0.8, roughness: 0.4 },
      { name: "Bearing boss", kind: "cylinder", args: [0.55, 0.55, 0.7, 48], position: [1.1, 0.5, 0], rotation: [Math.PI / 2, 0, 0], explode: [1.6, 1.4, 0], color: BRASS, metalness: 0.9, roughness: 0.25 },
      { name: "Fastener set", kind: "torus", args: [0.34, 0.09, 16, 48], position: [1.1, 0.5, 0], rotation: [Math.PI / 2, 0, 0], explode: [2.6, 2.2, 0], color: "#e2e8f0", metalness: 0.95, roughness: 0.2 },
    ],
  },
  {
    slug: "hydraulic-manifold-housing",
    title: "Hydraulic Manifold Housing",
    fileKind: "SLDASM",
    fileName: "TR-MAN-0087.sldasm",
    summary: "Sealed manifold body with machined ports and cover plate.",
    description:
      "Manifold housing for a mobile hydraulic power pack. The body carries four G1/4 ports with O-ring face seals; the cover is bolted through a compressed gasket rated to 210 bar. Prototype was 3D printed in PC for fit checks before metal fabrication.",
    industry: "Hydraulics",
    process: "Fabrication · Welding · Finish machining",
    material: "AISI 304 stainless",
    thickness: "8 mm",
    weight: "5.10 kg",
    technology: "Sheet metal + machining",
    software: "Fusion 360",
    machine: "AKJ fiber laser · TIG station",
    leadTime: "9 working days",
    tolerance: "±0.08 mm",
    finish: "Bead blast, passivated",
    year: 2025,
    views: 1320,
    featured: true,
    status: "In production",
    tags: ["pressure", "sealed", "stainless"],
    accent: "#67e8f9",
    stage: 6,
    parts: [
      { name: "Manifold body", kind: "box", args: [2.6, 1.6, 1.8], position: [0, 0, 0], explode: [0, 0, 0], color: DARK_STEEL, metalness: 0.9, roughness: 0.3 },
      { name: "Cover plate", kind: "box", args: [2.6, 0.2, 1.8], position: [0, 0.9, 0], explode: [0, 2.2, 0], color: STEEL, metalness: 0.88, roughness: 0.28 },
      { name: "Gasket", kind: "box", args: [2.4, 0.06, 1.6], position: [0, 0.78, 0], explode: [0, 1.5, 0], color: "#2b3340", metalness: 0.1, roughness: 0.9 },
      { name: "Port A", kind: "cylinder", args: [0.28, 0.28, 0.9, 32], position: [1.5, 0.2, 0.5], rotation: [0, 0, Math.PI / 2], explode: [2.2, 0.3, 0.8], color: BRASS, metalness: 0.92, roughness: 0.22 },
      { name: "Port B", kind: "cylinder", args: [0.28, 0.28, 0.9, 32], position: [1.5, -0.3, -0.5], rotation: [0, 0, Math.PI / 2], explode: [2.2, -0.5, -0.8], color: BRASS, metalness: 0.92, roughness: 0.22 },
      { name: "Mount foot", kind: "box", args: [3.2, 0.22, 0.5], position: [0, -0.9, 0], explode: [0, -2.0, 0], color: STEEL, metalness: 0.85, roughness: 0.35 },
    ],
  },
  {
    slug: "planetary-gear-stage",
    title: "Planetary Gear Stage",
    fileKind: "STEP",
    fileName: "TR-GBX-0311.step",
    summary: "Compact 4:1 reduction stage for a positioning axis.",
    description:
      "A single planetary stage designed around an off-the-shelf ring gear. Carrier plates were laser cut and reamed in-house, planets sourced and pressed onto needle bearings. Backlash measured at 12 arcmin after run-in.",
    industry: "Motion Control",
    process: "Laser cutting · Precision assembly",
    material: "42CrMo4 / bronze bushings",
    thickness: "10 mm",
    weight: "2.05 kg",
    technology: "Precision fabrication",
    software: "SolidWorks",
    machine: "AKJ fiber laser · Bench press",
    leadTime: "12 working days",
    tolerance: "±0.05 mm",
    finish: "Black oxide",
    year: 2024,
    views: 2410,
    featured: true,
    status: "Delivered",
    tags: ["gearbox", "precision", "assembly"],
    accent: "#a78bfa",
    stage: 8,
    parts: [
      { name: "Ring gear", kind: "torus", args: [1.7, 0.32, 24, 72], position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], explode: [0, 0, 0], color: DARK_STEEL, metalness: 0.9, roughness: 0.3 },
      { name: "Sun gear", kind: "cylinder", args: [0.5, 0.5, 0.6, 40], position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], explode: [0, 0, 1.6], color: BRASS, metalness: 0.92, roughness: 0.24 },
      { name: "Planet 1", kind: "cylinder", args: [0.42, 0.42, 0.55, 36], position: [0.95, 0, 0], rotation: [Math.PI / 2, 0, 0], explode: [1.9, 0, 1.0], color: STEEL, metalness: 0.9, roughness: 0.26 },
      { name: "Planet 2", kind: "cylinder", args: [0.42, 0.42, 0.55, 36], position: [-0.47, 0.82, 0], rotation: [Math.PI / 2, 0, 0], explode: [-1.0, 1.7, 1.0], color: STEEL, metalness: 0.9, roughness: 0.26 },
      { name: "Planet 3", kind: "cylinder", args: [0.42, 0.42, 0.55, 36], position: [-0.47, -0.82, 0], rotation: [Math.PI / 2, 0, 0], explode: [-1.0, -1.7, 1.0], color: STEEL, metalness: 0.9, roughness: 0.26 },
      { name: "Carrier plate", kind: "cylinder", args: [1.5, 1.5, 0.16, 64], position: [0, 0, -0.6], rotation: [Math.PI / 2, 0, 0], explode: [0, 0, -2.0], color: "#95a2b1", metalness: 0.86, roughness: 0.34 },
      { name: "Output shaft", kind: "cylinder", args: [0.3, 0.3, 1.6, 40], position: [0, 0, -1.3], rotation: [Math.PI / 2, 0, 0], explode: [0, 0, -3.2], color: BRASS, metalness: 0.93, roughness: 0.2 },
    ],
  },
  {
    slug: "sheet-metal-enclosure",
    title: "IP54 Control Enclosure",
    fileKind: "DXF",
    fileName: "TR-ENC-0055.dxf",
    summary: "Folded control cabinet with gasketed hinged door.",
    description:
      "A 2 mm powder-coated enclosure for a machine controller. Flat pattern nested for minimum offcut, formed with hemmed edges to remove sharp exposure, and fitted with a continuous foam gasket for IP54 sealing.",
    industry: "Electrical",
    process: "Laser cutting · Bending · Spot welding",
    material: "DC01 mild steel",
    thickness: "2 mm",
    weight: "6.80 kg",
    technology: "Sheet metal fabrication",
    software: "SolidWorks",
    machine: "AKJ fiber laser · DurmaPress press brake",
    leadTime: "5 working days",
    tolerance: "±0.2 mm",
    finish: "Powder coat RAL 7035",
    year: 2025,
    views: 980,
    featured: false,
    status: "Delivered",
    tags: ["enclosure", "IP54", "powder coat"],
    accent: "#5aa9ff",
    stage: 8,
    parts: [
      { name: "Rear shell", kind: "box", args: [2.8, 3.4, 1.4], position: [0, 0, -0.2], explode: [0, 0, -1.4], color: "#8d99a8", metalness: 0.7, roughness: 0.5 },
      { name: "Door panel", kind: "box", args: [2.8, 3.4, 0.14], position: [0, 0, 0.62], explode: [0, 0, 2.4], color: STEEL, metalness: 0.72, roughness: 0.45 },
      { name: "Door gasket", kind: "box", args: [2.6, 3.2, 0.06], position: [0, 0, 0.52], explode: [0, 0, 1.6], color: "#232a35", metalness: 0.05, roughness: 0.95 },
      { name: "Hinge set", kind: "cylinder", args: [0.12, 0.12, 3.2, 24], position: [-1.45, 0, 0.5], explode: [-2.2, 0, 1.2], color: BRASS, metalness: 0.9, roughness: 0.25 },
      { name: "Mounting plate", kind: "box", args: [2.4, 3.0, 0.12], position: [0, 0, -0.55], explode: [0, -0.4, -2.6], color: "#c9d2dd", metalness: 0.8, roughness: 0.4 },
    ],
  },
  {
    slug: "obsolete-replacement-part",
    title: "Obsolete Machine Part Recreation",
    fileKind: "STL",
    fileName: "TR-RPL-0208.stl",
    summary: "Reverse-engineered drive coupling for a 1980s line.",
    description:
      "A discontinued drive coupling recreated from a worn original. Measured with calipers and a shadow gauge, modelled in Fusion 360, printed in PC-CF for validation, then produced in steel. The line was back in service in four days.",
    industry: "Legacy Machinery",
    process: "Reverse engineering · 3D printing · Fabrication",
    material: "PC-CF prototype / C45 production",
    thickness: "—",
    weight: "0.62 kg",
    technology: "FDM 3D printing",
    software: "Fusion 360",
    machine: "Bambu Lab X1C",
    leadTime: "4 working days",
    tolerance: "±0.12 mm",
    finish: "As-printed / machined seats",
    year: 2024,
    views: 3120,
    featured: true,
    status: "Delivered",
    tags: ["reverse engineering", "3D printing", "repair"],
    accent: "#f59e0b",
    stage: 8,
    parts: [
      { name: "Coupling hub A", kind: "cylinder", args: [1.1, 1.1, 0.8, 48], position: [0, 0, 0.55], rotation: [Math.PI / 2, 0, 0], explode: [0, 0, 2.0], color: POLYMER, metalness: 0.3, roughness: 0.7 },
      { name: "Coupling hub B", kind: "cylinder", args: [1.1, 1.1, 0.8, 48], position: [0, 0, -0.55], rotation: [Math.PI / 2, 0, 0], explode: [0, 0, -2.0], color: POLYMER, metalness: 0.3, roughness: 0.7 },
      { name: "Elastomer spider", kind: "torus", args: [0.75, 0.28, 16, 48], position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], explode: [0, 1.8, 0], color: "#d97706", metalness: 0.05, roughness: 0.85 },
      { name: "Keyed shaft", kind: "cylinder", args: [0.34, 0.34, 3.4, 36], position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], explode: [0, -2.2, 0], color: STEEL, metalness: 0.9, roughness: 0.28 },
    ],
  },
  {
    slug: "conveyor-frame-module",
    title: "Modular Conveyor Frame",
    fileKind: "SLDPRT",
    fileName: "TR-CNV-0173.sldprt",
    summary: "Bolt-together frame module with adjustable feet.",
    description:
      "A repeatable 1.5 m conveyor frame module. Profiles are laser-cut and notched so the weld fixture is the part itself; adjustable feet absorb 40 mm of floor variance. Twelve modules were produced in one batch.",
    industry: "Food Processing",
    process: "Laser cutting · TIG welding · Assembly",
    material: "AISI 304 stainless",
    thickness: "3 mm",
    weight: "18.4 kg",
    technology: "Weldment fabrication",
    software: "SolidWorks",
    machine: "AKJ fiber laser · TIG station",
    leadTime: "14 working days",
    tolerance: "±0.3 mm",
    finish: "Brushed, food-safe",
    year: 2023,
    views: 760,
    featured: false,
    status: "Delivered",
    tags: ["batch", "stainless", "frame"],
    accent: "#34d399",
    stage: 8,
    parts: [
      { name: "Rail left", kind: "box", args: [0.25, 0.5, 4.2], position: [-1.2, 0.8, 0], explode: [-2.0, 0.6, 0], color: STEEL, metalness: 0.86, roughness: 0.32 },
      { name: "Rail right", kind: "box", args: [0.25, 0.5, 4.2], position: [1.2, 0.8, 0], explode: [2.0, 0.6, 0], color: STEEL, metalness: 0.86, roughness: 0.32 },
      { name: "Cross member", kind: "box", args: [2.6, 0.22, 0.3], position: [0, 0.8, -1.6], explode: [0, 1.8, -2.2], color: DARK_STEEL, metalness: 0.86, roughness: 0.34 },
      { name: "Cross member 2", kind: "box", args: [2.6, 0.22, 0.3], position: [0, 0.8, 1.6], explode: [0, 1.8, 2.2], color: DARK_STEEL, metalness: 0.86, roughness: 0.34 },
      { name: "Leg A", kind: "box", args: [0.2, 1.6, 0.2], position: [-1.2, -0.2, -1.6], explode: [-1.8, -1.6, -2.0], color: "#9aa6b4", metalness: 0.8, roughness: 0.4 },
      { name: "Leg B", kind: "box", args: [0.2, 1.6, 0.2], position: [1.2, -0.2, -1.6], explode: [1.8, -1.6, -2.0], color: "#9aa6b4", metalness: 0.8, roughness: 0.4 },
      { name: "Leg C", kind: "box", args: [0.2, 1.6, 0.2], position: [-1.2, -0.2, 1.6], explode: [-1.8, -1.6, 2.0], color: "#9aa6b4", metalness: 0.8, roughness: 0.4 },
      { name: "Leg D", kind: "box", args: [0.2, 1.6, 0.2], position: [1.2, -0.2, 1.6], explode: [1.8, -1.6, 2.0], color: "#9aa6b4", metalness: 0.8, roughness: 0.4 },
    ],
  },
  {
    slug: "laser-cut-facade-panel",
    title: "Perforated Facade Panel",
    fileKind: "PDF",
    fileName: "TR-FAC-0021-drw.pdf",
    summary: "Architectural panel with parametric perforation pattern.",
    description:
      "A 1200 × 800 mm architectural panel with a parametric perforation gradient. Cut in 3 mm aluminium, edge-folded for rigidity and clear anodised. Nesting reduced material waste to under 9%.",
    industry: "Architecture",
    process: "Fiber laser cutting · Bending",
    material: "EN AW-5754 aluminium",
    thickness: "3 mm",
    weight: "4.10 kg",
    technology: "Sheet metal fabrication",
    software: "Rhino / SolidWorks",
    machine: "AKJ fiber laser · DurmaPress press brake",
    leadTime: "7 working days",
    tolerance: "±0.2 mm",
    finish: "Clear coat",
    year: 2023,
    views: 1490,
    featured: false,
    status: "Delivered",
    tags: ["architectural", "aluminium", "pattern"],
    accent: "#f472b6",
    stage: 8,
    parts: [
      { name: "Panel face", kind: "box", args: [3.6, 2.4, 0.1], position: [0, 0, 0], explode: [0, 0, 0.8], color: "#cdd6e0", metalness: 0.75, roughness: 0.35 },
      { name: "Return flange top", kind: "box", args: [3.6, 0.1, 0.5], position: [0, 1.2, -0.25], explode: [0, 2.0, -0.6], color: STEEL, metalness: 0.78, roughness: 0.36 },
      { name: "Return flange bottom", kind: "box", args: [3.6, 0.1, 0.5], position: [0, -1.2, -0.25], explode: [0, -2.0, -0.6], color: STEEL, metalness: 0.78, roughness: 0.36 },
      { name: "Sub-frame", kind: "box", args: [3.2, 2.0, 0.14], position: [0, 0, -0.55], explode: [0, 0, -2.0], color: DARK_STEEL, metalness: 0.8, roughness: 0.4 },
      { name: "Stand-off", kind: "cylinder", args: [0.12, 0.12, 0.5, 24], position: [1.3, 0.8, -0.3], rotation: [Math.PI / 2, 0, 0], explode: [2.2, 1.4, -1.2], color: BRASS, metalness: 0.9, roughness: 0.25 },
    ],
  },
  {
    slug: "weld-fixture-jig",
    title: "Welding Fixture Jig",
    fileKind: "RENDER",
    fileName: "TR-JIG-0099.render",
    summary: "Repeatable clamping jig for a 400-unit weld batch.",
    description:
      "A tooling plate with locating pins and toggle clamps that holds four sub-assemblies per cycle. Cut from 12 mm plate with reamed pin bores; repeatability measured at 0.1 mm across the batch.",
    industry: "Tooling",
    process: "Laser cutting · Machining · Assembly",
    material: "S235 plate",
    thickness: "12 mm",
    weight: "21.6 kg",
    technology: "Tooling fabrication",
    software: "Fusion 360",
    machine: "AKJ fiber laser",
    leadTime: "10 working days",
    tolerance: "±0.1 mm",
    finish: "Oiled, unpainted",
    year: 2024,
    views: 640,
    featured: false,
    status: "Prototype",
    tags: ["tooling", "jig", "batch"],
    accent: "#5aa9ff",
    stage: 4,
    parts: [
      { name: "Tooling plate", kind: "box", args: [4.0, 0.3, 2.8], position: [0, -0.4, 0], explode: [0, -1.6, 0], color: "#8f9bab", metalness: 0.82, roughness: 0.42 },
      { name: "Locating pin 1", kind: "cylinder", args: [0.14, 0.14, 0.9, 28], position: [-1.2, 0.2, -0.8], explode: [-1.8, 1.6, -1.2], color: BRASS, metalness: 0.92, roughness: 0.2 },
      { name: "Locating pin 2", kind: "cylinder", args: [0.14, 0.14, 0.9, 28], position: [1.2, 0.2, 0.8], explode: [1.8, 1.6, 1.2], color: BRASS, metalness: 0.92, roughness: 0.2 },
      { name: "Clamp body", kind: "box", args: [0.6, 0.5, 0.4], position: [0.2, 0.1, -1.0], explode: [0.6, 1.8, -1.8], color: "#c8323c", metalness: 0.4, roughness: 0.5 },
      { name: "Riser block", kind: "box", args: [1.0, 0.6, 1.0], position: [-0.9, 0.05, 0.6], explode: [-1.6, 1.2, 1.4], color: STEEL, metalness: 0.85, roughness: 0.35 },
    ],
  },
];

export const FILTER_FIELDS = {
  material: [...new Set(PROJECTS.map((p) => p.material))].sort(),
  technology: [...new Set(PROJECTS.map((p) => p.technology))].sort(),
  industry: [...new Set(PROJECTS.map((p) => p.industry))].sort(),
  software: [...new Set(PROJECTS.map((p) => p.software))].sort(),
  machine: [...new Set(PROJECTS.map((p) => p.machine))].sort(),
  year: [...new Set(PROJECTS.map((p) => String(p.year)))].sort().reverse(),
  tags: [...new Set(PROJECTS.flatMap((p) => p.tags))].sort(),
};
