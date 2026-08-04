// Admin email history API — cookie-session authed (ADMIN_PASSWORD).
// Backs the Order Details email timeline, the details drawer, the retry
// action and the dashboard delivery widget. Uses the service-role client;
// `order_emails` is not exposed to anon/authenticated roles.

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

const LIST_COLUMNS =
  "id, order_id, order_code, email_type, recipient, cc, sender, reply_to, subject, provider, provider_message_id, status, http_status, error_message, retry_count, attachments_count, sent_at, last_attempt_at, created_at";

export type OrderEmailRow = {
  id: string;
  order_id: string | null;
  order_code: string | null;
  email_type: string;
  recipient: string;
  cc: string | null;
  sender: string | null;
  reply_to: string | null;
  subject: string;
  provider: string;
  provider_message_id: string | null;
  status: "pending" | "sending" | "sent" | "failed";
  http_status: number | null;
  error_message: string | null;
  retry_count: number;
  attachments_count: number;
  sent_at: string | null;
  last_attempt_at: string | null;
  created_at: string;
};

/** Chronological email history for one order (by UUID or order code). */
export const adminListOrderEmails = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string().uuid().optional(), orderCode: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q: any = (supabaseAdmin as any).from("order_emails").select(LIST_COLUMNS);
    if (data.orderId) q = q.eq("order_id", data.orderId);
    else if (data.orderCode) q = q.eq("order_code", data.orderCode);
    else return { rows: [] as OrderEmailRow[] };
    const { data: rows, error } = await q.order("created_at", { ascending: true }).limit(500);
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as OrderEmailRow[] };
  });

/** Full detail for the drawer, including the stored HTML body. */
export const adminGetEmail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("order_emails")
      .select(`${LIST_COLUMNS}, html`)
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return { row: row as OrderEmailRow & { html: string | null } };
  });

/**
 * Retry a failed email by replaying the exact stored provider payload.
 *
 * Idempotency: a row that already carries a provider message ID, or whose
 * status is "sent", is never re-sent. The row is flipped to "sending" with a
 * conditional update (`.eq("status", "failed")`) so two concurrent retries
 * cannot both claim the same email.
 */
export const adminRetryEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const { data: row, error } = await sb
      .from("order_emails")
      .select("id, status, provider_message_id, payload, retry_count, subject")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    // Duplicate-send guard.
    if (row.status === "sent" || row.provider_message_id) {
      return { ok: false as const, skipped: true as const, error: "Already delivered — retry skipped." };
    }
    if (row.status === "sending") {
      return { ok: false as const, skipped: true as const, error: "A send is already in progress." };
    }

    const payload = row.payload ?? {};
    if (!payload || !payload.to || !payload.subject) {
      return { ok: false as const, error: "Original payload is missing — cannot retry this email." };
    }

    // Claim the row: only succeeds if it is still failed/pending.
    const { data: claimed, error: claimErr } = await sb
      .from("order_emails")
      .update({ status: "sending", last_attempt_at: new Date().toISOString() })
      .eq("id", row.id)
      .in("status", ["failed", "pending"])
      .select("id");
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed?.length) {
      return { ok: false as const, skipped: true as const, error: "Retry already claimed by another request." };
    }

    console.log(`[email] retry:start ${JSON.stringify({ id: row.id, attempt: (row.retry_count ?? 0) + 1 })}`);

    const { postEmailPayload } = await import("@/lib/email/template.server");
    const result = await postEmailPayload(payload, "retry");

    await sb
      .from("order_emails")
      .update({
        status: result.ok ? "sent" : "failed",
        provider_message_id: result.messageId ?? null,
        http_status: result.status ?? null,
        error_message: result.error ? result.error.slice(0, 4000) : null,
        sent_at: result.ok ? new Date().toISOString() : null,
        last_attempt_at: new Date().toISOString(),
        retry_count: (row.retry_count ?? 0) + 1,
      })
      .eq("id", row.id);

    return { ok: result.ok, error: result.error, messageId: result.messageId, status: result.status };
  });

/** Aggregate delivery stats for the admin dashboard widget. */
export const adminEmailStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const count = async (build: (q: any) => any) => {
    const { count: c } = await build(sb.from("order_emails").select("id", { count: "exact", head: true }));
    return c ?? 0;
  };

  const [sentToday, failed, pending, sending, totalSent, totalAll] = await Promise.all([
    count((q) => q.eq("status", "sent").gte("sent_at", startOfToday.toISOString())),
    count((q) => q.eq("status", "failed")),
    count((q) => q.eq("status", "pending")),
    count((q) => q.eq("status", "sending")),
    count((q) => q.eq("status", "sent")),
    count((q) => q),
  ]);

  const { data: last } = await sb
    .from("order_emails")
    .select("subject, recipient, sent_at, status, order_code")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    sentToday,
    failed,
    pending,
    sending,
    /** failed emails waiting to be retried */
    retryQueue: failed,
    lastSent: last ?? null,
    successRate: totalAll > 0 ? Math.round((totalSent / totalAll) * 100) : null,
  };
});
