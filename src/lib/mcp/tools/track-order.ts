import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "track_order",
  title: "Track a TOREO order",
  description: "Look up the current status, timeline, and quoted price of an existing TOREO order. Requires both the order code (e.g. TR-2026-0001) and the exact customer email used on the quote.",
  inputSchema: {
    order_code: z.string().trim().min(3).describe("Order code, e.g. TR-2026-0001"),
    email: z.string().trim().email().describe("Customer email used when the quote was submitted"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ order_code, email }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("order_code, status, service, material, quantity, quote_price, currency, due_date, created_at, customer_email")
      .eq("order_code", order_code)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!order || String(order.customer_email).toLowerCase() !== email.toLowerCase()) {
      return { content: [{ type: "text", text: "No matching order found for that code and email." }], isError: true };
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
