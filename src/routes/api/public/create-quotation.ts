/**
 * Server-to-server endpoint that creates a DRAFT quotation for an existing order.
 *
 * Auth: X-Email-Ingestion-Secret header must match the EMAIL_INGESTION_SECRET
 * server secret (same shared secret as the email ingestion endpoint).
 *
 * A quotation created here is never priced automatically and never sent —
 * an admin reviews, prices, generates the PDF and sends it by hand.
 */
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const schema = z.object({
  order_code: z.string().trim().min(3).max(40).optional().nullable(),
  order_id: z.string().trim().uuid().optional().nullable(),
  thread_id: z.string().trim().max(998).optional().nullable(),
  message_id: z.string().trim().max(998).optional().nullable(),
  project: z
    .object({
      title: z.string().max(300).optional().nullable(),
      description: z.string().max(8000).optional().nullable(),
      service: z.string().max(160).optional().nullable(),
      material: z.string().max(160).optional().nullable(),
      dimensions: z.string().max(200).optional().nullable(),
      thickness: z.string().max(120).optional().nullable(),
      tolerance: z.string().max(120).optional().nullable(),
      drawing_code: z.string().max(120).optional().nullable(),
      extra: z.string().max(2000).optional().nullable(),
    })
    .partial()
    .optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function secretMatches(provided: string | null, expected: string) {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/create-quotation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["EMAIL_INGESTION_SECRET"];
        if (!expected) return json({ success: false, error: "Not configured" }, 503);
        if (!secretMatches(request.headers.get("x-email-ingestion-secret"), expected)) {
          return json({ success: false, error: "Unauthorized" }, 401);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ success: false, error: "Invalid JSON body" }, 400);
        }
        const parsed = schema.safeParse(raw);
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
        const input = parsed.data;
        if (!input.order_code && !input.order_id) {
          return json({ success: false, error: "order_code or order_id is required" }, 400);
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          let orderCode = input.order_code ?? null;
          if (!orderCode) {
            const { data: order } = await db.from("orders").select("order_code").eq("id", input.order_id).maybeSingle();
            orderCode = order?.order_code ?? null;
          }
          if (!orderCode) return json({ success: false, error: "Order not found" }, 404);

          const m = await import("@/lib/api/quote-doc.server");
          const doc: any = await m.createDraftQuoteForOrder(orderCode, {
            thread_id: input.thread_id ?? null,
            message_id: input.message_id ?? null,
          });

          if (input.project && Object.keys(input.project).length) {
            const merged = { ...(doc.project ?? {}) };
            for (const [k, v] of Object.entries(input.project)) if (v) merged[k] = v;
            await db.from("quote_documents").update({ project: merged }).eq("id", doc.id);
          }

          console.log(`[create-quotation] draft ${doc.number} for order ${orderCode}`);
          return json({
            success: true,
            status: "draft",
            quotation_number: doc.number,
            quotation_id: doc.id,
            order_code: orderCode,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          console.error("[create-quotation] failed", message);
          return json({ success: false, error: message }, 500);
        }
      },
    },
  },
});
