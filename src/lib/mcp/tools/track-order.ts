import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "track_order",
  title: "Track a TOREO order",
  description:
    "Look up the current status, timeline and quoted price of one of the signed-in customer's own TOREO orders, by order code (e.g. TR-2026-0001).",
  inputSchema: {
    order_code: z.string().trim().min(3).describe("Order code, e.g. TR-2026-0001"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ order_code }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const email = ctx.getUserEmail();
    if (!email) {
      return {
        content: [{ type: "text", text: "Your account has no verified email, so orders cannot be matched." }],
        isError: true,
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "order_code, status, service, material, quantity, quote_price, currency, due_date, created_at, customer_email",
      )
      .eq("order_code", order_code)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!order || String(order.customer_email).toLowerCase() !== email.toLowerCase()) {
      return {
        content: [{ type: "text", text: "No order with that code is linked to your account." }],
        isError: true,
      };
    }
    const safe = {
      order_code: order.order_code,
      status: order.status,
      service: order.service,
      material: order.material,
      quantity: order.quantity,
      quote_price: order.quote_price,
      currency: order.currency ?? "EUR",
      due_date: order.due_date,
      submitted_at: order.created_at,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(safe, null, 2) }],
      structuredContent: { order: safe },
    };
  },
});
