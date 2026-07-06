// TOREO deterministic 3D printing pricing engine.
// Same inputs → same price. AI supplies engineering estimates only.
// AI-produced quote_price_eur is IGNORED here.

export type PriceInputs = {
  material_grams: number;
  print_hours: number;
  support_hours?: number | null;
  complexity_score: number; // 0..100
  production_mode: "prototype" | "durable" | "decorative";
  quantity: number;
  timeline: "flexible" | "standard" | "urgent";
  recommended_material?: string | null;
};

export type PriceContext = {
  materials: any[];
  machines: any[];
  settings: any;
  backlog_hours: number;
  assigned_machine?: any | null;
};

export type PriceResult = {
  quote_price_eur: number;
  estimated_cost_eur: number;
  cost_breakdown: {
    material_grams: number;
    material_price_per_g: number;
    material_eur: number;
    machine_hourly_eur: number;
    machine_hours: number;
    machine_eur: number;
    support_eur: number;
    setup_eur: number;
    urgency_eur: number;
    complexity_multiplier: number;
    quantity: number;
    subtotal_eur: number;
    minimum_floor_eur: number;
    per_unit_eur: number;
  };
};

function complexityMultiplier(mode: PriceInputs["production_mode"], complexity: number): number {
  const c = Math.max(0, Math.min(100, complexity)) / 100;
  switch (mode) {
    case "prototype": return 1.0 + c * 0.15;
    case "durable":   return 1.1 + c * 0.20;
    case "decorative":return 1.15 + c * 0.25;
  }
}

function urgencyFee(
  timeline: PriceInputs["timeline"],
  backlog_hours: number,
  settings: any,
): number {
  if (timeline !== "urgent") return 0;
  const threshold = Number(settings?.urgency_high_load_threshold_hours ?? 24);
  // Low / Medium / High workload buckets around the configured threshold.
  if (backlog_hours < threshold * 0.5) return 5;
  if (backlog_hours < threshold) return 10;
  return 15;
}

export function computePrice(inp: PriceInputs, ctx: PriceContext): PriceResult {
  const settings = ctx.settings ?? {};
  const grams = Math.max(0, Number(inp.material_grams) || 0);
  const hours = Math.max(0, Number(inp.print_hours) || 0);
  const support_h = Math.max(0, Number(inp.support_hours ?? 0));
  const qty = Math.max(1, Math.floor(Number(inp.quantity) || 1));

  // Material €/g — resolve by code or name, fallback to 0.05 €/g.
  const mat = (ctx.materials ?? []).find((m: any) =>
    m && (m.code === inp.recommended_material || m.name === inp.recommended_material),
  );
  const price_per_kg = Number(mat?.price_per_kg ?? 50);
  const material_price_per_g = price_per_kg / 1000;

  // Machine €/h — prefer assigned machine, else max active printer rate, else min hourly rate.
  const activeMachines = (ctx.machines ?? []).filter((m: any) => m?.active);
  const fromAssigned = Number(ctx.assigned_machine?.hourly_cost ?? 0);
  const fromPool = activeMachines.reduce((mx: number, m: any) => Math.max(mx, Number(m.hourly_cost ?? 0)), 0);
  const min_hourly = Number(settings.min_hourly_rate_eur ?? 8);
  const machine_hourly = Math.max(fromAssigned || fromPool || min_hourly, min_hourly);

  const material_eur = grams * material_price_per_g;
  const machine_eur = hours * machine_hourly;
  const support_eur = support_h * machine_hourly * 0.5;

  // Setup fee — one-off per order, from min_production_charge floor.
  const setup_eur = Number(settings.min_production_charge_eur ?? 5) * 0.4;

  const urgency_eur = urgencyFee(inp.timeline, ctx.backlog_hours, settings);

  const base = (material_eur + machine_eur + support_eur) * qty + setup_eur + urgency_eur;
  const mult = complexityMultiplier(inp.production_mode, inp.complexity_score);
  const adjusted = base * mult;

  const minFloor = Number(settings.min_order_value_eur ?? 15);
  const minMarginPct = Number(settings.min_margin_pct ?? 45) / 100;
  const costFloor = (material_eur + machine_eur + support_eur) * qty * (1 + minMarginPct);
  const floor = Math.max(minFloor, costFloor);
  const quote = Math.max(adjusted, floor);

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const estimated_cost_eur = round2((material_eur + machine_eur + support_eur) * qty + setup_eur);
  const quote_price_eur = round2(quote);

  return {
    quote_price_eur,
    estimated_cost_eur,
    cost_breakdown: {
      material_grams: round2(grams),
      material_price_per_g: Math.round(material_price_per_g * 10000) / 10000,
      material_eur: round2(material_eur * qty),
      machine_hourly_eur: round2(machine_hourly),
      machine_hours: round2(hours * qty),
      machine_eur: round2(machine_eur * qty),
      support_eur: round2(support_eur * qty),
      setup_eur: round2(setup_eur),
      urgency_eur: round2(urgency_eur),
      complexity_multiplier: Math.round(mult * 1000) / 1000,
      quantity: qty,
      subtotal_eur: round2(base),
      minimum_floor_eur: round2(floor),
      per_unit_eur: round2(quote_price_eur / qty),
    },
  };
}
