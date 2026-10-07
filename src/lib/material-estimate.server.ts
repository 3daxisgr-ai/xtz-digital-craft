// Server-only: catalog loading, AI technical interpretation, persistence.
import { createHash } from "crypto";
import { aiComplete } from "@/lib/ai/provider.server";
import {
  computeEstimate, customerLabel, DEFAULT_MARKUP_PCT, LIMITS, nearestThickness, toCustomerDTO,
  type CustomerEstimateDTO, type SheetMaterial,
} from "@/lib/material-estimate";

export type EstimateRequest = {
  service: string | null;
  material_code: string | null; // catalog code, "other" or "unknown"
  other_material: string | null;
  thickness_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  area_mm2: number | null;
  quantity: number | null;
  description: string | null;
  file_names: string[];
  drawing_bbox: { width_mm: number; length_mm: number } | null;
};

type AiInterp = {
  material_code: string | null;
  thickness_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  area_mm2: number | null;
  quantity: number | null;
  confidence: number;
  assumptions: string[];
  missing: string[];
  geometry_note: string | null;
};

const inRange = (n: unknown, lo: number, hi: number) => typeof n === "number" && Number.isFinite(n) && n >= lo && n <= hi;
const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : typeof n === "string" && n.trim() && Number.isFinite(Number(n)) ? Number(n) : null);

export async function loadSheetCatalog() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: mats }, { data: settings }] = await Promise.all([
    supabaseAdmin.from("materials").select("code, name, price_per_kg, density_g_cm3, properties, status, active").eq("process", "sheet_metal").eq("active", true),
    supabaseAdmin.from("factory_settings").select("material_markup_pct").limit(1).maybeSingle(),
  ]);
  const materials = ((mats ?? []) as any[]).filter((m) => m.status !== "disabled") as (SheetMaterial & { status: string })[];
  const markup = Number((settings as any)?.material_markup_pct ?? DEFAULT_MARKUP_PCT);
  return { materials, markup_pct: Number.isFinite(markup) ? markup : DEFAULT_MARKUP_PCT };
}

/** Customer-safe catalog: label + thickness only. No prices. */
export async function publicSheetOptions() {
  const { materials } = await loadSheetCatalog();
  return materials.map((m) => ({
    code: m.code,
    label: customerLabel(m),
    thickness_mm: Number((m.properties as any)?.thickness_mm ?? 0) || null,
    finish: (m.properties as any)?.finish ?? null,
  })).sort((a, b) => a.label.localeCompare(b.label) || (a.thickness_mm ?? 0) - (b.thickness_mm ?? 0));
}

async function interpret(req: EstimateRequest, materials: SheetMaterial[]): Promise<{ data: AiInterp | null; model: string | null }> {
  const catalog = materials.map((m) => ({
    code: m.code, label: customerLabel(m), grade: (m.properties as any)?.grade ?? "unspecified",
    thickness_mm: (m.properties as any)?.thickness_mm ?? null, finish: (m.properties as any)?.finish ?? null,
  }));
  const system =
    "You are a sheet-metal estimating engineer for TOREO (Greece). Interpret the customer's request and return ONLY JSON. " +
    "Never output prices. Choose material_code ONLY from the provided catalog (or null). Prefer thicknesses that exist in the catalog. " +
    "If no drawing dimensions are given, create a simple, plausible INDICATIVE flat-blank geometric assumption (developed blank width × length in mm) " +
    "for the described part and describe it in geometry_note in Greek (e.g. 'Επίπεδο ανάπτυγμα 600×400 mm'). " +
    "If the request is too vague to assume anything, set confidence below 0.3 and list the minimum missing items in Greek in 'missing'. " +
    'Schema: {"material_code":string|null,"thickness_mm":number|null,"width_mm":number|null,"length_mm":number|null,' +
    '"area_mm2":number|null,"quantity":number|null,"confidence":number(0..1),"assumptions":string[] (Greek),"missing":string[] (Greek),"geometry_note":string|null}';
  const user = JSON.stringify({ request: req, catalog });
  const r = await aiComplete("material_estimate", system, user, { service: req.service });
  if (!r.ok) return { data: null, model: null };
  const cleaned = r.text.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "");
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if (s < 0 || e < 0) return { data: null, model: "ai" };
  try {
    const j = JSON.parse(cleaned.slice(s, e + 1));
    // Any price-like keys are deliberately ignored.
    return {
      model: "ai",
      data: {
        material_code: typeof j.material_code === "string" ? j.material_code : null,
        thickness_mm: num(j.thickness_mm), width_mm: num(j.width_mm), length_mm: num(j.length_mm),
        area_mm2: num(j.area_mm2), quantity: num(j.quantity),
        confidence: Math.max(0, Math.min(1, num(j.confidence) ?? 0)),
        assumptions: Array.isArray(j.assumptions) ? j.assumptions.map(String).slice(0, 8) : [],
        missing: Array.isArray(j.missing) ? j.missing.map(String).slice(0, 6) : [],
        geometry_note: typeof j.geometry_note === "string" ? j.geometry_note.slice(0, 300) : null,
      },
    };
  } catch { return { data: null, model: "ai" }; }
}

export async function runEstimate(req: EstimateRequest, ipHash: string | null): Promise<{ estimate_id: string | null; dto: CustomerEstimateDTO }> {
  const { materials, markup_pct } = await loadSheetCatalog();
  const assumptions: string[] = [];
  const missing: string[] = [];

  const hasDims = inRange(req.width_mm, LIMITS.dim_mm.min, LIMITS.dim_mm.max) && inRange(req.length_mm, LIMITS.dim_mm.min, LIMITS.dim_mm.max);
  const hasArea = inRange(req.area_mm2, 1, LIMITS.dim_mm.max ** 2);
  const knownMaterial = materials.find((m) => m.code === req.material_code) ?? null;
  const needAi = !knownMaterial || !(hasDims || hasArea || req.drawing_bbox) || !inRange(req.thickness_mm, LIMITS.thickness_mm.min, LIMITS.thickness_mm.max);

  const ai = needAi ? await interpret(req, materials) : { data: null, model: null };
  const a = ai.data;

  // ---------- geometry (customer > drawing > AI draft)
  let geometry_source: "customer" | "drawing" | "ai_draft" = "customer";
  let area: number | null = null;
  let geometry_note: string | null = null;
  let draft: { width_mm: number; length_mm: number } | null = null;
  if (hasArea) area = req.area_mm2!;
  else if (hasDims) area = req.width_mm! * req.length_mm!;
  else if (req.drawing_bbox && inRange(req.drawing_bbox.width_mm, 1, LIMITS.dim_mm.max) && inRange(req.drawing_bbox.length_mm, 1, LIMITS.dim_mm.max)) {
    geometry_source = "drawing";
    area = req.drawing_bbox.width_mm * req.drawing_bbox.length_mm;
    draft = { ...req.drawing_bbox };
    geometry_note = `Περίγραμμα σχεδίου ${Math.round(req.drawing_bbox.width_mm)}×${Math.round(req.drawing_bbox.length_mm)} mm (εκτίμηση πάνω στο εξωτερικό περίγραμμα)`;
    assumptions.push("Η μάζα υπολογίστηκε στο εξωτερικό περίγραμμα του σχεδίου (χωρίς αφαίρεση οπών).");
  } else if (a && (inRange(a.area_mm2, 1, LIMITS.dim_mm.max ** 2) || (inRange(a.width_mm, 1, LIMITS.dim_mm.max) && inRange(a.length_mm, 1, LIMITS.dim_mm.max)))) {
    geometry_source = "ai_draft";
    area = inRange(a.area_mm2, 1, LIMITS.dim_mm.max ** 2) ? a.area_mm2! : a.width_mm! * a.length_mm!;
    if (a.width_mm && a.length_mm) draft = { width_mm: a.width_mm, length_mm: a.length_mm };
    geometry_note = a.geometry_note ?? (a.width_mm && a.length_mm ? `Ενδεικτικό ανάπτυγμα ${Math.round(a.width_mm)}×${Math.round(a.length_mm)} mm` : null);
  }
  if (area == null) missing.push("Διαστάσεις τεμαχίου (πλάτος × μήκος σε mm)");

  // ---------- material
  let material = knownMaterial;
  if (!material && a?.material_code) {
    material = materials.find((m) => m.code === a.material_code) ?? null;
    if (material) assumptions.push(`Προτεινόμενο υλικό: ${customerLabel(material)}.`);
  }

  // ---------- thickness (must exist in catalog for the chosen material family)
  const requestedT = inRange(req.thickness_mm, LIMITS.thickness_mm.min, LIMITS.thickness_mm.max) ? req.thickness_mm! : a?.thickness_mm ?? null;
  if (material) {
    const label = customerLabel(material);
    const family = materials.filter((m) => customerLabel(m) === label);
    const available = family.map((m) => Number((m.properties as any)?.thickness_mm)).filter((t) => t > 0);
    const target = requestedT ?? Number((material.properties as any)?.thickness_mm);
    const t = nearestThickness(available, target);
    if (t != null) {
      const chosen = family.find((m) => Number((m.properties as any)?.thickness_mm) === t) ?? material;
      if (requestedT != null && Math.abs(t - requestedT) > 1e-6) assumptions.push(`Το πάχος ${requestedT} mm δεν είναι διαθέσιμο — χρησιμοποιήθηκε το πλησιέστερο διαθέσιμο ${t} mm.`);
      else if (requestedT == null) assumptions.push(`Προτεινόμενο πάχος ${t} mm.`);
      material = chosen;
    }
  } else if (req.material_code === "other" || req.material_code === "unknown" || !req.material_code) {
    if (!a?.material_code) assumptions.push("Το υλικό θα επιβεβαιωθεί στην επίσημη προσφορά.");
  }
  const thickness = material ? Number((material.properties as any)?.thickness_mm) || requestedT : requestedT;
  if (thickness == null) missing.push("Πάχος λαμαρίνας (mm)");

  // ---------- quantity
  const q = num(req.quantity) ?? a?.quantity ?? 1;
  const quantity = Math.max(1, Math.min(LIMITS.quantity.max, Math.floor(q)));
  if (num(req.quantity) == null) assumptions.push(`Ποσότητα: ${quantity} τεμ. (παραδοχή).`);

  // ---------- confidence
  let confidence = 0.9;
  if (geometry_source === "drawing") confidence = 0.7;
  if (geometry_source === "ai_draft") confidence = Math.min(0.6, a?.confidence ?? 0.4);
  if (!knownMaterial) confidence = Math.min(confidence, material ? 0.65 : confidence);
  if (a) assumptions.push(...a.assumptions);
  if (a) missing.push(...a.missing.filter((m) => !missing.includes(m)));

  const internal = computeEstimate({
    geometry: area != null && thickness != null ? { kind: "sheet", area_mm2: area, thickness_mm: thickness } : null,
    quantity, material, markup_pct, confidence,
  });

  const dto = toCustomerDTO(internal, {
    material_label: material ? customerLabel(material) : (req.other_material?.slice(0, 80) || null),
    thickness_mm: thickness ?? null,
    quantity,
    is_assumption: geometry_source !== "customer",
    geometry_note,
    draft,
    notes: Array.from(new Set(assumptions)),
    missing: internal.mode === "needs_info" ? Array.from(new Set(missing)) : [],
  });

  const fingerprint = createHash("sha256").update(JSON.stringify(req)).digest("hex");
  let estimate_id: string | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("material_estimates").insert({
      fingerprint, service: req.service, inputs: req as any, ai_output: (a as any) ?? null,
      assumptions: dto.notes as any, missing_fields: dto.missing as any, geometry_source,
      geometry: { area_mm2: area, thickness_mm: thickness } as any,
      material_code: material?.code ?? null, material_label: dto.material_label, thickness_mm: thickness,
      quantity, density_g_cm3: material?.density_g_cm3 ?? null,
      kg: internal.kg, kg_min: internal.kg_min, kg_max: internal.kg_max,
      cost_per_kg: internal.cost_per_kg, material_cost: internal.material_cost, markup_pct,
      price: internal.price, price_min: internal.price_min, price_max: internal.price_max,
      mode: internal.mode, confidence, model: ai.model, ip_hash: ipHash, customer_dto: dto as any,
    }).select("id").single();
    estimate_id = (data as any)?.id ?? null;
  } catch (e) {
    console.error("[material-estimate] persist failed", e);
  }
  return { estimate_id, dto };
}

export async function linkEstimate(estimateId: string, submissionId: string | null, orderId: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("material_estimates")
    .update({ submission_id: submissionId, order_id: orderId })
    .eq("id", estimateId).is("order_id", null).select("customer_dto").maybeSingle();
  return (data as any)?.customer_dto ?? null;
}
