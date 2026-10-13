// Admin Offer / Order Form documents — cookie-session authed (same as the admin panel).
// Flow: draft (auto-refreshed PDF) → approved (admin name + exact PDF hash) → sending → sent | failed.
// Nothing is ever sent automatically; sending requires an approved document whose
// PDF hash matches what the admin confirmed on screen.
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
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}
const BUCKET = "admin-documents";

async function signed(db: any, path: string | null) {
  if (!path) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

async function renderAndStore(db: any, row: any, fields: any) {
  const { renderDocument, sha256Hex } = await import("@/lib/admin-docs.server");
  const bytes = await renderDocument(row.doc_type, row.number, fields);
  const sha = await sha256Hex(bytes);
  const path = `${row.order_id}/${row.id}/${row.number}-${sha.slice(0, 12)}.pdf`;
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`Could not save PDF: ${error.message}`);
  return { path, sha };
}

export const docsListOrders = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const db = await admin();
  const { data, error } = await db
    .from("orders")
    .select("id, order_code, customer_name, customer_email, customer_phone, company, service, material, quantity, dimensions, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const docsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const db = await admin();
    let q = db.from("admin_documents")
      .select("id, doc_type, number, order_id, order_code, customer_name, customer_email, status, approved_by, approved_at, sent_at, email_error, recipient, updated_at, created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (data.order_id) q = q.eq("order_id", data.order_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const docsGet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const db = await admin();
    const { data: row, error } = await db.from("admin_documents").select("*").eq("id", data.id).single();
    if (error || !row) throw new Error("Document not found");
    return { ...row, pdf_url: await signed(db, row.pdf_path) };
  });

export const docsCreate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ doc_type: z.enum(["offer", "order_form"]), order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const db = await admin();
    const { defaultOffer, defaultOrderForm, documentNumber } = await import("@/lib/admin-docs");
    const { data: order, error: e0 } = await db.from("orders").select("*").eq("id", data.order_id).single();
    if (e0 || !order) throw new Error("Order not found");
    const { count } = await db.from("admin_documents").select("id", { count: "exact", head: true })
      .eq("order_id", order.id).eq("doc_type", data.doc_type);
    const fields = data.doc_type === "offer" ? defaultOffer(order) : defaultOrderForm(order);
    const { data: row, error } = await db.from("admin_documents").insert({
      doc_type: data.doc_type,
      number: documentNumber(order.order_code, count ?? 0),
      order_id: order.id,
      order_code: order.order_code,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      recipient: order.customer_email,
      fields,
      status: "draft",
    }).select("*").single();
    if (error) throw new Error(error.message);
    const { path, sha } = await renderAndStore(db, row, fields);
    await db.from("admin_documents").update({ pdf_path: path, pdf_sha256: sha, pdf_generated_at: new Date().toISOString() }).eq("id", row.id);
    return { id: row.id as string };
  });

export const docsSaveDraft = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), fields: z.record(z.string(), z.any()), recipient: z.string().max(320).optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const db = await admin();
    const { canEdit } = await import("@/lib/admin-docs");
    const { data: row } = await db.from("admin_documents").select("*").eq("id", data.id).single();
    if (!row) throw new Error("Document not found");
    if (!canEdit(row.status)) throw new Error(`A ${row.status} document can no longer be edited.`);
    const { path, sha } = await renderAndStore(db, row, data.fields);
    // Any edit returns the document to DRAFT and clears a previous approval.
    const { data: upd, error } = await db.from("admin_documents").update({
      fields: data.fields,
      recipient: data.recipient ?? row.recipient,
      pdf_path: path, pdf_sha256: sha, pdf_generated_at: new Date().toISOString(),
      status: "draft", approved_by: null, approved_at: null, approved_pdf_sha256: null, email_error: null,
    }).eq("id", row.id).in("status", ["draft", "approved", "failed"]).select("*").single();
    if (error || !upd) throw new Error("Document changed while saving — reload.");
    if (row.pdf_path && row.pdf_path !== path) await db.storage.from(BUCKET).remove([row.pdf_path]);
    return { ...upd, pdf_url: await signed(db, path) };
  });

export const docsApprove = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), approved_by: z.string().trim().min(2).max(120), pdf_sha256: z.string().length(64),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const db = await admin();
    const { data: upd } = await db.from("admin_documents").update({
      status: "approved", approved_by: data.approved_by, approved_at: new Date().toISOString(), approved_pdf_sha256: data.pdf_sha256,
    }).eq("id", data.id).eq("status", "draft").eq("pdf_sha256", data.pdf_sha256).select("id").maybeSingle();
    if (!upd) throw new Error("Only the current draft PDF you reviewed can be approved. Reload and review again.");
    return { ok: true };
  });

export const docsSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), recipient: z.string().email(), pdf_sha256: z.string().length(64),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const db = await admin();
    const { data: row } = await db.from("admin_documents").select("*").eq("id", data.id).single();
    if (!row) throw new Error("Document not found");
    if (row.status === "sent") return { ok: true, already: true };
    if (!row.approved_at || row.approved_pdf_sha256 !== row.pdf_sha256 || row.pdf_sha256 !== data.pdf_sha256)
      throw new Error("This exact PDF is not approved. Approve it first.");
    // Atomic claim — a second click finds status "sending" and stops here.
    const { data: claimed } = await db.from("admin_documents").update({
      status: "sending", recipient: data.recipient, send_attempts: (row.send_attempts ?? 0) + 1, email_error: null,
    }).eq("id", row.id).in("status", ["approved", "failed"]).eq("pdf_sha256", data.pdf_sha256).select("id").maybeSingle();
    if (!claimed) throw new Error("Already being sent or already sent.");

    const fail = async (msg: string) => {
      await db.from("admin_documents").update({ status: "failed", email_error: msg }).eq("id", row.id);
      return { ok: false, error: msg };
    };
    const { data: file, error: dErr } = await db.storage.from(BUCKET).download(row.pdf_path);
    if (dErr || !file) return fail("Could not read the approved PDF.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { sha256Hex, toBase64 } = await import("@/lib/admin-docs.server");
    if ((await sha256Hex(bytes)) !== row.approved_pdf_sha256) return fail("Stored PDF does not match the approved PDF.");

    const isOffer = row.doc_type === "offer";
    const title = isOffer ? "ΠΡΟΣΦΟΡΑ" : "ΔΕΛΤΙΟ ΠΑΡΑΓΓΕΛΙΑΣ";
    const subject = `${title} ${row.number} — TOREO`;
    const { sendBrandedEmail } = await import("@/lib/email/template.server");
    const res = await sendBrandedEmail({
      to: data.recipient,
      subject,
      params: {
        kicker: isOffer ? "QUOTATION" : "ORDER FORM",
        headline: title,
        orderCode: row.order_code,
        intro: `Αγαπητέ/ή ${row.customer_name ?? "πελάτη"}, σας επισυνάπτουμε ${isOffer ? "την προσφορά" : "το δελτίο παραγγελίας"} ${row.number}.`,
        outro: "Για οποιαδήποτε απορία είμαστε στη διάθεσή σας.",
      },
      attachments: [{ filename: `${isOffer ? "TOREO_PROSFORA" : "TOREO_DELTIO_PARAGGELIAS"}_${row.number}.pdf`, content: toBase64(bytes) }],
      context: { orderId: row.order_id, orderCode: row.order_code, emailType: isOffer ? "quote_sent" : "custom_message" },
    });
    if (!res.ok) return fail(res.error ?? "Email failed");
    await db.from("admin_documents").update({
      status: "sent", sent_at: new Date().toISOString(), email_subject: subject, email_message_id: res.messageId ?? null,
    }).eq("id", row.id);
    return { ok: true };
  });
