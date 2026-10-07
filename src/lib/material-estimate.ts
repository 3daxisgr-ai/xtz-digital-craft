// TOREO deterministic MATERIAL-ONLY estimate engine.
// Pure functions, no I/O. AI only supplies geometry/material interpretation;
// every number below is computed here from catalog + settings.

export type SheetMaterial = {
  code: string;
  name: string;
  price_per_kg: number | null;
  density_g_cm3: number | null;
  properties?: Record<string, any> | null;
};

export type EstimateMode = "exact" | "range" | "needs_info" | "unpriced";

export const LIMITS = {
  dim_mm: { min: 1, max: 6000 },
  thickness_mm: { min: 0.3, max: 30 },
  quantity: { min: 1, max: 10000 },
  kg_max: 5000,
};

export const DEFAULT_MARKUP_PCT = 30;

export function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round((Number.isFinite(n) ? n : 0) * f) / f;
}

/** Sheet mass in kg: area(mm²) × thickness(mm) → mm³ ÷ 1000 → cm³ × g/cm³ ÷ 1000 → kg. */
export function sheetKg(area_mm2: number, thickness_mm: number, density_g_cm3: number): number {
  return (area_mm2 * thickness_mm / 1000) * density_g_cm3 / 1000;
}

/** Solid mass in kg from volume in cm³. */
export function volumeKg(volume_cm3: number, density_g_cm3: number): number {
  return (volume_cm3 * density_g_cm3) / 1000;
}

export function nearestThickness(available: number[], requested: number): number | null {
  const list = available.filter((t) => Number.isFinite(t) && t > 0);
  if (!list.length) return null;
  return list.reduce((best, t) =>
    Math.abs(t - requested) < Math.abs(best - requested) || (Math.abs(t - requested) === Math.abs(best - requested) && t > best) ? t : best,
  );
}

export function materialCost(kg: number, cost_per_kg: number): number {
  return kg * cost_per_kg;
}

/** Markup on cost: sale = cost × (1 + markup/100). NOT a gross-margin formula. */
export function applyMarkup(cost: number, markup_pct: number): number {
  return cost * (1 + markup_pct / 100);
}

/** Admin manual sheet calculator. */
export function manualSheetCalc(kg: number, cost_per_kg: number, markup_pct: number) {
  const cost = round(materialCost(kg, cost_per_kg));
  const sale = round(applyMarkup(cost, markup_pct));
  return { cost, sale, profit: round(sale - cost) };
}

export function customerLabel(m: SheetMaterial): string {
  const p = (m.properties ?? {}) as any;
  return p.customer_label || m.name;
}

export type EstimateInput = {
  geometry:
    | { kind: "sheet"; area_mm2: number; thickness_mm: number }
    | { kind: "solid"; volume_cm3: number }
    | null;
  quantity: number;
  material: SheetMaterial | null;
  markup_pct: number;
  confidence: number; // 0..1
};

export type InternalEstimate = {
  mode: EstimateMode;
  kg: number | null;
  kg_min: number | null;
  kg_max: number | null;
  cost_per_kg: number | null;
  material_cost: number | null;
  markup_pct: number;
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  errors: string[];
};

/** Range spread used when interpretation is uncertain. */
export function spreadFor(confidence: number): number {
  if (confidence >= 0.75) return 0;
  if (confidence >= 0.5) return 0.2;
  return 0.35;
}

export function computeEstimate(inp: EstimateInput): InternalEstimate {
  const errors: string[] = [];
  const qty = Math.floor(Number(inp.quantity) || 0);
  const base: InternalEstimate = {
    mode: "needs_info", kg: null, kg_min: null, kg_max: null, cost_per_kg: null,
    material_cost: null, markup_pct: inp.markup_pct, price: null, price_min: null, price_max: null, errors,
  };
  if (qty < LIMITS.quantity.min || qty > LIMITS.quantity.max) { errors.push("quantity"); return base; }
  if (!inp.geometry) { errors.push("geometry"); return base; }
  if (inp.confidence < 0.3) { errors.push("low_confidence"); return base; }

  const density = Number(inp.material?.density_g_cm3 ?? 0);
  if (!(density > 0)) { errors.push("density"); return { ...base, mode: "unpriced" }; }

  let unitKg: number;
  if (inp.geometry.kind === "sheet") {
    const { area_mm2, thickness_mm } = inp.geometry;
    if (!(area_mm2 > 0) || area_mm2 > LIMITS.dim_mm.max ** 2) { errors.push("area"); return base; }
    if (thickness_mm < LIMITS.thickness_mm.min || thickness_mm > LIMITS.thickness_mm.max) { errors.push("thickness"); return base; }
    unitKg = sheetKg(area_mm2, thickness_mm, density);
  } else {
    if (!(inp.geometry.volume_cm3 > 0)) { errors.push("volume"); return base; }
    unitKg = volumeKg(inp.geometry.volume_cm3, density);
  }
  const kg = unitKg * qty;
  if (!(kg > 0) || kg > LIMITS.kg_max) { errors.push("kg_out_of_range"); return base; }

  const spread = spreadFor(inp.confidence);
  const kg_min = kg * (1 - spread);
  const kg_max = kg * (1 + spread);
  const out: InternalEstimate = { ...base, kg, kg_min, kg_max, mode: spread ? "range" : "exact" };

  const cpk = Number(inp.material?.price_per_kg ?? 0);
  if (!(cpk > 0)) return { ...out, mode: "unpriced" };
  const cost = materialCost(kg, cpk);
  return {
    ...out,
    cost_per_kg: cpk,
    material_cost: cost,
    price: applyMarkup(cost, inp.markup_pct),
    price_min: applyMarkup(materialCost(kg_min, cpk), inp.markup_pct),
    price_max: applyMarkup(materialCost(kg_max, cpk), inp.markup_pct),
  };
}

export type CustomerEstimateDTO = {
  mode: EstimateMode;
  material_label: string | null;
  thickness_mm: number | null;
  quantity: number;
  kg: number | null;
  kg_min: number | null;
  kg_max: number | null;
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  is_assumption: boolean;
  geometry_note: string | null;
  draft: { width_mm: number; length_mm: number } | null;
  notes: string[];
  missing: string[];
};

/** Strip every internal field. Only safe, rounded values leave the server. */
export function toCustomerDTO(
  e: InternalEstimate,
  ctx: { material_label: string | null; thickness_mm: number | null; quantity: number; is_assumption: boolean; geometry_note: string | null; draft?: { width_mm: number; length_mm: number } | null; notes: string[]; missing: string[] },
): CustomerEstimateDTO {
  const kgR = (n: number | null) => (n == null ? null : round(n, n < 10 ? 2 : 1));
  const euroR = (n: number | null, dir: "round" | "floor" | "ceil" = "round") =>
    n == null ? null : Math.max(1, Math[dir](n));
  const range = e.mode === "range";
  return {
    mode: e.mode,
    material_label: ctx.material_label,
    thickness_mm: ctx.thickness_mm,
    quantity: ctx.quantity,
    kg: kgR(e.kg),
    kg_min: range ? kgR(e.kg_min) : null,
    kg_max: range ? kgR(e.kg_max) : null,
    price: e.mode === "exact" ? euroR(e.price) : null,
    price_min: range ? euroR(e.price_min, "floor") : null,
    price_max: range ? euroR(e.price_max, "ceil") : null,
    is_assumption: ctx.is_assumption,
    geometry_note: ctx.geometry_note,
    draft: ctx.draft ? { width_mm: Math.round(ctx.draft.width_mm), length_mm: Math.round(ctx.draft.length_mm) } : null,
    notes: ctx.notes.slice(0, 6),
    missing: ctx.missing.slice(0, 6),
  };
}
