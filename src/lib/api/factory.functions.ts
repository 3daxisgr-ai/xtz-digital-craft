// TOREO AI Factory OS — server functions for AI analysis, machines and materials.
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

// ---------------- AI ANALYSIS ----------------
// Analyze a file already stored on an order. Uses Lovable AI Gateway.
// We can't parse binary STL/STEP server-side without native libs, so we ask the
// model to reason from filename + declared metadata (extension, size, service).
// Results are structured JSON and persisted to project_analyses.

const analyzeInput = z.object({
  order_code: z.string().min(1),
  file_id: z.string().uuid().optional(),
  service: z.enum(["3d_printing", "cnc", "laser", "welding", "other"]).default("3d_printing"),
  production_mode: z.enum(["prototype", "durable", "decorative"]).default("prototype"),
  material_hint: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
});

const AnalysisSchema = z.object({
  dfm_score: z.number().min(0).max(100),
  complexity_score: z.number().min(0).max(100),
  printability_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  recommended_material: z.string(),
  recommended_nozzle: z.string().optional().nullable(),
  recommended_layer_height_mm: z.number().optional().nullable(),
  recommended_infill_pct: z.number().int().min(0).max(100).optional().nullable(),
  estimated_print_hours: z.number().nonnegative(),
  estimated_material_g: z.number().nonnegative(),
  estimated_cost_eur: z.number().nonnegative(),
  quote_price_eur: z.number().nonnegative(),
  summary: z.string(),
  warnings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
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
        .from("order_files")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1);
      file = files?.[0] ?? null;
    }

    const [{ data: machines }, { data: materials }] = await Promise.all([
      supabaseAdmin.from("machines" as any).select("name, kind, vendor, model, build_volume_mm, nozzles, hourly_cost").eq("active", true),
      supabaseAdmin.from("materials" as any).select("code, name, family, process, price_per_kg, density_g_cm3, properties").eq("active", true),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sys = `You are TOREO's AI Manufacturing Engineer. Analyse a customer's part for Design-for-Manufacturing (DFM), recommend the best material, printer/nozzle/layer height, and estimate print time, material use, cost and quote price. Base your answer on the file metadata, machine and material catalogue, and the requested production mode. Reply STRICTLY as JSON matching the schema — no prose, no markdown fences.`;

    const user = {
      order: { code: order.order_code, service: order.service, note: order.message },
      request: {
        service: data.service,
        production_mode: data.production_mode,
        material_hint: data.material_hint ?? order.material ?? null,
        notes: data.notes ?? null,
      },
      file: file
        ? { name: file.file_name, type: file.file_type, size_bytes: file.size_bytes, ext: file.file_name?.split(".").pop() ?? null }
        : null,
      catalogue: {
        machines: machines ?? [],
        materials: materials ?? [],
      },
      pricing_rules: {
        currency: "EUR",
        min_price_eur: 15,
        machine_overhead_multiplier: 1.35,
        margin_pct: 45,
      },
    };

    const schema = {
      type: "object",
      additionalProperties: false,
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
        recommended_material: { type: "string" },
        recommended_nozzle: { type: ["string","null"] },
        recommended_layer_height_mm: { type: ["number","null"] },
        recommended_infill_pct: { type: ["integer","null"] },
        estimated_print_hours: { type: "number" },
        estimated_material_g: { type: "number" },
        estimated_cost_eur: { type: "number" },
        quote_price_eur: { type: "number" },
        summary: { type: "string" },
        warnings: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(user) },
        ],
        response_format: { type: "json_schema", json_schema: { name: "analysis", strict: true, schema } },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI Gateway ${res.status}: ${t.slice(0, 400)}`);
    }
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: z.infer<typeof AnalysisSchema>;
    try {
      parsed = AnalysisSchema.parse(typeof raw === "string" ? JSON.parse(raw) : raw);
    } catch (e) {
      throw new Error(`AI returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("project_analyses" as any)
      .insert({
        order_id: order.id,
        file_id: file?.id ?? null,
        file_name: file?.file_name ?? null,
        service: data.service,
        production_mode: data.production_mode,
        dfm_score: Math.round(parsed.dfm_score),
        complexity_score: Math.round(parsed.complexity_score),
        printability_score: Math.round(parsed.printability_score),
        recommended_material: parsed.recommended_material,
        recommended_nozzle: parsed.recommended_nozzle ?? null,
        recommended_layer_height_mm: parsed.recommended_layer_height_mm ?? null,
        recommended_infill_pct: parsed.recommended_infill_pct ?? null,
        estimated_print_hours: parsed.estimated_print_hours,
        estimated_material_g: parsed.estimated_material_g,
        estimated_cost_eur: parsed.estimated_cost_eur,
        quote_price_eur: parsed.quote_price_eur,
        confidence: Math.round(parsed.confidence),
        ai_summary: parsed.summary,
        ai_warnings: parsed.warnings,
        ai_recommendations: parsed.recommendations,
        raw: parsed as any,
      })
      .select("*")
      .single();
    if (saveErr) throw saveErr;
    return saved;
  });

export const panelListAnalyses = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id").eq("order_code", data.order_code).single();
    if (!order) return [];
    const { data: rows } = await supabaseAdmin
      .from("project_analyses" as any)
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false });
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
