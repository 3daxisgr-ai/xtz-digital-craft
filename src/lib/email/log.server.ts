/**
 * Email history / delivery tracking.
 *
 * Every outgoing email in the app goes through `sendBrandedEmail`, which calls
 * into this module to persist a row in `public.order_emails` BEFORE the provider
 * request (status = "sending") and to finalise it afterwards (status = "sent" |
 * "failed"). The stored payload is the exact provider payload, so a retry can
 * replay the original email byte-for-byte instead of re-rendering it.
 *
 * Server-only. Uses the service-role client; the table is not exposed to the
 * Data API for anon/authenticated roles.
 */

export type EmailType =
  | "contact"
  | "quote_confirmation"
  | "admin_notification"
  | "quote_sent"
  | "quote_accepted"
  | "quote_declined"
  | "status_update"
  | "photo_approval"
  | "custom_message"
  | "system_test"
  | "other";

export type EmailStatus = "pending" | "sending" | "sent" | "failed";

export interface EmailLogContext {
  /** UUID of the related order, when known. */
  orderId?: string | null;
  /** Human order code (TR-YYYY-NNNN) for display when the UUID is unknown. */
  orderCode?: string | null;
  emailType?: EmailType;
}

/** Provider payload as sent to the gateway. */
export interface EmailProviderPayload {
  from: string;
  to: string[];
  cc?: string[];
  reply_to?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename: string; content: string }[];
}

function joinAddr(v: string | string[] | null | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v.join(", ") : v;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/**
 * Insert the "sending" history row. Never throws — email delivery must not be
 * blocked by a logging failure.
 */
export async function beginEmailLog(
  payload: EmailProviderPayload,
  ctx: EmailLogContext = {},
): Promise<string | null> {
  try {
    const supabase = await db();
    // Attachments are stripped from the stored payload copy: base64 blobs would
    // bloat the table. Retries re-send without attachments unless re-rendered.
    const { attachments, ...storable } = payload;
    const { data, error } = await supabase
      .from("order_emails")
      .insert({
        order_id: ctx.orderId ?? null,
        order_code: ctx.orderCode ?? null,
        email_type: ctx.emailType ?? "other",
        recipient: joinAddr(payload.to) ?? "",
        cc: joinAddr(payload.cc),
        sender: payload.from,
        reply_to: payload.reply_to ?? null,
        subject: payload.subject,
        provider: "resend",
        status: "sending",
        attachments_count: attachments?.length ?? 0,
        html: payload.html ?? null,
        payload: storable,
        last_attempt_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      console.error(`[email:ERROR] log:begin ${error.message}`);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error(`[email:ERROR] log:begin ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** Finalise a history row after the provider responded (or threw). */
export async function completeEmailLog(
  id: string | null,
  result: { ok: boolean; messageId?: string; status?: number; error?: string },
): Promise<void> {
  if (!id) return;
  try {
    const supabase = await db();
    const { error } = await supabase
      .from("order_emails")
      .update({
        status: result.ok ? "sent" : "failed",
        provider_message_id: result.messageId ?? null,
        http_status: result.status ?? null,
        error_message: result.error ? result.error.slice(0, 4000) : null,
        sent_at: result.ok ? new Date().toISOString() : null,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) console.error(`[email:ERROR] log:complete ${error.message}`);
  } catch (e) {
    console.error(`[email:ERROR] log:complete ${e instanceof Error ? e.message : String(e)}`);
  }
}
