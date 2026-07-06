// TOREO AI Factory OS — server functions for AI analysis, machines, materials,
// factory settings (profit protection), readiness checks and admin overrides.
// Cookie-session authed (admin panel). Uses Lovable AI Gateway for AI calls.
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSession = { authed?: boolean; ts?: number };
function sessionConfig() {
  const raw = process.env.ADMIN_PASSWORD ?? "";
  const password = (raw + "::skg3d-admin-session-pad-do-not-share::").padEnd(64, "x");
  return { password, name: "skg3d_admin", maxAge: 60 * 60 * 8, cookie: { httpOnly: true, sameSite: "lax" as const, path: "/" } };
}
async function requireAdminCookie() {
  const s = await useSession<AdminSession>(sessionConfig());
  if (!s.data.authed) throw new Error("Unauthorized");
  return true;
}

// ---------------- MACHINES ----------------

const machineInput = z.object({
  name: z.string().min(1).max(120),
  kind: z.string().min(1).max(40),
  vendor: z.string().max(80).optional().nullable(),
  model: z.string().max(80).optional().nullable(),
  build_volume_mm: z.object({ x: z.number(), y: z.number(), z: z.number() }).partial().optional().nullable(),
  nozzles: z.array(z.string()).optional().nullable(),
  hourly_cost: z.number().nonnegative().optional().nullable(),
  power_watts: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(["idle", "running", "maintenance", "offline"]).default("idle"),
  active: z.boolean().default(true),
  specs: z.record(z.any()).optional().nullable(),
});

export const panelListMachines = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("machines" as any).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const panelUpsertMachine = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), patch: machineInput.partial() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("machines" as any).update(data.patch).eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await supabaseAdmin.from("machines" as any).insert(data.patch as any).select("*").single();
    if (error) throw error;
    return row;
  });

export const panelDeleteMachine = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("machines" as any).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------------- MATERIALS ----------------

const materialInput = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  family: z.string().min(1).max(40),
  process: z.string().min(1).max(40),
  color: z.string().max(40).optional().nullable(),
  price_per_kg: z.number().nonnegative().optional().nullable(),
  density_g_cm3: z.number().positive().optional().nullable(),
  stock_kg: z.number().nonnegative().optional().nullable(),
  properties: z.record(z.any()).optional().nullable(),
  active: z.boolean().default(true),
});

export const panelListMaterials = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("materials" as any).select("*").order("family").order("name");
  if (error) throw error;
  return data ?? [];
});

export const panelUpsertMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), patch: materialInput.partial() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("materials" as any).update(data.patch).eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await supabaseAdmin.from("materials" as any).insert(data.patch as any).select("*").single();
    if (error) throw error;
    return row;
  });

export const panelDeleteMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("materials" as any).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------------- FACTORY SETTINGS (profit protection) ----------------

export const panelGetSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("factory_settings" as any).select("*").limit(1).maybeSingle();
  return data ?? null;
});

const settingsInput = z.object({
  min_margin_pct: z.number().min(0).max(300).optional(),
  min_hourly_rate_eur: z.number().nonnegative().optional(),
  min_production_charge_eur: z.number().nonnegative().optional(),
  min_order_value_eur: z.number().nonnegative().optional(),
  allow_overnight_default: z.boolean().optional(),
  work_start_hour: z.number().min(0).max(24).optional(),
  work_end_hour: z.number().min(0).max(24).optional(),
  currency: z.string().max(8).optional(),
});

export const panelUpdateSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => settingsInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("factory_settings" as any).select("id").limit(1).maybeSingle();
    if (!existing) {
      const { data: row, error } = await supabaseAdmin.from("factory_settings" as any).insert({ singleton: true, ...data } as any).select("*").single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await supabaseAdmin.from("factory_settings" as any).update(data).eq("id", (existing as any).id).select("*").single();
    if (error) throw error;
    return row;
  });

// ---------------- AI ANALYSIS (extended per Part 2.2A/B) ----------------

const AnalysisSchema = z.object({
  // Core scores
  dfm_score: z.number().min(0).max(100),
  complexity_score: z.number().min(0).max(100),
  printability_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  complexity_band: z.enum(["very_simple", "simple", "medium", "complex", "very_complex"]).optional().nullable(),
  confidence_band: z.enum(["very_high", "high", "medium", "review_recommended"]).optional().nullable(),
  // Recommendations
  recommended_material: z.string(),
  recommended_nozzle: z.string().optional().nullable(),
  recommended_layer_height_mm: z.number().optional().nullable(),
  recommended_infill_pct: z.number().int().min(0).max(100).optional().nullable(),
  recommended_orientation: z.string().optional().nullable(),
  // Toolpath / geometry estimation
  estimated_layers: z.number().int().nonnegative().optional().nullable(),
  extrusion_length_m: z.number().nonnegative().optional().nullable(),
  travel_length_m: z.number().nonnegative().optional().nullable(),
  // Supports
  support_volume_cm3: z.number().nonnegative().optional().nullable(),
  support_hours: z.number().nonnegative().optional().nullable(),
  support_difficulty: z.enum(["low", "medium", "high"]).optional().nullable(),
  // Predictions (low/medium/high with explanation)
  quality_predictions: z.record(z.object({ level: z.enum(["low", "medium", "high"]), note: z.string().optional() })).optional().nullable(),
  risk_analysis: z.record(z.object({ level: z.enum(["low", "medium", "high"]), note: z.string().optional() })).optional().nullable(),
  // Production
  estimated_print_hours: z.number().nonnegative(),
  estimated_material_g: z.number().nonnegative(),
  // Costing
  estimated_cost_eur: z.number().nonnegative(),
  quote_price_eur: z.number().nonnegative(),
  cost_breakdown: z.object({
    machine_time_eur: z.number().nonnegative().optional(),
    material_eur: z.number().nonnegative().optional(),
    wear_eur: z.number().nonnegative().optional(),
    energy_eur: z.number().nonnegative().optional(),
    complexity_eur: z.number().nonnegative().optional(),
    post_processing_eur: z.number().nonnegative().optional(),
    packaging_eur: z.number().nonnegative().optional(),
    margin_eur: z.number().nonnegative().optional(),
  }).partial().optional().nullable(),
  price_explanation: z.string().optional().nullable(),
  // Summary
  summary: z.string(),
  warnings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

type AiResult = z.infer<typeof AnalysisSchema>;

const AI_JSON_SCHEMA = {
  type: "object",
  additionalProperties: true,
  required: [
    "dfm_score","complexity_score","printability_score","confidence",
    "recommended_material","estimated_print_hours","estimated_material_g",
    "estimated_cost_eur","quote_price_eur","summary","warnings","recommendations",
  ],
  properties: {
    dfm_score: { type: "number" },
    complexity_score: { type: "number" },
    printability_score: { type: "number" },
    confidence: { type: "number" },
    complexity_band: { type: ["string","null"], enum: ["very_simple","simple","medium","complex","very_complex", null] },
    confidence_band: { type: ["string","null"], enum: ["very_high","high","medium","review_recommended", null] },
    recommended_material: { type: "string" },
    recommended_nozzle: { type: ["string","null"] },
    recommended_layer_height_mm: { type: ["number","null"] },
    recommended_infill_pct: { type: ["integer","null"] },
    recommended_orientation: { type: ["string","null"] },
    estimated_layers: { type: ["integer","null"] },
    extrusion_length_m: { type: ["number","null"] },
    travel_length_m: { type: ["number","null"] },
    support_volume_cm3: { type: ["number","null"] },
    support_hours: { type: ["number","null"] },
    support_difficulty: { type: ["string","null"], enum: ["low","medium","high", null] },
    quality_predictions: { type: ["object","null"] },
    risk_analysis: { type: ["object","null"] },
    estimated_print_hours: { type: "number" },
    estimated_material_g: { type: "number" },
    estimated_cost_eur: { type: "number" },
    quote_price_eur: { type: "number" },
    cost_breakdown: { type: ["object","null"] },
    price_explanation: { type: ["string","null"] },
    summary: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM_PROMPT = `You are TOREO's AI Manufacturing Engineer.
Analyse the customer's part for Design-for-Manufacturing (DFM) and produce a full production plan.

You MUST return every one of these fields:
- Core scores: dfm_score, printability_score, complexity_score (0-100), confidence (0-100).
- complexity_band: bucket the complexity_score (0-20 very_simple, 21-40 simple, 41-60 medium, 61-80 complex, 81-100 very_complex).
- confidence_band: >=95 very_high, >=85 high, >=70 medium, <70 review_recommended.
- Recommendations: material (from catalogue), nozzle, layer_height_mm, infill_pct, orientation (short phrase e.g. "flat on bed, longest axis along X").
- Toolpath estimates: estimated_layers, extrusion_length_m, travel_length_m.
- Supports: support_volume_cm3, support_hours, support_difficulty.
- quality_predictions: object with keys surface_finish, detail_quality, dimensional_accuracy, structural_strength, layer_visibility — each { level: low|medium|high, note: short reason }.
- risk_analysis: object with keys warping, stringing, adhesion, failure — each { level: low|medium|high, note: short reason }.
- estimated_print_hours, estimated_material_g.
- Costing: cost_breakdown = { machine_time_eur, material_eur, wear_eur, energy_eur, complexity_eur, post_processing_eur, packaging_eur, margin_eur } that sums to quote_price_eur (respect the profit_protection minimums provided). estimated_cost_eur is total production cost before margin. quote_price_eur is final customer quote.
- price_explanation: internal 1-2 sentence justification for admin (mode, complexity, machine time drivers).
- summary: customer-facing 1-2 sentence engineering summary.
- warnings: manufacturability risks. recommendations: how to improve DFM.

Optimise per production_mode:
- prototype → speed, low cost, reasonable quality (larger layer, lower infill)
- durable → structural integrity (more perimeters, higher infill, layer adhesion)
- decorative → surface finish (small layer, seam placement, finer detail)

Reply STRICTLY as JSON matching the schema. No prose, no markdown fences.`;

async function callAi(userPayload: unknown): Promise<AiResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "analysis", strict: false, schema: AI_JSON_SCHEMA } },
    }),
  });
  if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  return AnalysisSchema.parse(typeof raw === "string" ? JSON.parse(raw) : raw);
}

function analysisInsertRow(parsed: AiResult, order: any, file: any, service: string, productionMode: string) {
  return {
    order_id: order.id,
    file_id: file?.id ?? null,
    file_name: file?.file_name ?? null,
    service,
    production_mode: productionMode,
    dfm_score: Math.round(parsed.dfm_score),
    complexity_score: Math.round(parsed.complexity_score),
    printability_score: Math.round(parsed.printability_score),
    confidence: Math.round(parsed.confidence),
    complexity_band: parsed.complexity_band ?? null,
    confidence_band: parsed.confidence_band ?? null,
    recommended_material: parsed.recommended_material,
    recommended_nozzle: parsed.recommended_nozzle ?? null,
    recommended_layer_height_mm: parsed.recommended_layer_height_mm ?? null,
    recommended_infill_pct: parsed.recommended_infill_pct ?? null,
    recommended_orientation: parsed.recommended_orientation ?? null,
    estimated_layers: parsed.estimated_layers ?? null,
    extrusion_length_m: parsed.extrusion_length_m ?? null,
    travel_length_m: parsed.travel_length_m ?? null,
    support_volume_cm3: parsed.support_volume_cm3 ?? null,
    support_hours: parsed.support_hours ?? null,
    support_difficulty: parsed.support_difficulty ?? null,
    quality_predictions: parsed.quality_predictions ?? {},
    risk_analysis: parsed.risk_analysis ?? {},
    estimated_print_hours: parsed.estimated_print_hours,
    estimated_material_g: parsed.estimated_material_g,
    estimated_cost_eur: parsed.estimated_cost_eur,
    quote_price_eur: parsed.quote_price_eur,
    cost_breakdown: parsed.cost_breakdown ?? {},
    price_explanation: parsed.price_explanation ?? null,
    ai_summary: parsed.summary,
    ai_warnings: parsed.warnings,
    ai_recommendations: parsed.recommendations,
    raw: parsed as any,
  };
}

async function loadContext() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: machines }, { data: materials }, { data: settings }] = await Promise.all([
    supabaseAdmin.from("machines" as any).select("name, kind, vendor, model, build_volume_mm, nozzles, hourly_cost, power_watts").eq("active", true),
    supabaseAdmin.from("materials" as any).select("code, name, family, process, price_per_kg, density_g_cm3, properties").eq("active", true),
    supabaseAdmin.from("factory_settings" as any).select("*").limit(1).maybeSingle(),
  ]);
  return { machines: machines ?? [], materials: materials ?? [], settings: settings ?? null };
}

// Enforce profit protection floors (post-AI safety net).
function enforceMinimums(parsed: AiResult, settings: any): AiResult {
  if (!settings) return parsed;
  const minCharge = Number((settings as any).min_production_charge_eur ?? 0);
  const minOrder = Number((settings as any).min_order_value_eur ?? 0);
  const minMargin = Number((settings as any).min_margin_pct ?? 0) / 100;
  const floor = Math.max(minCharge, minOrder, parsed.estimated_cost_eur * (1 + minMargin));
  if (parsed.quote_price_eur < floor) parsed.quote_price_eur = Math.round(floor * 100) / 100;
  if (!parsed.confidence_band) {
    parsed.confidence_band = parsed.confidence >= 95 ? "very_high" : parsed.confidence >= 85 ? "high" : parsed.confidence >= 70 ? "medium" : "review_recommended";
  }
  if (!parsed.complexity_band) {
    const c = parsed.complexity_score;
    parsed.complexity_band = c <= 20 ? "very_simple" : c <= 40 ? "simple" : c <= 60 ? "medium" : c <= 80 ? "complex" : "very_complex";
  }
  return parsed;
}

async function wireBackToOrder(orderId: string, parsed: AiResult, analysisId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    // Always sync AI quote to order (admins can still override via panelApplyOverride).
    await supabaseAdmin.from("orders").update({ quote_price: parsed.quote_price_eur } as any).eq("id", orderId);

    await supabaseAdmin.from("order_events").insert({
      order_id: orderId,
      event_type: "ai_analysis",
      title: "AI Engineering Analysis Complete",
      description: `DFM ${Math.round(parsed.dfm_score)}/100 · Printability ${Math.round(parsed.printability_score)}/100 · Est. €${Number(parsed.quote_price_eur).toFixed(2)}`,
      actor: "system",
      visibility: "customer",
      payload: {
        dfm_score: Math.round(parsed.dfm_score),
        printability_score: Math.round(parsed.printability_score),
        complexity_score: Math.round(parsed.complexity_score),
        complexity_band: parsed.complexity_band,
        confidence_band: parsed.confidence_band,
        recommended_material: parsed.recommended_material,
        estimated_print_hours: parsed.estimated_print_hours,
        estimated_material_g: parsed.estimated_material_g,
        quote_price_eur: parsed.quote_price_eur,
      } as any,
    });

    // Auto-create a production job so the scheduler / factory dashboard picks it up.
    const { data: existing } = await supabaseAdmin
      .from("production_jobs" as any).select("id").eq("order_id", orderId).limit(1);
    if (!existing || existing.length === 0) {
      await supabaseAdmin.from("production_jobs" as any).insert({
        order_id: orderId,
        analysis_id: analysisId ?? null,
        estimated_hours: parsed.estimated_print_hours ?? 4,
        material_code: parsed.recommended_material ?? null,
        state: "queued",
        risk: (parsed.printability_score ?? 100) < 60 ? "high" : (parsed.printability_score ?? 100) < 80 ? "medium" : "low",
      } as any);
    }
  } catch (e) {
    console.error("post-analysis wire-up failed", e);
  }
}

// -------- Admin: analyze a file on an order --------

const analyzeInput = z.object({
  order_code: z.string().min(1),
  file_id: z.string().uuid().optional(),
  service: z.enum(["3d_printing", "cnc", "laser", "welding", "other"]).default("3d_printing"),
  production_mode: z.enum(["prototype", "durable", "decorative"]).default("prototype"),
  material_hint: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
});

export const panelAnalyzeFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => analyzeInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_code, customer_name, customer_email, service, material, message")
      .eq("order_code", data.order_code)
      .single();
    if (!order) throw new Error("Order not found");

    let file: any = null;
    if (data.file_id) {
      const { data: f } = await supabaseAdmin.from("order_files").select("*").eq("id", data.file_id).maybeSingle();
      file = f;
    } else {
      const { data: files } = await supabaseAdmin
        .from("order_files").select("*").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1);
      file = files?.[0] ?? null;
    }

    const { machines, materials, settings } = await loadContext();
    const payload = {
      order: { code: order.order_code, service: order.service, note: order.message },
      request: {
        service: data.service, production_mode: data.production_mode,
        material_hint: data.material_hint ?? order.material ?? null, notes: data.notes ?? null,
      },
      file: file
        ? { name: file.file_name, type: file.file_type, size_bytes: file.size_bytes, ext: file.file_name?.split(".").pop() ?? null }
        : null,
      catalogue: { machines, materials },
      profit_protection: (settings as any) ? {
        currency: (settings as any).currency, min_margin_pct: Number((settings as any).min_margin_pct),
        min_hourly_rate_eur: Number((settings as any).min_hourly_rate_eur),
        min_production_charge_eur: Number((settings as any).min_production_charge_eur),
        min_order_value_eur: Number((settings as any).min_order_value_eur),
      } : { currency: "EUR", min_margin_pct: 45, min_hourly_rate_eur: 8, min_production_charge_eur: 15, min_order_value_eur: 15 },
    };

    let parsed = await callAi(payload);
    parsed = enforceMinimums(parsed, settings);

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("project_analyses" as any).insert(analysisInsertRow(parsed, order, file, data.service, data.production_mode))
      .select("*").single();
    if (saveErr) throw saveErr;
    await wireBackToOrder(order.id, parsed);
    return saved;
  });

export const panelListAnalyses = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id").eq("order_code", data.order_code).single();
    if (!order) return [];
    const { data: rows } = await supabaseAdmin.from("project_analyses" as any).select("*").eq("order_id", order.id).order("created_at", { ascending: false });
    return rows ?? [];
  });

export const panelDeleteAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("project_analyses" as any).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// -------- Public auto-analysis for new quote submissions --------

async function runAnalysisForOrder(order: any, file: any, serviceHint: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { machines, materials, settings } = await loadContext();
  const svc = (serviceHint || "").toLowerCase();
  const service = svc.includes("cnc") ? "cnc" : svc.includes("laser") ? "laser" : svc.includes("weld") ? "welding" : "3d_printing";
  const payload = {
    order: { code: order.order_code, service: order.service, note: order.message },
    request: { service, production_mode: "prototype", material_hint: order.material ?? null, notes: order.message ?? null },
    file: file ? { name: file.file_name, type: file.file_type, size_bytes: file.size_bytes, ext: file.file_name?.split(".").pop() ?? null } : null,
    catalogue: { machines, materials },
    profit_protection: (settings as any) ? {
      currency: (settings as any).currency, min_margin_pct: Number((settings as any).min_margin_pct),
      min_hourly_rate_eur: Number((settings as any).min_hourly_rate_eur),
      min_production_charge_eur: Number((settings as any).min_production_charge_eur),
      min_order_value_eur: Number((settings as any).min_order_value_eur),
    } : { currency: "EUR", min_margin_pct: 45, min_hourly_rate_eur: 8, min_production_charge_eur: 15, min_order_value_eur: 15 },
  };
  let parsed = await callAi(payload);
  parsed = enforceMinimums(parsed, settings);
  const { data: saved, error: saveErr } = await supabaseAdmin
    .from("project_analyses" as any).insert(analysisInsertRow(parsed, order, file, service, "prototype"))
    .select("*").single();
  if (saveErr) throw saveErr;
  await wireBackToOrder(order.id, parsed);
  return saved;
}

export const runQuoteAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(3).max(40), email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders")
      .select("id, order_code, customer_email, service, material, message, created_at").eq("order_code", data.order_code).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (String(order.customer_email).toLowerCase() !== data.email.toLowerCase()) throw new Error("Not authorized");
    if (Date.now() - new Date(order.created_at as any).getTime() > 24 * 60 * 60 * 1000) throw new Error("Analysis window expired");
    const { data: existing } = await supabaseAdmin.from("project_analyses" as any).select("*").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1);
    if (existing && existing.length > 0) return existing[0];
    const { data: files } = await supabaseAdmin.from("order_files").select("*").eq("order_id", order.id).order("created_at").limit(1);
    return await runAnalysisForOrder(order, files?.[0] ?? null, order.service ?? "3d_printing");
  });

export const getOrderAnalyses = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(3).max(40), email: z.string().email().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id, customer_email").eq("order_code", data.order_code).maybeSingle();
    if (!order) return [];
    if (data.email && String(order.customer_email).toLowerCase() !== data.email.toLowerCase()) return [];
    const { data: rows } = await supabaseAdmin.from("project_analyses" as any).select("*").eq("order_id", order.id).order("created_at", { ascending: false });
    return rows ?? [];
  });

// -------- Admin override + readiness check --------

export const panelApplyOverride = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        quote_price_eur: z.number().nonnegative().optional(),
        recommended_material: z.string().optional(),
        recommended_nozzle: z.string().optional(),
        production_mode: z.enum(["prototype","durable","decorative"]).optional(),
        estimated_print_hours: z.number().nonnegative().optional(),
        note: z.string().max(1000).optional(),
      }).partial(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("project_analyses" as any).select("*").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Analysis not found");
    const before: Record<string, unknown> = {};
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.patch)) {
      if (v === undefined) continue;
      if (k === "note") continue;
      (before as any)[k] = (cur as any)[k] ?? null;
      (patch as any)[k] = v;
    }
    const overrides = Array.isArray((cur as any).admin_overrides) ? [...(cur as any).admin_overrides] : [];
    overrides.push({ at: new Date().toISOString(), before, after: patch, note: data.patch.note ?? null });
    const { data: saved, error } = await supabaseAdmin
      .from("project_analyses" as any)
      .update({ ...patch, admin_overrides: overrides } as any)
      .eq("id", data.id).select("*").single();
    if (error) throw error;
    if (typeof data.patch.quote_price_eur === "number") {
      await supabaseAdmin.from("orders").update({ quote_price: data.patch.quote_price_eur } as any).eq("id", (cur as any).order_id);
    }
    return saved;
  });

// Manufacturing readiness (Part 2.2B — pre-production checklist).
export const panelReadinessCheck = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders")
      .select("id, order_code, status, quote_price, material, due_date")
      .eq("order_code", data.order_code).maybeSingle();
    if (!order) throw new Error("Order not found");
    const [
      { data: analyses }, { data: files }, { data: materials }, { data: machines }, { data: settings },
    ] = await Promise.all([
      supabaseAdmin.from("project_analyses" as any).select("*").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1),
      supabaseAdmin.from("order_files").select("id").eq("order_id", order.id).limit(1),
      supabaseAdmin.from("materials" as any).select("code, name, stock_kg").eq("active", true),
      supabaseAdmin.from("machines" as any).select("id, name, kind, status, active"),
      supabaseAdmin.from("factory_settings" as any).select("*").limit(1).maybeSingle(),
    ]);
    const a: any = (analyses ?? [])[0];
    const mats: any[] = materials ?? [];
    const checks: Array<{ key: string; label: string; ok: boolean; note?: string }> = [];

    checks.push({ key: "file", label: "File uploaded", ok: !!(files && files.length), note: files && files.length ? undefined : "Customer has not uploaded a file." });
    checks.push({ key: "analysis", label: "AI analysis complete", ok: !!a, note: a ? undefined : "Run the AI analysis first." });
    checks.push({ key: "material", label: "Recommended material in stock", ok: !!a && mats.some((m) => (m.code === a.recommended_material || m.name === a.recommended_material) && Number(m.stock_kg ?? 0) > 0), note: a ? `Need ${a.recommended_material}` : undefined });
    const anyActiveMachine = (machines ?? []).some((m: any) => m.active && m.status !== "offline");
    checks.push({ key: "machine", label: "Compatible machine online", ok: anyActiveMachine, note: anyActiveMachine ? undefined : "No active machines." });
    const minOrder = Number((settings as any)?.min_order_value_eur ?? 0);
    checks.push({ key: "quote", label: "Quote sent & above minimum", ok: !!order.quote_price && Number(order.quote_price) >= minOrder, note: order.quote_price ? undefined : "Set a quote price first." });
    checks.push({ key: "approval", label: "Customer approved", ok: ["payment_received","production","quality_inspection","ready_for_shipping","shipped","delivered"].includes(order.status), note: order.status });
    const risk = a?.risk_analysis ?? {};
    const highRisks = Object.entries(risk).filter(([, v]: any) => v?.level === "high");
    checks.push({ key: "risk", label: "No high risks", ok: highRisks.length === 0, note: highRisks.length ? `${highRisks.length} high-risk: ${highRisks.map(([k]) => k).join(", ")}` : undefined });
    if (order.due_date) checks.push({ key: "timeline", label: "Delivery timeline realistic", ok: !!a && (a.estimated_print_hours ?? 0) < 200, note: a ? `${a.estimated_print_hours}h estimated` : undefined });

    const ok = checks.every((c) => c.ok);
    const level = !a ? "blocked" : ok ? "production_ready" : checks.filter((c) => !c.ok).length <= 2 ? "nearly_ready" : "requires_review";
    return { ok, level, checks };
  });
