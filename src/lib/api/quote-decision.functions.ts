// Accept / decline decision workflow for admin.
// Records a permanent decision, updates order status, and emails the customer.
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSession = { authed?: boolean };
function sessionConfig() {
  const raw = process.env.ADMIN_PASSWORD ?? "";
  const password = (raw + "::skg3d-admin-session-pad-do-not-share::").padEnd(64, "x");
  return { password, name: "skg3d_admin", maxAge: 60 * 60 * 8, cookie: { httpOnly: true, sameSite: "lax" as const, path: "/" } };
}
async function requireAdminCookie() {
  const s = await useSession<AdminSession>(sessionConfig());
  if (!s.data.authed) throw new Error("Unauthorized");
}

const acceptInput = z.object({
  order_code: z.string().min(1),
  accepted_price: z.number().nonnegative(),
  currency: z.string().default("EUR"),
  delivery_time: z.string().max(200).optional().nullable(),
  payment_terms: z.string().max(400).optional().nullable(),
  customer_message: z.string().max(4000).optional().nullable(),
  recipient_email: z.string().email().optional().nullable(),
  send_email: z.boolean().default(true),
});

export const acceptQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => acceptInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: e0 } = await supabaseAdmin
      .from("orders").select("*").eq("order_code", data.order_code).single();
    if (e0 || !order) throw new Error("Order not found");

    const patch: any = {
      status: "awaiting_approval",
      quote_price: data.accepted_price,
      currency: data.currency,
    };
    const { data: updated, error: e1 } = await supabaseAdmin
      .from("orders").update(patch).eq("id", order.id).select("*").single();
    if (e1) throw e1;

    const to = data.recipient_email || updated.customer_email;
    const { data: rec, error: eRec } = await supabaseAdmin
      .from("quote_decisions" as any)
      .insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: "accepted",
        accepted_price: data.accepted_price,
        currency: data.currency,
        delivery_time: data.delivery_time,
        payment_terms: data.payment_terms,
        customer_message: data.customer_message,
        recipient_email: to,
        email_subject: `Quote Accepted – ${order.order_code}`,
        email_status: data.send_email ? "pending" : "sent",
      })
      .select("*").single();
    if (eRec) throw eRec;

    if (data.send_email && to) {
      try {
        const { sendQuoteAcceptedEmail } = await import("@/lib/email/quote-decision.server");
        const r = await sendQuoteAcceptedEmail({
          to: to!,
          orderCode: order.order_code,
          price: data.accepted_price,
          currency: data.currency,
          deliveryTime: data.delivery_time,
          paymentTerms: data.payment_terms,
          message: data.customer_message,
        });
        await supabaseAdmin.from("quote_decisions" as any).update({
          email_status: r.ok ? "sent" : "failed",
          email_error: r.ok ? null : r.error,
          email_sent_at: r.ok ? new Date().toISOString() : null,
        }).eq("id", (rec as any).id);
      } catch (e: any) {
        await supabaseAdmin.from("quote_decisions" as any).update({
          email_status: "failed", email_error: String(e?.message ?? e),
        }).eq("id", (rec as any).id);
      }
    }
    return { ok: true, order: updated, decision_id: (rec as any).id };
  });

const declineInput = z.object({
  order_code: z.string().min(1),
  reason_code: z.enum(["not_manufacturable", "outside_capabilities", "unavailable_material", "price_disagreement", "customer_cancelled", "other"]),
  reason_text: z.string().max(2000).optional().nullable(),
  customer_message: z.string().max(4000).optional().nullable(),
  recipient_email: z.string().email().optional().nullable(),
  send_email: z.boolean().default(true),
});

export const declineQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => declineInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: e0 } = await supabaseAdmin
      .from("orders").select("*").eq("order_code", data.order_code).single();
    if (e0 || !order) throw new Error("Order not found");

    const { data: updated, error: e1 } = await supabaseAdmin
      .from("orders").update({ status: "rejected" }).eq("id", order.id).select("*").single();
    if (e1) throw e1;

    const to = data.recipient_email || updated.customer_email;
    const REASON_LABEL: Record<string, string> = {
      not_manufacturable: "Not manufacturable as designed",
      outside_capabilities: "Outside our current capabilities",
      unavailable_material: "Requested material not available",
      price_disagreement: "Price could not be agreed",
      customer_cancelled: "Cancelled by customer",
      other: "Other",
    };
    const combinedReason = [REASON_LABEL[data.reason_code], data.reason_text].filter(Boolean).join(" — ");

    const { data: rec, error: eRec } = await supabaseAdmin
      .from("quote_decisions" as any)
      .insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: "declined",
        decline_reason_code: data.reason_code,
        decline_reason_text: data.reason_text,
        customer_message: data.customer_message,
        recipient_email: to,
        email_subject: `Update on your quote – ${order.order_code}`,
        email_status: data.send_email ? "pending" : "sent",
      })
      .select("*").single();
    if (eRec) throw eRec;

    if (data.send_email && to) {
      try {
        const { sendQuoteDeclinedEmail } = await import("@/lib/email/quote-decision.server");
        const r = await sendQuoteDeclinedEmail({
          to: to!, orderCode: order.order_code,
          reason: combinedReason, message: data.customer_message,
        });
        await supabaseAdmin.from("quote_decisions" as any).update({
          email_status: r.ok ? "sent" : "failed",
          email_error: r.ok ? null : r.error,
          email_sent_at: r.ok ? new Date().toISOString() : null,
        }).eq("id", (rec as any).id);
      } catch (e: any) {
        await supabaseAdmin.from("quote_decisions" as any).update({
          email_status: "failed", email_error: String(e?.message ?? e),
        }).eq("id", (rec as any).id);
      }
    }
    return { ok: true, order: updated, decision_id: (rec as any).id };
  });

export const listDecisions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id").eq("order_code", data.order_code).single();
    if (!order) return [];
    const { data: rows } = await supabaseAdmin
      .from("quote_decisions" as any)
      .select("*").eq("order_id", (order as any).id).order("created_at", { ascending: false });
    return rows ?? [];
  });
