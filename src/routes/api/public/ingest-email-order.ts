/**
 * Server-to-server endpoint that receives AI-extracted email order data.
 *
 * Auth: X-Email-Ingestion-Secret header must match the EMAIL_INGESTION_SECRET
 * server secret (constant-time compare). No browser/client access.
 *
 * Idempotency: message_id is unique; a repeat call returns the stored record.
 */
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const attachmentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mime_type: z.string().trim().max(160).optional().nullable(),
  size: z.number().int().nonnegative().optional().nullable(),
  storage_path: z.string().trim().max(500).optional().nullable(),
});

const aiDataSchema = z
  .object({
    is_order: z.boolean().optional().nullable(),
    needs_confirmation: z.boolean().optional().nullable(),
    customer_name: z.string().trim().max(200).optional().nullable(),
    customer_email: z.string().trim().max(255).optional().nullable(),
    customer_phone: z.string().trim().max(60).optional().nullable(),
    company: z.string().trim().max(200).optional().nullable(),
    service: z.string().trim().max(160).optional().nullable(),
    quantity: z.union([z.number(), z.string()]).optional().nullable(),
    material: z.string().trim().max(160).optional().nullable(),
    color: z.string().trim().max(80).optional().nullable(),
    dimensions: z.string().trim().max(200).optional().nullable(),
    deadline: z.string().trim().max(40).optional().nullable(),
    notes: z.string().trim().max(8000).optional().nullable(),
    confidence: z.number().min(0).max(1).optional().nullable(),
    missing_fields: z.array(z.string().max(80)).optional().nullable(),
  })
  .passthrough();

const payloadSchema = z
  .object({
    message_id: z.string().trim().min(3).max(998),
    thread_id: z.string().trim().max(998).optional().nullable(),
    from_email: z.string().trim().email().max(255),
    from_name: z.string().trim().max(200).optional().nullable(),
    to_email: z.string().trim().max(255).optional().nullable(),
    subject: z.string().trim().max(998).optional().nullable(),
    body_text: z.string().max(200_000).optional().nullable(),
    received_at: z.string().trim().max(60).optional().nullable(),
    is_order: z.boolean().optional().nullable(),
    needs_confirmation: z.boolean().optional().nullable(),
    ai_data: z
      .union([aiDataSchema, z.string()])
      .optional()
      .default({})
      .transform((v) => {
        if (typeof v !== "string") return v;
        try {
          const parsed = JSON.parse(v);
          return aiDataSchema.parse(parsed);
        } catch {
          return {};
        }
      }),
    attachments: z.array(attachmentSchema).max(50).optional().default([]),
  })
  .passthrough();

const FIELD_ALIASES: Record<string, string[]> = {
  is_order: ["is_order", "isorder"],
  needs_confirmation: ["needs_confirmation", "needsconfirmation", "confirmation_needed"],
  customer_name: ["customer_name", "customername", "name", "fullname", "full_name", "client_name"],
  customer_email: ["customer_email", "customeremail", "email", "client_email"],
  customer_phone: ["customer_phone", "customerphone", "phone", "telephone", "tel", "mobile"],
  company: ["company", "company_name", "companyname"],
  service: ["service", "service_type", "servicetype", "job_type"],
  quantity: ["quantity", "qty", "pieces", "pcs", "amount"],
  material: ["material", "materials"],
  color: ["color", "colour"],
  dimensions: ["dimensions", "dimension", "size", "sizes"],
  deadline: ["deadline", "due_date", "duedate", "delivery_date"],
  notes: ["notes", "note", "comments"],
  confidence: ["confidence", "confidence_score"],
  missing_fields: ["missing_fields", "missingfields"],
};

const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

function maybeParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const s = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  if (!s.startsWith("{") && !s.startsWith("[")) return value;
  try {
    return JSON.parse(s);
  } catch {
    return value;
  }
}

/**
 * Make/Gemini may nest the extracted fields inside `ai_data`, send them flat,
 * wrap them in another envelope, or deliver them as a JSON string. Walk the
 * whole payload and collect the first meaningful value per canonical field.
 */
function mergeExtraction(payload: Record<string, any>) {
  const out: Record<string, any> = {};
  const lookup = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) lookup.set(alias, canonical);
  }

  const visit = (node: unknown, depth: number) => {
    if (depth > 6) return;
    const value = maybeParseJson(node);
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
      const key = rawKey.trim().toLowerCase().replace(/[\s-]+/g, "_");
      const canonical = lookup.get(key);
      const parsedValue = maybeParseJson(rawValue);
      if (canonical === "missing_fields" && Array.isArray(parsedValue)) {
        if (!out.missing_fields) out.missing_fields = parsedValue;
      } else if (canonical && (typeof parsedValue !== "object" || parsedValue === null)) {
        if (!has(out[canonical]) && has(parsedValue)) out[canonical] = parsedValue;
      } else {
        visit(parsedValue, depth + 1);
      }
    }
  };

  // Raw email text is unstructured — don't mine it for field names.
  const scanTarget: Record<string, any> = { ...payload };
  delete scanTarget.body_text;
  delete scanTarget.subject;
  visit(scanTarget, 0);

  // Booleans may legitimately be `false`, so read them explicitly.
  const boolFrom = (v: unknown) =>
    typeof v === "boolean" ? v : typeof v === "string" ? v.trim().toLowerCase() === "true" : undefined;
  const nested = (payload.ai_data ?? {}) as Record<string, any>;
  const isOrderRaw = payload.is_order ?? nested.is_order ?? out.is_order;
  const needsRaw = payload.needs_confirmation ?? nested.needs_confirmation ?? out.needs_confirmation;
  if (isOrderRaw !== undefined) out.is_order = boolFrom(isOrderRaw) ?? isOrderRaw;
  if (needsRaw !== undefined) out.needs_confirmation = boolFrom(needsRaw) ?? needsRaw;
  return out;
}


const CONFIDENCE_THRESHOLD = 0.7;
const REQUIRED_FIELDS = ["customer_email", "customer_name", "service", "quantity"] as const;
// Services where a material must be specified before an order can be auto-created.
const MATERIAL_REQUIRED = /3d|print|laser|cut|bend|sheet|weld|metal/i;


function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function secretMatches(provided: string | null, expected: string) {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/ingest-email-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["EMAIL_INGESTION_SECRET"];
        if (!expected) {
          console.error("[ingest-email-order] EMAIL_INGESTION_SECRET is not configured");
          return json({ success: false, error: "Ingestion not configured" }, 503);
        }
        if (!secretMatches(request.headers.get("x-email-ingestion-secret"), expected)) {
          console.warn("[ingest-email-order] rejected request with invalid or missing secret");
          return json({ success: false, error: "Unauthorized" }, 401);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ success: false, error: "Invalid JSON body" }, 400);
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) {
          return json(
            {
              success: false,
              error: "Validation failed",
              issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
            },
            400,
          );
        }
        const data = parsed.data as any;
        // Scan the raw body (not just the validated shape) so no unknown-key
        // stripping can hide the extracted fields.
        console.log(
          `[ingest-email-order] body keys=${Object.keys(raw as Record<string, unknown>).join(",")}`,
        );
        const ai = mergeExtraction({ ...(raw as Record<string, any>), ...data });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        // 1. Idempotency — same message_id never creates a second order.
        const { data: existing } = await db
          .from("email_order_intake")
          .select("id, status, order_id, missing_fields")
          .eq("message_id", data.message_id)
          .maybeSingle();

        if (existing) {
          console.log(`[ingest-email-order] duplicate message_id, returning intake ${existing.id}`);
          return json({
            success: true,
            duplicate: true,
            status: existing.order_id ? "created" : existing.status,
            intake_id: existing.id,
            order_id: existing.order_id ?? null,
            missing_fields: existing.missing_fields ?? [],
          });
        }

        // 2. Completeness check — computed from the extracted values only.
        // Stale AI-reported missing_fields never override what we actually found.
        const missing = new Set<string>();

        const emailCandidate = (has(ai.customer_email) ? ai.customer_email : data.from_email ?? "")
          .toString()
          .trim();
        const emailValid = z.string().email().safeParse(emailCandidate).success;
        if (!emailValid) missing.add("customer_email");

        const nameCandidate = (has(ai.customer_name) ? ai.customer_name : data.from_name ?? "")
          .toString()
          .trim();
        if (!nameCandidate) missing.add("customer_name");

        for (const field of REQUIRED_FIELDS) {
          if (field === "customer_name" || field === "customer_email") continue;
          if (!has((ai as Record<string, unknown>)[field])) missing.add(field);
        }

        const serviceText = (ai.service ?? "").toString();
        const materialText = (ai.material ?? "").toString().trim();
        if (MATERIAL_REQUIRED.test(serviceText) && !materialText) missing.add("material");

        const confidenceRaw = ai.confidence;
        const confidenceProvided = has(confidenceRaw) && Number.isFinite(Number(confidenceRaw));
        const confidence = confidenceProvided ? Number(confidenceRaw) : 1;
        const isOrder = ai.is_order ?? true;
        const flaggedForReview = ai.needs_confirmation === true;
        const lowConfidence = confidenceProvided && confidence < CONFIDENCE_THRESHOLD;
        const needsConfirmation =
          isOrder === false || flaggedForReview || missing.size > 0 || lowConfidence;
        const missingFields = [...missing];
        console.log(
          `[ingest-email-order] extracted=${JSON.stringify({
            name: nameCandidate,
            email: emailCandidate,
            service: ai.service ?? null,
            quantity: ai.quantity ?? null,
            material: ai.material ?? null,
          })} missing=${missingFields.join(",") || "none"} needsConfirmation=${needsConfirmation}`,
        );


        const receivedAt = (() => {
          const d = data.received_at ? new Date(data.received_at) : new Date();
          return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        })();

        const baseRow = {
          message_id: data.message_id,
          thread_id: data.thread_id ?? null,
          from_email: data.from_email,
          from_name: data.from_name ?? null,
          to_email: data.to_email ?? null,
          subject: data.subject ?? null,
          body_text: data.body_text ?? null,
          received_at: receivedAt,
          ai_data: ai,
          confidence,
          missing_fields: missingFields,
          attachments: data.attachments ?? [],
        };

        // 3. Store the intake first, so nothing is lost if order creation fails.
        const { data: intake, error: intakeError } = await db
          .from("email_order_intake")
          .insert({ ...baseRow, status: needsConfirmation ? "needs_confirmation" : "new" })
          .select("id, status, order_id, missing_fields")
          .single();

        if (intakeError) {
          // Unique violation => concurrent delivery of the same message.
          if (intakeError.code === "23505") {
            const { data: raced } = await db
              .from("email_order_intake")
              .select("id, status, order_id, missing_fields")
              .eq("message_id", data.message_id)
              .maybeSingle();
            if (raced) {
              return json({
                success: true,
                duplicate: true,
                status: raced.order_id ? "created" : raced.status,
                intake_id: raced.id,
                order_id: raced.order_id ?? null,
                missing_fields: raced.missing_fields ?? [],
              });
            }
          }
          console.error("[ingest-email-order] intake insert failed", intakeError.message);
          return json({ success: false, error: "Could not store intake" }, 500);
        }

        if (needsConfirmation) {
          console.log(
            `[ingest-email-order] intake ${intake.id} needs confirmation (confidence=${confidence}, missing=${missingFields.join(",") || "none"})`,
          );
          return json({
            success: true,
            duplicate: false,
            status: "needs_confirmation",
            intake_id: intake.id,
            order_id: null,
            missing_fields: missingFields,
          });
        }

        // 4. Create the order through the existing orders system.
        try {
          const customerEmail = emailCandidate;
          const { data: profile } = await db
            .from("profiles")
            .select("user_id")
            .ilike("email", customerEmail)
            .maybeSingle();

          const { data: order, error: orderError } = await db
            .from("orders")
            .insert({
              user_id: profile?.user_id ?? null,
              customer_name: (nameCandidate || customerEmail).toString().slice(0, 200),
              customer_email: customerEmail,
              customer_phone: ai.customer_phone ?? null,
              company: ai.company ?? null,
              source: "inquiry",
              status: "quote_received",
              priority: "normal",
              service: ai.service ?? null,
              material: ai.material ?? null,
              quantity: ai.quantity != null ? String(ai.quantity) : null,
              dimensions: ai.dimensions ?? null,
              message: data.body_text ?? ai.notes ?? null,
              metadata: {
                intake_channel: "email",
                email_message_id: data.message_id,
                email_thread_id: data.thread_id ?? null,
                email_subject: data.subject ?? null,
                extracted: ai,
                extraction_confidence: confidence,
                color: ai.color ?? null,
                deadline: ai.deadline ?? null,
              },
            })
            .select("id, order_code")
            .single();
          if (orderError) throw orderError;


          // 5. Attachment metadata stays private (admin visibility only).
          const files = ((data.attachments ?? []) as any[]).filter((a: any) => a.storage_path);
          if (files.length) {
            await db.from("order_files").insert(
              files.map((a: any) => ({
                order_id: order.id,
                file_path: a.storage_path,
                file_name: a.filename,
                file_type: a.filename.split(".").pop() ?? null,
                size_bytes: a.size ?? null,
                uploaded_by: "customer",
                visibility: "admin",
                metadata: { mime_type: a.mime_type ?? null, source: "email" },
              })),
            );
          }

          await db
            .from("email_order_intake")
            .update({ status: "processed", order_id: order.id, error_message: null })
            .eq("id", intake.id);

          console.log(`[ingest-email-order] intake ${intake.id} created order ${order.order_code}`);
          return json({
            success: true,
            duplicate: false,
            status: "created",
            intake_id: intake.id,
            order_id: order.id,
            order_code: order.order_code ?? null,
            missing_fields: [],
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          console.error("[ingest-email-order] order creation failed", message);
          await db
            .from("email_order_intake")
            .update({ status: "failed", error_message: message.slice(0, 1000) })
            .eq("id", intake.id);
          return json(
            { success: false, duplicate: false, status: "failed", intake_id: intake.id, error: "Order creation failed" },
            500,
          );
        }
      },
    },
  },
});
