// TOREO deterministic 3D printing pricing engine — v2 ("3dprint-v2").
// Rules (from product spec):
//   material_cost      = total_grams * (€/kg / 1000)
//   machine_cost       = total_hours  * €2.00 / hour
//   preparation_fee    = bracketed by quantity (1-10 €5, 11-20 €10, 21-50 €20, 51-100 €30, >100 €50)
//   internal_cost      = material + machine + preparation
//   selling_price      = internal_cost / 0.55   (=> 45% gross margin floor)
//   round to 2 decimals.
// Same inputs (geometry-hash + material + qty + use_type + engine version) -> same price.
// The AI is only allowed to influence grams / hours estimates. It NEVER sets price.

export const PRICING_ENGINE_VERSION = "3dprint-v2";

/** Fixed €/printer-hour used by the pricing engine. */
export const MACHINE_HOURLY_EUR = 2.0;

/** Minimum gross profit margin (0-1). */
export const MIN_MARGIN = 0.45;

export type UseType = "prototype" | "manufacture" | "decorative" | "durable";

export type PricingV2Inputs = {
  /** Grams of material per single part (from AI/technical estimate). */
  material_grams_per_part: number;
  /** Print hours per single part (from AI/technical estimate). */
  print_hours_per_part: number;
  /** Total quantity requested by the customer. */
  quantity: number;
  /** Material catalog price per kilogram (€/kg). */
  material_price_per_kg: number;
  /** Optional purge/waste allowance factor, e.g. 0.03 = 3%. */
  waste_factor?: number;
};

export type PricingV2Result = {
  pricing_engine_version: string;
  total_grams: number;
  total_hours: number;
  material_cost_eur: number;
  machine_cost_eur: number;
  preparation_fee_eur: number;
  internal_cost_eur: number;
  selling_price_eur: number;
  profit_eur: number;
  margin_pct: number;
};

/** Preparation fee in € for a given quantity, from the fixed bracket table. */
export function preparationFeeForQuantity(qty: number): number {
  const q = Math.max(1, Math.floor(qty || 1));
  if (q <= 10) return 5;
  if (q <= 20) return 10;
  if (q <= 50) return 20;
  if (q <= 100) return 30;
  return 50;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computePriceV2(inp: PricingV2Inputs): PricingV2Result {
  const qty = Math.max(1, Math.floor(Number(inp.quantity) || 1));
  const gramsPer = Math.max(0, Number(inp.material_grams_per_part) || 0);
  const hoursPer = Math.max(0, Number(inp.print_hours_per_part) || 0);
  const waste = Math.max(0, Number(inp.waste_factor ?? 0));
  const perKg = Math.max(0, Number(inp.material_price_per_kg) || 0);

  const total_grams = gramsPer * qty * (1 + waste);
  const total_hours = hoursPer * qty; // batch-planning refinements can reduce this externally

  const material_cost = total_grams * (perKg / 1000);
  const machine_cost = total_hours * MACHINE_HOURLY_EUR;
  const preparation_fee = preparationFeeForQuantity(qty);
  const internal_cost = material_cost + machine_cost + preparation_fee;

  // Selling price with hard 45% margin floor:
  //   selling = internal / (1 - MIN_MARGIN)
  const selling_price = internal_cost / (1 - MIN_MARGIN);

  const profit = selling_price - internal_cost;
  const margin = selling_price > 0 ? profit / selling_price : 0;

  return {
    pricing_engine_version: PRICING_ENGINE_VERSION,
    total_grams: round2(total_grams),
    total_hours: round2(total_hours),
    material_cost_eur: round2(material_cost),
    machine_cost_eur: round2(machine_cost),
    preparation_fee_eur: round2(preparation_fee),
    internal_cost_eur: round2(internal_cost),
    selling_price_eur: round2(selling_price),
    profit_eur: round2(profit),
    margin_pct: Math.round(margin * 10000) / 100, // e.g. 45.00
  };
}

/**
 * Deterministic technical print profile derived from the use-type.
 * The AI is NOT allowed to freely choose these — we clamp to allowed values.
 */
export const ALLOWED_LAYER_HEIGHTS: readonly number[] = [0.08, 0.12, 0.16, 0.2, 0.24, 0.28];
export const ALLOWED_INFILL = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100] as const;

export type PrintProfile = {
  layer_height_mm: number;
  infill_pct: number;
  wall_count: number;
  top_layers: number;
  bottom_layers: number;
};

export function profileForUseType(u: UseType): PrintProfile {
  switch (u) {
    case "prototype":
      return { layer_height_mm: 0.24, infill_pct: 15, wall_count: 2, top_layers: 3, bottom_layers: 3 };
    case "manufacture":
      return { layer_height_mm: 0.24, infill_pct: 40, wall_count: 3, top_layers: 4, bottom_layers: 4 };
    case "decorative":
      return { layer_height_mm: 0.12, infill_pct: 15, wall_count: 3, top_layers: 5, bottom_layers: 4 };
    case "durable":
      return { layer_height_mm: 0.2, infill_pct: 80, wall_count: 4, top_layers: 6, bottom_layers: 5 };
  }
}

/** Snap a candidate layer height to the closest allowed value. */
export function snapLayerHeight(v: number | null | undefined, fallback: number): number {
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) return fallback;
  let best = ALLOWED_LAYER_HEIGHTS[0];
  let bestDiff = Math.abs(x - best);
  for (const c of ALLOWED_LAYER_HEIGHTS) {
    const d = Math.abs(x - c);
    if (d < bestDiff) {
      best = c;
      bestDiff = d;
    }
  }
  return best;
}

/** Snap a candidate infill percentage to the closest allowed value. */
export function snapInfill(v: number | null | undefined, fallback: number): number {
  const x = Number(v);
  if (!Number.isFinite(x) || x < 0) return fallback;
  let best = ALLOWED_INFILL[0];
  let bestDiff = Math.abs(x - best);
  for (const c of ALLOWED_INFILL) {
    const d = Math.abs(x - c);
    if (d < bestDiff) {
      best = c;
      bestDiff = d;
    }
  }
  return best;
}
