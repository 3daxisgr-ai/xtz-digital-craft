// Server-only implementation of the TOREO quotation (Quote PDF) workflow.
// Admin-cookie protected, service-role backed. Never imported by client code.
import { useSession, getRequest } from "@tanstack/react-start/server";
import { computeTotals, emptyLine, type QuoteLine } from "@/lib/quote-calc";
import fontRegularAsset from "@/assets/DejaVuSans.ttf.asset.json";
import fontBoldAsset from "@/assets/DejaVuSans-Bold.ttf.asset.json";
import logoAsset from "@/assets/toreo-white-logo.png.asset.json";

type AdminSession = { authed?: boolean };

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

export async function requireAdmin() {
  const s = await useSession<AdminSession>(sessionConfig());
  if (!s.data.authed) throw new Error("Unauthorized");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const COMPANY_DEFAULTS = {
  address: "ΕΟ2, 19ο χλμ Π.Ε.Ο. Θεσσαλονίκης - Καβάλας, Λαγκαδάς 572 00",
  phone: "6947925155",
  email: "info@toreo.gr",
  website: "toreo.gr",
  vat: "",
  legal: "",
};

export async function getCompanyInfo() {
  const sb = await admin();
  const { data } = await sb.from("factory_settings").select("company_info").limit(1).maybeSingle();
  const ci = ((data as any)?.company_info ?? {}) as Record<string, string>;
  return {
    address: ci.address || COMPANY_DEFAULTS.address,
    phone: ci.phone || COMPANY_DEFAULTS.phone,
    email: ci.email || COMPANY_DEFAULTS.email,
    website: ci.website || COMPANY_DEFAULTS.website,
    vat: ci.vat || COMPANY_DEFAULTS.vat,
    legal: ci.legal || COMPANY_DEFAULTS.legal,
  };
}

function hash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = (h1 ^ s.charCodeAt(i)) >>> 0;
    h1 = (h1 * 16777619) >>> 0;
    h2 = (h2 + s.charCodeAt(i) * (i + 7)) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
}

/** Fields of the order the quotation depends on. */
export function orderSignature(o: any): string {
  return hash(
    JSON.stringify({
      customer_name: o.customer_name ?? null,
      customer_email: o.customer_email ?? null,
      customer_phone: o.customer_phone ?? null,
      company: o.company ?? null,
      service: o.service ?? null,
      material: o.material ?? null,
      dimensions: o.dimensions ?? null,
      quantity: o.quantity ?? null,
      quote_price: o.quote_price ?? null,
      currency: o.currency ?? "EUR",
      message: o.message ?? null,
    }),
  );
}

/** Full signature = order data + the editable content of the quotation. */
export function fullSignature(order: any, doc: any): string {
  return hash(
    orderSignature(order) +
      "|" +
      JSON.stringify({
        lines: doc.lines ?? [],
        project: doc.project ?? {},
        terms: doc.terms ?? {},
        financial: doc.financial_snapshot ?? {},
        customer: doc.customer_snapshot ?? {},
        image: doc.image_data_url ? hash(doc.image_data_url) : null,
      }),
  );
}

export async function getOrderByCode(code: string) {
  const sb = await admin();
  const { data, error } = await sb.from("orders").select("*").eq("order_code", code).single();
  if (error || !data) throw new Error("Order not found");
  return data as any;
}

/** Latest accept/decline decision for the order (null when never decided). */
export async function latestDecision(orderId: string) {
  const sb = await admin();
  const { data } = await sb
    .from("quote_decisions" as any)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any) ?? null;
}

export type QuoteDecisionStatus = "new" | "pending_review" | "accepted" | "accepted_price_updated" | "declined";

export async function decisionStatus(order: any): Promise<QuoteDecisionStatus> {
  const d = await latestDecision(order.id);
  if (!d) return order.status === "engineering_review" ? "pending_review" : "new";
  if (d.new_status === "declined") return "declined";
  if (d.new_status === "accepted") {
    const accepted = Number(d.accepted_price ?? 0);
    const current = Number(order.quote_price ?? 0);
    return Math.abs(accepted - current) > 0.005 ? "accepted_price_updated" : "accepted";
  }
  return "pending_review";
}

export async function isInternallyAccepted(order: any): Promise<boolean> {
  const s = await decisionStatus(order);
  return s === "accepted" || s === "accepted_price_updated";
}

// ---------------------------------------------------------------- documents

function seedProject(order: any) {
  const meta = (order.metadata ?? {}) as any;
  return {
    title: meta.project_title ?? meta.title ?? "",
    description: order.message ?? "",
    service: order.service ?? "",
    material: order.material ?? "",
    dimensions: order.dimensions ?? meta.dimensions ?? "",
    thickness: meta.thickness ?? "",
    tolerance: meta.tolerance ?? "",
    drawing_code: meta.drawing_code ?? "",
    extra: meta.technical_notes ?? "",
  };
}

function seedLine(order: any): QuoteLine {
  const desc =
    [order.service, order.material].filter(Boolean).join(" · ") || `Order ${order.order_code}`;
  const qty = Number(String(order.quantity ?? "1").replace(/[^\d.]/g, "")) || 1;
  return {
    ...emptyLine(),
    id: "auto-1",
    description: desc,
    qty,
    unit: "pcs",
    unit_price: qty > 0 ? Number(order.quote_price ?? 0) / qty : Number(order.quote_price ?? 0),
    discount_pct: 0,
    vat_pct: 24,
    auto_managed: true,
  };
}

export async function createQuoteDoc(orderCode: string, replacesNumber?: string | null) {
  const sb = await admin();
  const order = await getOrderByCode(orderCode);
  if (!(await isInternallyAccepted(order))) {
    throw new Error("Quote PDF is available only after the request has been accepted internally.");
  }

  if (!replacesNumber) {
    const { data: open } = await sb
      .from("quote_documents" as any)
      .select("*")
      .eq("order_id", order.id)
      .in("status", ["draft", "generated"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open) return open as any;
  }

  let replaces: any = null;
  if (replacesNumber) {
    const { data } = await sb.from("quote_documents" as any).select("*").eq("number", replacesNumber).maybeSingle();
    replaces = data ?? null;
  }

  const { data: num, error: eNum } = await sb.rpc("next_quote_number" as any);
  if (eNum || !num) throw new Error("Could not allocate a quotation number");
  const row = Array.isArray(num) ? (num as any[])[0] : (num as any);

  const terms = replaces?.terms ?? {
    payment_terms: "50% προκαταβολή / 50% πριν την αποστολή",
    delivery_time: "",
    validity: "15 ημέρες",
    notes: "",
    deposit_pct: 50,
    paid: 0,
    lang: "el",
  };

  const { data: doc, error } = await sb
    .from("quote_documents" as any)
    .insert({
      number: row.number,
      seq: row.seq,
      order_id: order.id,
      replaces_quote_id: replaces?.id ?? null,
      customer_snapshot: {
        name: order.customer_name,
        company: order.company,
        email: order.customer_email,
        phone: order.customer_phone,
        vat: (order.metadata as any)?.vat_id ?? "",
        address: (order.metadata as any)?.billing_address ?? "",
      },
      order_snapshot: { order_code: order.order_code, status: order.status, currency: order.currency ?? "EUR" },
      financial_snapshot: computeTotals(replaces?.lines ?? [seedLine(order)], {
        depositPct: Number(terms.deposit_pct) || 0,
        paid: Number(terms.paid) || 0,
      }),
      lines: replaces?.lines ?? [seedLine(order)],
      project: replaces?.project ?? seedProject(order),
      terms,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;

  if (replaces) {
    await sb.from("quote_documents" as any).update({ status: "replaced" }).eq("id", replaces.id);
  }
  return doc as any;
}

export async function getQuoteDoc(number: string) {
  const sb = await admin();
  const { data: doc, error } = await sb.from("quote_documents" as any).select("*").eq("number", number).single();
  if (error || !doc) throw new Error("Quotation not found");
  const { data: order } = await sb.from("orders").select("*").eq("id", (doc as any).order_id).single();
  const company = await getCompanyInfo();
  const current = order ? fullSignature(order, doc) : null;
  const outdated = Boolean((doc as any).pdf_path) && current !== (doc as any).data_signature;
  const decision = order ? await decisionStatus(order) : "new";
  return { doc, order, company, outdated, decision };
}

export async function listQuoteDocs(orderCode: string) {
  const sb = await admin();
  const { data: order } = await sb.from("orders").select("id").eq("order_code", orderCode).maybeSingle();
  if (!order) return [];
  const { data } = await sb
    .from("quote_documents" as any)
    .select("id,number,status,pdf_path,pdf_generated_at,sent_at,email_status,email_error,financial_snapshot,created_at,replaces_quote_id")
    .eq("order_id", (order as any).id)
    .order("seq", { ascending: false });
  return data ?? [];
}

const EDITABLE = ["draft", "generated"];

export async function updateQuoteDoc(number: string, patch: Record<string, any>) {
  const sb = await admin();
  const { data: doc } = await sb.from("quote_documents" as any).select("*").eq("number", number).single();
  if (!doc) throw new Error("Quotation not found");
  if (!EDITABLE.includes((doc as any).status)) {
    throw new Error("This quotation has already been sent or closed and can no longer be edited.");
  }
  const lines: QuoteLine[] = (patch.lines ?? (doc as any).lines ?? []) as QuoteLine[];
  const terms = patch.terms ?? (doc as any).terms ?? {};
  const next: Record<string, any> = {
    ...patch,
    financial_snapshot: computeTotals(lines, {
      depositPct: Number(terms.deposit_pct) || 0,
      paid: Number(terms.paid) || 0,
    }),
  };
  // Editing invalidates a previously generated PDF.
  if ((doc as any).status === "generated") next.status = "draft";
  const { data, error } = await sb
    .from("quote_documents" as any)
    .update(next)
    .eq("id", (doc as any).id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Pull the latest saved order data into an unsent draft.
 * Manually added lines are never touched; only the auto-managed line follows the order.
 */
export async function syncQuoteDoc(number: string) {
  const sb = await admin();
  const { data: doc } = await sb.from("quote_documents" as any).select("*").eq("number", number).single();
  if (!doc) throw new Error("Quotation not found");
  if (!EDITABLE.includes((doc as any).status)) return { ok: false, reason: "locked" };
  const { data: order } = await sb.from("orders").select("*").eq("id", (doc as any).order_id).single();
  if (!order) throw new Error("Order not found");

  const seeded = seedLine(order);
  const lines: QuoteLine[] = ((doc as any).lines ?? []).map((l: QuoteLine) =>
    l.auto_managed
      ? { ...l, description: seeded.description, qty: seeded.qty, unit_price: seeded.unit_price }
      : l,
  );
  const project = { ...seedProject(order), ...stripEmpty((doc as any).project ?? {}) };
  const terms = (doc as any).terms ?? {};

  const { data, error } = await sb
    .from("quote_documents" as any)
    .update({
      lines,
      project: { ...project, ...orderOwned(order) },
      customer_snapshot: {
        name: order.customer_name,
        company: order.company,
        email: order.customer_email,
        phone: order.customer_phone,
        vat: (order.metadata as any)?.vat_id ?? (doc as any).customer_snapshot?.vat ?? "",
        address: (order.metadata as any)?.billing_address ?? (doc as any).customer_snapshot?.address ?? "",
      },
      financial_snapshot: computeTotals(lines, {
        depositPct: Number(terms.deposit_pct) || 0,
        paid: Number(terms.paid) || 0,
      }),
      status: "draft",
    })
    .eq("id", (doc as any).id)
    .select("*")
    .single();
  if (error) throw error;
  return { ok: true, doc: data };
}

function stripEmpty(o: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined && v !== "") out[k] = v;
  return out;
}
function orderOwned(order: any) {
  return { service: order.service ?? "", material: order.material ?? "" };
}

// ---------------------------------------------------------------- pdf

let FONT_CACHE: { regular: Uint8Array; bold: Uint8Array } | null = null;
let LOGO_CACHE: Uint8Array | null = null;

function origin(): string {
  try {
    const req = getRequest();
    return new URL(req.url).origin;
  } catch {
    return "https://www.toreo.gr";
  }
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`asset fetch failed ${r.status} ${url}`);
  return new Uint8Array(await r.arrayBuffer());
}

async function loadFonts() {
  if (FONT_CACHE) return FONT_CACHE;
  const base = origin();
  const [regular, bold] = await Promise.all([
    fetchBytes(new URL(fontRegularAsset.url, base).toString()),
    fetchBytes(new URL(fontBoldAsset.url, base).toString()),
  ]);
  FONT_CACHE = { regular, bold };
  return FONT_CACHE;
}

async function loadLogo(): Promise<Uint8Array | null> {
  if (LOGO_CACHE) return LOGO_CACHE;
  try {
    LOGO_CACHE = await fetchBytes(new URL(logoAsset.url, origin()).toString());
    return LOGO_CACHE;
  } catch {
    return null;
  }
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; kind: "png" | "jpg" } | null {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, kind: m[1].toLowerCase().startsWith("png") ? "png" : "jpg" };
}

export async function buildQuotePdfBytes(number: string): Promise<{ bytes: Uint8Array; doc: any; order: any }> {
  const sb = await admin();
  const { data: doc } = await sb.from("quote_documents" as any).select("*").eq("number", number).single();
  if (!doc) throw new Error("Quotation not found");
  const { data: order } = await sb.from("orders").select("*").eq("id", (doc as any).order_id).single();
  if (!order) throw new Error("Order not found");
  const company = await getCompanyInfo();
  const fonts = await loadFonts();
  const logo = await loadLogo();
  const terms = ((doc as any).terms ?? {}) as any;
  const { renderQuotePdf } = await import("@/lib/pdf/quote-pdf.server");

  const bytes = await renderQuotePdf({
    lang: terms.lang === "en" ? "en" : "el",
    number: (doc as any).number,
    issueDate: new Date((doc as any).created_at).toLocaleDateString("el-GR"),
    orderReference: order.order_code ?? "",
    validity: terms.validity ?? "",
    company,
    customer: (doc as any).customer_snapshot ?? {},
    project: (doc as any).project ?? {},
    lines: ((doc as any).lines ?? []) as QuoteLine[],
    currency: (order.currency as string) ?? "EUR",
    depositPct: Number(terms.deposit_pct) || 0,
    paid: Number(terms.paid) || 0,
    terms: {
      payment_terms: terms.payment_terms ?? "",
      delivery_time: terms.delivery_time ?? "",
      notes: terms.notes ?? "",
    },
    image: (doc as any).image_data_url ? decodeDataUrl((doc as any).image_data_url) : null,
    logo,
    fontRegular: fonts.regular,
    fontBold: fonts.bold,
  });
  return { bytes, doc, order };
}

export async function generateQuotePdf(number: string) {
  const sb = await admin();
  const { bytes, doc, order } = await buildQuotePdfBytes(number);
  if (!EDITABLE.includes((doc as any).status)) {
    throw new Error("This quotation is closed and cannot be regenerated. Create a new quotation instead.");
  }
  const path = `${order.order_code}/${(doc as any).number}.pdf`;
  const up = await sb.storage.from("quote-pdfs").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) throw up.error;

  const { data, error } = await sb
    .from("quote_documents" as any)
    .update({
      pdf_path: path,
      pdf_generated_at: new Date().toISOString(),
      data_signature: fullSignature(order, doc),
      status: "generated",
    })
    .eq("id", (doc as any).id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Signed URL for previewing / downloading the stored PDF. */
export async function quotePdfUrl(number: string) {
  const sb = await admin();
  const { data: doc } = await sb.from("quote_documents" as any).select("pdf_path").eq("number", number).single();
  if (!doc || !(doc as any).pdf_path) throw new Error("No PDF has been generated yet.");
  const { data, error } = await sb.storage.from("quote-pdfs").createSignedUrl((doc as any).pdf_path, 60 * 15);
  if (error || !data) throw new Error("Could not create a download link");
  return data.signedUrl;
}

/** Inline preview: renders without persisting anything. */
export async function previewQuotePdfBase64(number: string) {
  const { bytes } = await buildQuotePdfBytes(number);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// ---------------------------------------------------------------- sending

export function quoteEmailDefaults(lang: "el" | "en", v: Record<string, string>) {
  if (lang === "en") {
    return {
      subject: `TOREO Quotation – ${v.quote_number} – ${v.order_reference}`,
      body: `Hello,

Please find attached our quotation for your project with reference ${v.order_reference}.

Quotation number: ${v.quote_number}
Total amount: ${v.grand_total}
Quotation validity: ${v.quote_validity}
Estimated delivery time: ${v.delivery_time}

For any questions, you may reply directly to this email.

Kind regards,
TOREO
info@toreo.gr
toreo.gr`,
    };
  }
  return {
    subject: `Προσφορά TOREO – ${v.quote_number} – ${v.order_reference}`,
    body: `Καλησπέρα σας,

Σας αποστέλλουμε συνημμένη την προσφορά μας για το έργο σας με κωδικό ${v.order_reference}.

Αριθμός προσφοράς: ${v.quote_number}
Συνολικό ποσό: ${v.grand_total}
Ισχύς προσφοράς: ${v.quote_validity}
Εκτιμώμενος χρόνος παράδοσης: ${v.delivery_time}

Για οποιαδήποτε διευκρίνιση, μπορείτε να απαντήσετε απευθείας σε αυτό το email.

Με εκτίμηση,
TOREO
info@toreo.gr
toreo.gr`,
  };
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export async function sendQuoteDoc(input: {
  number: string;
  recipient: string;
  cc?: string | null;
  subject: string;
  body: string;
}) {
  const sb = await admin();
  const { data: doc } = await sb.from("quote_documents" as any).select("*").eq("number", input.number).single();
  if (!doc) throw new Error("Quotation not found");
  const d = doc as any;

  if (d.status === "cancelled" || d.status === "replaced") throw new Error("This quotation is no longer active.");
  if (d.status === "sent" && d.email_status === "sent") throw new Error("This quotation has already been sent.");
  if (!d.pdf_path) throw new Error("Generate the PDF before sending.");

  const { data: order } = await sb.from("orders").select("*").eq("id", d.order_id).single();
  if (!order) throw new Error("Order not found");
  if (!(await isInternallyAccepted(order))) throw new Error("The request has not been accepted internally.");
  if (fullSignature(order, d) !== d.data_signature) {
    throw new Error(
      "The order has changed since this Quote PDF was generated. Generate the updated PDF before sending.",
    );
  }

  const dl = await sb.storage.from("quote-pdfs").download(d.pdf_path);
  if (dl.error || !dl.data) throw new Error("Stored PDF could not be read.");
  const bytes = new Uint8Array(await dl.data.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  const base64 = btoa(bin);

  const terms = (d.terms ?? {}) as any;
  const fin = (d.financial_snapshot ?? {}) as any;
  const lang: "el" | "en" = terms.lang === "en" ? "en" : "el";

  const { sendBrandedEmail } = await import("@/lib/email/template.server");
  const r = await sendBrandedEmail({
    to: input.recipient,
    cc: input.cc || null,
    replyTo: "INFO@TOREO.GR",
    subject: input.subject,
    attachments: [{ filename: `${d.number}.pdf`, content: base64 }],
    params: {
      kicker: lang === "el" ? "ΠΡΟΣΦΟΡΑ" : "QUOTATION",
      headline: lang === "el" ? `Προσφορά ${d.number}` : `Quotation ${d.number}`,
      orderCode: order.order_code,
      intro: `<p style="margin:0;white-space:pre-wrap">${escapeHtml(input.body)}</p>`,
      sections: [
        {
          title: lang === "el" ? "Σύνοψη" : "Summary",
          rows: [
            { label: lang === "el" ? "Αριθμός προσφοράς" : "Quotation number", value: d.number },
            { label: lang === "el" ? "Συνολικό ποσό" : "Total amount", value: `${Number(fin.total ?? 0).toFixed(2)} €` },
            { label: lang === "el" ? "Ισχύς" : "Validity", value: terms.validity ?? "" },
            { label: lang === "el" ? "Χρόνος παράδοσης" : "Delivery time", value: terms.delivery_time ?? "" },
          ],
        },
      ],
    },
  });

  await sb
    .from("quote_documents" as any)
    .update({
      status: r.ok ? "sent" : d.status,
      recipient: input.recipient,
      cc: input.cc,
      email_subject: input.subject,
      email_body: input.body,
      sent_at: r.ok ? new Date().toISOString() : d.sent_at,
      email_status: r.ok ? "sent" : "failed",
      email_message_id: r.messageId ?? null,
      email_error: r.ok ? null : (r.error ?? "Unknown error"),
      admin_user: "admin",
    })
    .eq("id", d.id);

  if (!r.ok) throw new Error(r.error ?? "Email sending failed");
  return { ok: true, messageId: r.messageId ?? null };
}

export async function setQuoteDocStatus(number: string, status: string) {
  const sb = await admin();
  const allowed = ["accepted_by_customer", "rejected_by_customer", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  const { data, error } = await sb
    .from("quote_documents" as any)
    .update({ status })
    .eq("number", number)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
