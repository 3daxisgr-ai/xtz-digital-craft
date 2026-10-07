import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const reqSchema = z.object({
  service: z.string().max(80).nullable().optional(),
  material_code: z.string().max(40).nullable().optional(),
  other_material: z.string().max(120).nullable().optional(),
  thickness_mm: z.number().min(0.3).max(30).nullable().optional(),
  width_mm: z.number().min(1).max(6000).nullable().optional(),
  length_mm: z.number().min(1).max(6000).nullable().optional(),
  area_mm2: z.number().min(1).max(36_000_000).nullable().optional(),
  quantity: z.number().int().min(1).max(10000).nullable().optional(),
  description: z.string().max(3000).nullable().optional(),
  file_names: z.array(z.string().max(200)).max(20).default([]),
  drawing_bbox: z.object({ width_mm: z.number().min(1).max(6000), length_mm: z.number().min(1).max(6000) }).nullable().optional(),
});

/** Customer-safe sheet catalog (labels + thicknesses, never prices). */
export const listSheetOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { publicSheetOptions } = await import("@/lib/material-estimate.server");
  return publicSheetOptions();
});

/** Public: returns ONLY the customer-safe DTO. Never throws to the UI. */
export const estimateMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reqSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const { createHash } = await import("crypto");
      const ip = getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "unknown";
      const ipHash = createHash("sha256").update(String(ip).split(",")[0].trim()).digest("hex").slice(0, 32);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await supabaseAdmin.from("material_estimates").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
      if ((count ?? 0) >= 30) return { ok: false as const, error: "rate_limited" };
      const { runEstimate } = await import("@/lib/material-estimate.server");
      const r = await runEstimate({
        service: data.service ?? null, material_code: data.material_code ?? null, other_material: data.other_material ?? null,
        thickness_mm: data.thickness_mm ?? null, width_mm: data.width_mm ?? null, length_mm: data.length_mm ?? null,
        area_mm2: data.area_mm2 ?? null, quantity: data.quantity ?? null, description: data.description ?? null,
        file_names: data.file_names, drawing_bbox: data.drawing_bbox ?? null,
      }, ipHash);
      return { ok: true as const, estimate_id: r.estimate_id, estimate: r.dto };
    } catch (e) {
      console.error("[material-estimate] failed", e);
      return { ok: false as const, error: "unavailable" };
    }
  });

async function requireAdmin() {
  const { useSession } = await import("@tanstack/react-start/server");
  const raw = process.env.ADMIN_PASSWORD ?? "";
  const password = (raw + "::skg3d-admin-session-pad-do-not-share::").padEnd(64, "x");
  const s = await useSession<{ authed?: boolean }>({ password, name: "skg3d_admin", maxAge: 60 * 60 * 8, cookie: { httpOnly: true, sameSite: "lax", path: "/" } });
  if (!s.data.authed) throw new Error("Unauthorized");
}

/** Admin-only: full internal calculation for an order. */
export const panelGetMaterialEstimates = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("material_estimates").select("*").eq("order_id", data.order_id).order("created_at", { ascending: false });
    if (error) throw error;
    return (rows ?? []) as any[];
  });
