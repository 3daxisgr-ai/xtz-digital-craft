// Server-only: internal technical analysis of the customer's design input (file / photo / AI concept).
// Stored in design_input_analyses (service-role only). Never returned to customers.
import { aiComplete, type AiAttachment } from "@/lib/ai/provider.server";
import { fileKind, isDesignInputType, uncertaintyFrom } from "@/lib/design-input";

const MAX_BYTES = 4_000_000;

function mimeFor(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return null;
}

export async function analyzeDesignInput(args: {
  orderId: string | null; submissionId: string | null; category: string | null; metadata: Record<string, any>;
}) {
  const md = args.metadata ?? {};
  const type = md.design_input_type;
  if (!isDesignInputType(type)) return;
  const di = (md.design_input ?? {}) as Record<string, any>;
  const files = (Array.isArray(md.files) ? md.files : []) as { file_path: string; file_name: string }[];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Load real file content (images + PDFs) for analysis; CAD/DXF is listed by name only.
  const attachments: AiAttachment[] = [];
  if (type !== "ai_design") {
    for (const f of files.slice(0, 4)) {
      const mime = mimeFor(f.file_name);
      if (!mime) continue;
      try {
        const { data } = await supabaseAdmin.storage.from("submission-files").download(f.file_path);
        if (!data || data.size === 0 || data.size > MAX_BYTES) continue;
        const b64 = Buffer.from(await data.arrayBuffer()).toString("base64");
        attachments.push({ name: f.file_name, mime, data_url: `data:${mime};base64,${b64}` });
      } catch (e) { console.error("[design-input] download failed", f.file_path, e); }
    }
  }

  const rules = {
    file: "The customer supplied drawings/files. Read the ACTUAL attached content (OCR dimension annotations, title block, material, thickness, quantity). Never invent dimensions that are not on the drawing; list missing ones.",
    photo: "The customer supplied PHOTOS of an existing object. Identify the likely part, function and manufacturing characteristics (material family, sheet/solid, bends, welds, holes). Photos are reference only: NEVER state exact dimensions unless a reliable scale/reference is visible or the customer stated them.",
    ai_design: "The customer has NO drawing. Propose an indicative technical concept/geometry from the description. Keep customer-stated facts separate from your assumptions.",
  }[type];
  const system =
    "You are a manufacturing engineer at TOREO (Greece: 3D printing, fiber laser cutting, sheet metal bending, welding, product design). " +
    rules + " Never output prices. Return ONLY JSON: " +
    '{"identified_part":string|null,"customer_provided":string[],"ai_assumptions":string[],"dimensions_found":string[],' +
    '"material_guess":string|null,"manufacturing_notes":string[],"concept":string|null,"missing":string[],"confidence":number(0..1)} — all text in Greek.';
  const user = JSON.stringify({
    category: args.category, design_input_type: type,
    customer_description: di.description ?? null, supplied_dimensions: di.dimensions ?? null,
    material: di.material ?? null, purpose: di.purpose ?? null,
    request_details: md.request_details ?? null,
    files: files.map((f) => ({ name: f.file_name, kind: fileKind(f.file_name), analyzed: attachments.some((a) => a.name === f.file_name) })),
  });

  let ai: any = null; let error: string | null = null; let model: string | null = null;
  try {
    const r = await aiComplete("design_input_analysis", system, user, { order_id: args.orderId, type }, attachments);
    if (r.ok) {
      model = "ai";
      const t = r.text.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "");
      const s = t.indexOf("{"), e = t.lastIndexOf("}");
      if (s >= 0 && e > s) ai = JSON.parse(t.slice(s, e + 1));
    } else error = r.error;
  } catch (e) { error = e instanceof Error ? e.message : String(e); }

  let confidence = Math.max(0, Math.min(1, Number(ai?.confidence) || 0));
  if (type === "photo" && !di.dimensions) confidence = Math.min(confidence, 0.5);
  if (type === "ai_design") confidence = Math.min(confidence, 0.6);
  const geometry_source = di.dimensions ? "customer" : type === "file" ? "drawing" : type === "photo" ? "photo" : "ai_draft";

  await (supabaseAdmin as any).from("design_input_analyses").insert({
    order_id: args.orderId, submission_id: args.submissionId, category: args.category, design_input_type: type,
    files: files.map((f) => ({ ...f, kind: fileKind(f.file_name) })),
    customer_description: di.description ?? null, supplied_dimensions: di.dimensions ?? null,
    ai_output: ai, assumptions: Array.isArray(ai?.ai_assumptions) ? ai.ai_assumptions.slice(0, 12) : [],
    geometry_source, uncertainty: ai ? uncertaintyFrom(confidence) : "high",
    analyzed_file_count: attachments.length, model, error,
  });
}
