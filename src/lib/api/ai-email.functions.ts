// Admin AI + email workspace API.
//
// Everything here is cookie-session authed (ADMIN_PASSWORD) and runs
// server-side only: AI keys and the service-role client never reach the
// browser. AI may summarise, classify and DRAFT — it never sends. Sending is
// a separate, explicitly confirmed call (`aiSendEmail`).

import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSession = { authed?: boolean; ts?: number };

function sessionConfig() {
  const raw = process.env.ADMIN_PASSWORD ?? "";
  const password = (raw + "::skg3d-admin-session-pad-do-not-share::").padEnd(64, "x");
  return {
    password,
    name: "skg3d_admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, sameSite: "lax" as const, path: "/" },
  };
}

async function requireAdminCookie() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.authed) throw new Error("Unauthorized");
  return true;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const ORDER_COLUMNS =
  "id, order_code, customer_name, customer_email, customer_phone, company, service, material, " +
  "quantity, dimensions, message, status, priority, quote_price, currency, due_date, metadata, created_at";

async function loadOrder(orderCode: string) {
  const sb = await db();
  const { data, error } = await sb.from("orders").select(ORDER_COLUMNS).eq("order_code", orderCode).single();
  if (error) throw new Error(error.message);
  return data;
}

function orderContext(o: any) {
  return {
    order_code: o.order_code,
    status: o.status,
    customer: { name: o.customer_name, email: o.customer_email, company: o.company, phone: o.customer_phone },
    service: o.service,
    material: o.material,
    quantity: o.quantity,
    dimensions: o.dimensions,
    due_date: o.due_date,
    quote_price: o.quote_price ? `${o.quote_price} ${o.currency ?? "EUR"}` : null,
    customer_message: o.message,
    request_details: o.metadata ?? {},
  };
}

// --------------------------------------------------------------- AI summary

/**
 * Generate (or regenerate) the AI CUSTOMER REQUEST SUMMARY for an order.
 * Stored in `orders.metadata.ai_intake` so it survives and stays editable.
 */
export const aiAnalyzeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ orderCode: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const o = await loadOrder(data.orderCode);
    const { analyzeEmail } = await import("@/lib/ai/provider.server");

    const r = await analyzeEmail({
      senderEmail: o.customer_email,
      senderName: o.customer_name,
      subject: `${o.service ?? "Request"} — ${o.order_code}`,
      body: o.message ?? "",
      facts: orderContext(o) as Record<string, unknown>,
    });
    if (!r.ok) return { ok: false as const, error: r.error };

    const sb = await db();
    const metadata = { ...(o.metadata ?? {}), ai_intake: { ...r.data, generated_at: new Date().toISOString(), edited: false } };
    await sb.from("orders").update({ metadata }).eq("id", o.id);
    return { ok: true as const, data: r.data };
  });

/** Admin edit of the AI summary text (human always wins). */
export const aiSaveSummary = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ orderCode: z.string().min(1), summary: z.string().max(8000) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const o = await loadOrder(data.orderCode);
    const sb = await db();
    const prev = (o.metadata ?? {}).ai_intake ?? {};
    const metadata = { ...(o.metadata ?? {}), ai_intake: { ...prev, summary: data.summary, edited: true } };
    const { error } = await sb.from("orders").update({ metadata }).eq("id", o.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Read the stored intake analysis without calling the AI provider. */
export const aiGetIntake = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ orderCode: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const o = await loadOrder(data.orderCode);
    return { intake: (o.metadata ?? {}).ai_intake ?? null };
  });

/** Recommended next action, based only on what is actually known. */
export const aiNextAction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ orderCode: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const o = await loadOrder(data.orderCode);
    const sb = await db();
    const { data: emails } = await sb
      .from("order_emails")
      .select("direction, subject, status, created_at")
      .eq("order_id", o.id)
      .order("created_at", { ascending: true })
      .limit(30);

    const { suggestNextAction } = await import("@/lib/ai/provider.server");
    const r = await suggestNextAction(
      JSON.stringify({ order: orderContext(o), emails: emails ?? [] }),
    );
    if (!r.ok) return { ok: false as const, error: r.error };
    return { ok: true as const, action: r.action };
  });

// ------------------------------------------------------------- email drafting

/**
 * Draft a customer email from a plain Greek or English instruction.
 * Returns a draft only — nothing is sent and nothing is persisted as an email.
 */
export const aiDraftEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        orderCode: z.string().min(1),
        instruction: z.string().min(3).max(4000),
        language: z.enum(["auto", "el", "en"]).default("auto"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const o = await loadOrder(data.orderCode);
    const sb = await db();
    const { data: emails } = await sb
      .from("order_emails")
      .select("direction, subject, body_text, created_at")
      .eq("order_id", o.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const thread = (emails ?? [])
      .map((e: any) => `[${e.direction === "inbound" ? "CUSTOMER" : "TOREO"} ${e.created_at}] ${e.subject}\n${(e.body_text ?? "").slice(0, 1200)}`)
      .join("\n\n");

    const { generateEmail } = await import("@/lib/ai/provider.server");
    const r = await generateEmail({
      instruction: data.instruction,
      orderContext: orderContext(o),
      threadContext: thread || undefined,
      language: data.language,
    });
    if (!r.ok) return { ok: false as const, error: r.error };

    return {
      ok: true as const,
      to: o.customer_email as string,
      subject: r.subject,
      body: r.body,
      language: r.language,
    };
  });

// ----------------------------------------------------------------- sending

/**
 * Send an email to the customer. ALWAYS an explicit human action — the AI
 * never reaches this function on its own. Persists full history metadata
 * (AI-generated flag, original instruction, regeneration count).
 */
export const aiSendEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        orderCode: z.string().min(1),
        to: z.string().email(),
        cc: z.string().optional().nullable(),
        subject: z.string().min(1).max(300),
        body: z.string().min(1).max(20000),
        aiGenerated: z.boolean().default(false),
        instruction: z.string().max(4000).optional().nullable(),
        regenerations: z.number().int().min(0).max(99).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const o = await loadOrder(data.orderCode);
    const sb = await db();

    const { sendBrandedEmail } = await import("@/lib/email/template.server");
    const paragraphs = data.body.trim();

    const result = await sendBrandedEmail({
      to: data.to,
      cc: data.cc || null,
      subject: data.subject,
      replyTo: process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? undefined,
      params: {
        preview: data.subject,
        kicker: "TOREO",
        headline: data.subject,
        orderCode: o.order_code,
        intro: paragraphs,
      },
      context: { orderId: o.id, orderCode: o.order_code, emailType: "custom_message" },
    });

    // Enrich the history row written by sendBrandedEmail with assistant metadata.
    const { data: rows } = await sb
      .from("order_emails")
      .select("id")
      .eq("order_id", o.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const id = rows?.[0]?.id;
    if (id) {
      await sb
        .from("order_emails")
        .update({
          direction: "outbound",
          ai_generated: data.aiGenerated,
          ai_instruction: data.instruction ?? null,
          ai_regenerations: data.regenerations,
          body_text: data.body,
        })
        .eq("id", id);
    }

    return { ok: result.ok, error: result.error, messageId: result.messageId };
  });

// -------------------------------------------------------- duplicate review

export type IntakeReviewRow = {
  id: string;
  sender_email: string;
  sender_name: string | null;
  subject_raw: string | null;
  duplicate_class: string;
  duplicate_confidence: number;
  duplicate_reasons: string[];
  duplicate_of_order_id: string | null;
  process_result: string;
  review_state: string;
  order_id: string | null;
  received_at: string;
  matched_order_code?: string | null;
};

/** Intake records flagged as duplicates / needing a human decision. */
export const aiListDuplicates = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const sb = await db();
  const { data, error } = await sb
    .from("request_intake")
    .select(
      "id, sender_email, sender_name, subject_raw, duplicate_class, duplicate_confidence, duplicate_reasons, duplicate_of_order_id, process_result, review_state, order_id, received_at",
    )
    .neq("duplicate_class", "not_duplicate")
    .order("received_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as IntakeReviewRow[];
  const ids = [...new Set(rows.map((r) => r.duplicate_of_order_id).filter(Boolean))] as string[];
  if (ids.length) {
    const { data: orders } = await sb.from("orders").select("id, order_code").in("id", ids);
    const map = new Map<string, string>((orders ?? []).map((o: any) => [o.id as string, o.order_code as string]));
    for (const r of rows) r.matched_order_code = r.duplicate_of_order_id ? map.get(r.duplicate_of_order_id) ?? null : null;
  }
  return { rows };
});

/** Human decision on a flagged intake. Never merges data automatically. */
export const aiResolveDuplicate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["keep_new", "confirm_duplicate", "ignore"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const sb = await db();
    const patch: Record<string, unknown> = {
      review_state: data.action === "keep_new" ? "kept" : data.action === "confirm_duplicate" ? "merged" : "ignored",
      reviewed_at: new Date().toISOString(),
      reviewed_by: "admin",
    };
    if (data.action === "keep_new") patch["duplicate_class"] = "not_duplicate";
    const { error } = await sb.from("request_intake").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Counters for the dashboard "AI & EMAIL" panel. */
export const aiInboxStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const sb = await db();

  const count = async (table: string, build: (q: any) => any) => {
    const { count: c } = await build(sb.from(table).select("id", { count: "exact", head: true }));
    return c ?? 0;
  };

  const [newRequests, possibleDuplicates, skippedDuplicates, readyForQuote, waitingCustomer, failedEmails] =
    await Promise.all([
      count("orders", (q) => q.eq("status", "quote_received")),
      count("request_intake", (q) => q.eq("review_state", "pending").neq("duplicate_class", "not_duplicate")),
      count("request_intake", (q) => q.eq("process_result", "skipped_duplicate")),
      count("orders", (q) => q.eq("status", "engineering_review")),
      count("orders", (q) => q.eq("status", "awaiting_approval")),
      count("order_emails", (q) => q.eq("status", "failed")),
    ]);

  const { getAiUsage, getAiSettings } = await import("@/lib/ai/provider.server");
  const [usage, settings] = await Promise.all([getAiUsage(), getAiSettings()]);

  return {
    newRequests,
    possibleDuplicates,
    skippedDuplicates,
    readyForQuote,
    waitingCustomer,
    failedEmails,
    ai: { today: usage.today, month: usage.month, model: settings.model, enabled: settings.enabled },
  };
});
