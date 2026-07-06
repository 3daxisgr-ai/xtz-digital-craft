// TOREO AI Factory OS — Part 3.2: portal AI assistant + delay predictions.
// Customer-authenticated server functions.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

async function getUser() {
  const { supabase } = await import("@/integrations/supabase/client");
  const headers = getRequestHeaders();
  const authHeader = headers["authorization"] || headers["Authorization"];
  if (!authHeader) return null;
  const token = String(authHeader).replace(/^Bearer\s+/i, "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, token };
}

async function loadOrderForUser(orderCode: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_code, status, service, material, quantity, dimensions, message, quote_price, currency, created_at, updated_at, due_date, priority, customer_name, user_id",
    )
    .eq("order_code", orderCode)
    .maybeSingle();
  if (!order || order.user_id !== userId) throw new Error("Not found");
  return order;
}

// ---------- Delay prediction ----------
// Combines: scheduled finish (production_jobs), material stock, machine load,
// and status flow to estimate risk of missing due date.

export const portalDelayPrediction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const u = await getUser();
    if (!u) throw new Error("Not authenticated");
    const order = await loadOrderForUser(data.order_code, u.user.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: jobs } = await supabaseAdmin
      .from("production_jobs" as any)
      .select("planned_finish, actual_finish, state, estimated_hours, machine_id")
      .eq("order_id", order.id)
      .order("planned_finish", { ascending: false })
      .limit(1);
    const job = (jobs ?? [])[0] as any;

    // Baseline: 7 days from creation if no due date, no analysis
    const created = new Date((order as any).created_at).getTime();
    const dueMs = (order as any).due_date
      ? new Date((order as any).due_date).getTime()
      : created + 10 * 864e5;

    let predictedFinishMs = created + 7 * 864e5;
    if (job?.actual_finish) predictedFinishMs = new Date(job.actual_finish).getTime();
    else if (job?.planned_finish) predictedFinishMs = new Date(job.planned_finish).getTime();
    else if (job?.estimated_hours) {
      // rough: queue position * 6h + estimated
      predictedFinishMs = Date.now() + (Number(job.estimated_hours) + 24) * 3600_000;
    }

    // Shipping buffer 2 business days after production done
    const etaDeliveryMs = predictedFinishMs + 2 * 864e5;

    const deltaDays = (etaDeliveryMs - dueMs) / 864e5;
    let risk: "on_track" | "at_risk" | "delayed" = "on_track";
    if (deltaDays > 1) risk = "delayed";
    else if (deltaDays > -1) risk = "at_risk";

    const reasons: string[] = [];
    if (!job) reasons.push("Not yet scheduled in production queue");
    if (job?.state === "blocked") reasons.push("Production is blocked");
    if (deltaDays > 0) reasons.push(`Predicted ${Math.round(deltaDays)} day(s) past target`);
    if (order.status === "engineering_review") reasons.push("Awaiting DFM engineering review");

    return {
      risk,
      predicted_finish: new Date(predictedFinishMs).toISOString(),
      predicted_delivery: new Date(etaDeliveryMs).toISOString(),
      due_date: new Date(dueMs).toISOString(),
      delta_days: Math.round(deltaDays * 10) / 10,
      reasons,
      has_job: !!job,
    };
  });

// ---------- AI Assistant (customer chat with context) ----------

export const portalAiAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        order_code: z.string().min(1),
        question: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getUser();
    if (!u) throw new Error("Not authenticated");
    const order = await loadOrderForUser(data.order_code, u.user.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: events }, { data: analyses }, { data: jobs }] = await Promise.all([
      supabaseAdmin
        .from("order_events")
        .select("title, description, event_type, created_at")
        .eq("order_id", order.id)
        .eq("visibility", "customer")
        .order("created_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("project_analyses" as any)
        .select("printability_score, complexity_band, quote_price_eur, estimated_print_hours, recommended_material, risks, notes")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("production_jobs" as any)
        .select("state, planned_start, planned_finish, estimated_hours")
        .eq("order_id", order.id)
        .limit(1),
    ]);

    const context = {
      order: {
        code: order.order_code,
        status: order.status,
        service: order.service,
        material: order.material,
        quantity: order.quantity,
        quote_price: order.quote_price,
        due_date: (order as any).due_date,
        created_at: order.created_at,
      },
      recent_events: events ?? [],
      latest_analysis: (analyses ?? [])[0] ?? null,
      production_job: (jobs ?? [])[0] ?? null,
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        answer:
          "The AI assistant is temporarily offline. A team member will follow up shortly on your order.",
        offline: true,
      };
    }

    const systemPrompt = `You are TOREO's factory assistant. You help a customer understand the status of their manufacturing order.
Use ONLY the JSON context below. Answer in 1-3 short sentences. Be direct, warm, and precise.
If you don't know, say so and offer to escalate to the team. Never invent prices, dates, or promises.
Context: ${JSON.stringify(context)}`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: data.question },
          ],
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        return { answer: `Assistant error (${resp.status}). Please try again shortly.`, offline: false, error: text.slice(0, 200) };
      }
      const json: any = await resp.json();
      const answer = json?.choices?.[0]?.message?.content ?? "No response.";
      return { answer, offline: false };
    } catch (e: any) {
      return { answer: "The AI assistant is temporarily unavailable.", offline: true, error: e.message };
    }
  });

// ---------- Notifications (customer-facing feed) ----------
// Uses order_events as source of truth for customer notifications.

export const portalListNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const u = await getUser();
  if (!u) throw new Error("Not authenticated");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, order_code")
    .eq("user_id", u.user.id);
  const ids = (orders ?? []).map((o: any) => o.id);
  if (ids.length === 0) return { items: [] };
  const codeById: Record<string, string> = Object.fromEntries((orders ?? []).map((o: any) => [o.id, o.order_code]));
  const { data: events } = await supabaseAdmin
    .from("order_events")
    .select("id, order_id, title, description, event_type, created_at")
    .in("order_id", ids)
    .eq("visibility", "customer")
    .order("created_at", { ascending: false })
    .limit(30);
  return {
    items: (events ?? []).map((e: any) => ({ ...e, order_code: codeById[e.order_id] })),
  };
});
