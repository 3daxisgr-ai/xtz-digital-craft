/**
 * Intake ledger — connects the deterministic duplicate classifier
 * (src/lib/intake/dedupe.ts) to the public.request_intake table so that every
 * incoming request is screened before an order is created.
 *
 * Server-only: uses the service-role client and node crypto.
 */

import {
  buildIdentity,
  classifyDuplicate,
  normalizeBody,
  type CandidateRecord,
  type DuplicateVerdict,
  type IntakeInput,
} from "./dedupe";

const WINDOW_MS = 1000 * 60 * 60 * 24 * 21;

export interface ScreenInput extends IntakeInput {
  senderName?: string | null;
  channel?: string;
  providerMessageId?: string | null;
  messageIdHeader?: string | null;
  threadId?: string | null;
  raw?: Record<string, unknown>;
}

export interface ScreenResult {
  identity: ReturnType<typeof buildIdentity>;
  verdict: DuplicateVerdict;
  /** Existing order the request duplicates (only when verdict.block is true). */
  existingOrder: { id: string | null; code: string | null } | null;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Classify an incoming request against the ledger. Never throws. */
export async function screenIntake(input: ScreenInput): Promise<ScreenResult> {
  const identity = buildIdentity(input);
  const empty: ScreenResult = {
    identity,
    verdict: { duplicateClass: "not_duplicate", confidence: 0, match: null, reasons: [], block: false, review: false },
    existingOrder: null,
  };

  try {
    const supabase = await admin();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data } = await supabase
      .from("request_intake")
      .select(
        "id, order_id, sender_email, subject_normalized, body_hash, attachments_hash, fingerprint, provider_message_id, message_id_header, received_at",
      )
      .eq("sender_email", identity.senderEmail)
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(50);

    const candidates: CandidateRecord[] = (data ?? []).map((r: any) => ({
      intakeId: r.id,
      orderId: r.order_id,
      senderEmail: r.sender_email,
      subjectNormalized: r.subject_normalized ?? "",
      bodyHash: r.body_hash ?? "",
      attachmentsHash: r.attachments_hash,
      fingerprint: r.fingerprint,
      providerMessageId: r.provider_message_id,
      messageIdHeader: r.message_id_header,
      receivedAt: r.received_at,
    }));

    const verdict = classifyDuplicate(
      {
        ...identity,
        providerMessageId: input.providerMessageId ?? null,
        messageIdHeader: input.messageIdHeader ?? null,
        bodyNormalized: normalizeBody(input.body),
        receivedAt: new Date().toISOString(),
      },
      candidates,
    );

    let existingOrder: ScreenResult["existingOrder"] = null;
    if (verdict.block && verdict.match?.orderId) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, order_code")
        .eq("id", verdict.match.orderId)
        .maybeSingle();
      existingOrder = order ? { id: order.id, code: order.order_code } : null;
    }

    return { identity, verdict, existingOrder };
  } catch (e) {
    console.error("[intake] screening failed, allowing request through", e);
    return empty;
  }
}

/** Write the intake row. Never throws; unique-fingerprint conflicts are ignored. */
export async function recordIntake(
  input: ScreenInput,
  screen: ScreenResult,
  refs: { orderId?: string | null; submissionId?: string | null; processResult: string },
): Promise<void> {
  try {
    const supabase = await admin();
    const { identity, verdict } = screen;
    await supabase.from("request_intake").upsert(
      {
        channel: input.channel ?? "web_form",
        provider_message_id: input.providerMessageId ?? null,
        message_id_header: input.messageIdHeader ?? null,
        thread_id: input.threadId ?? null,
        sender_email: identity.senderEmail,
        sender_name: input.senderName ?? null,
        subject_raw: identity.subjectRaw ?? null,
        subject_normalized: identity.subjectNormalized,
        body_hash: identity.bodyHash,
        attachments_hash: identity.attachmentsHash,
        fingerprint: identity.fingerprint,
        raw: (input.raw ?? {}) as never,
        order_id: refs.orderId ?? null,
        submission_id: refs.submissionId ?? null,
        duplicate_class: verdict.duplicateClass,
        duplicate_confidence: verdict.confidence,
        duplicate_of_intake_id: verdict.match?.intakeId ?? null,
        duplicate_of_order_id: verdict.match?.orderId ?? null,
        duplicate_reasons: verdict.reasons as never,
        process_result: refs.processResult,
        review_state: verdict.review ? "pending" : "none",
      },
      { onConflict: "fingerprint", ignoreDuplicates: true },
    );
  } catch (e) {
    console.error("[intake] ledger write failed", e);
  }
}
