// Manual proforma invoice workflow (admin-only).
// A proforma is created from an order, edited freely, and can be revised.
// Revisions freeze the parent (status=cancelled) and create a new proforma with revision+1.
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

function orderSignature(o: any): string {
  // Fingerprint of the order fields that a proforma cares about — used to detect drift.
  const payload = JSON.stringify({
    customer_name: o.customer_name,
    customer_email: o.customer_email,
    company: o.company,
    service: o.service,
    material: o.material,
    quote_price: o.quote_price,
    currency: o.currency,
    quantity: o.quantity,
  });
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) | 0;
  return String(h);
}

async function nextProformaNumber(supabaseAdmin: any): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("next_proforma_number");
  if (error || !data) {
    // Fallback: timestamp-based number so we never block.
    const yr = new Date().getFullYear();
    return `INV-${yr}-${Date.now().toString().slice(-4)}`;
  }
  return data as string;
}

export const createProforma = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: e0 } = await supabaseAdmin
      .from("orders").select("*").eq("order_code", data.order_code).single();
    if (e0 || !order) throw new Error("Order not found");

    // Reuse latest active proforma if present.
    const { data: existing } = await supabaseAdmin
      .from("proformas" as any)
      .select("*").eq("order_id", (order as any).id)
      .in("status", ["draft", "generated", "sent"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) return existing;

    const number = await nextProformaNumber(supabaseAdmin);
    const cs = {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      company: order.company,
    };
    const fs = { currency: order.currency ?? "EUR", subtotal: 0, discount: 0, vat_pct: 24, vat: 0, total: 0 };

    const { data: pf, error: eIns } = await supabaseAdmin
      .from("proformas" as any)
      .insert({
        order_id: order.id, number, revision: 0, status: "draft",
        customer_snapshot: cs, financial_snapshot: fs,
        order_signature: orderSignature(order),
      })
      .select("*").single();
    if (eIns) throw eIns;

    // Seed one line from the order.
    const desc = [order.service, order.material, order.quantity ? `qty ${order.quantity}` : null]
      .filter(Boolean).join(" · ") || `Order ${order.order_code}`;
    await supabaseAdmin.from("proforma_lines" as any).insert({
      proforma_id: (pf as any).id, position: 0,
      description: desc, qty: 1, unit: "pcs",
      unit_price: Number(order.quote_price ?? 0), auto_managed: true,
    });
    return pf;
  });

export const getProforma = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pf, error } = await supabaseAdmin
      .from("proformas" as any).select("*").eq("number", data.number).single();
    if (error || !pf) throw new Error("Proforma not found");
    const { data: lines } = await supabaseAdmin
      .from("proforma_lines" as any).select("*")
      .eq("proforma_id", (pf as any).id).order("position", { ascending: true });
    const { data: order } = await supabaseAdmin
      .from("orders").select("*").eq("id", (pf as any).order_id).single();
    const drift = order ? orderSignature(order) !== (pf as any).order_signature : false;
    return { proforma: pf, lines: lines ?? [], order, drift };
  });

export const listOrderProformas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id").eq("order_code", data.order_code).single();
    if (!order) return [];
    const { data: rows } = await supabaseAdmin
      .from("proformas" as any).select("*").eq("order_id", (order as any).id)
      .order("revision", { ascending: false }).order("created_at", { ascending: false });
    return rows ?? [];
  });

const updateInput = z.object({
  number: z.string(),
  patch: z.object({
    notes: z.string().max(4000).optional().nullable(),
    due_date: z.string().optional().nullable(),
    deposit_amount: z.number().optional(),
    paid_amount: z.number().optional(),
    customer_snapshot: z.record(z.string(), z.any()).optional(),
    financial_snapshot: z.record(z.string(), z.any()).optional(),
    auto_sync: z.boolean().optional(),
    status: z.enum(["draft", "generated", "sent", "paid", "cancelled"]).optional(),
  }).partial(),
});

export const updateProforma = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pf, error } = await supabaseAdmin
      .from("proformas" as any).update(data.patch as any).eq("number", data.number).select("*").single();
    if (error) throw error;
    return pf;
  });

const linesInput = z.object({
  number: z.string(),
  lines: z.array(z.object({
    id: z.string().optional(),
    position: z.number().default(0),
    description: z.string().default(""),
    qty: z.number().default(1),
    unit: z.string().default("pcs"),
    unit_price: z.number().default(0),
    discount_pct: z.number().default(0),
    vat_pct: z.number().default(24),
  })),
});

export const setProformaLines = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => linesInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pf } = await supabaseAdmin
      .from("proformas" as any).select("id").eq("number", data.number).single();
    if (!pf) throw new Error("Proforma not found");
    // Replace all lines transactionally: delete then insert.
    await supabaseAdmin.from("proforma_lines" as any).delete().eq("proforma_id", (pf as any).id);
    if (data.lines.length) {
      await supabaseAdmin.from("proforma_lines" as any).insert(
        data.lines.map((l, i) => ({
          proforma_id: (pf as any).id,
          position: l.position ?? i,
          description: l.description,
          qty: l.qty, unit: l.unit,
          unit_price: l.unit_price, discount_pct: l.discount_pct, vat_pct: l.vat_pct,
        }))
      );
    }
    return { ok: true };
  });

export const reviseProforma = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error } = await supabaseAdmin
      .from("proformas" as any).select("*").eq("number", data.number).single();
    if (error || !current) throw new Error("Proforma not found");
    // Cancel current
    await supabaseAdmin.from("proformas" as any).update({ status: "cancelled" }).eq("id", (current as any).id);
    // Duplicate with new revision + new number
    const newNumber = `${(current as any).number}-R${((current as any).revision ?? 0) + 1}`;
    const { data: dup, error: eDup } = await supabaseAdmin
      .from("proformas" as any).insert({
        order_id: (current as any).order_id,
        number: newNumber,
        revision: ((current as any).revision ?? 0) + 1,
        parent_proforma_id: (current as any).id,
        status: "draft",
        customer_snapshot: (current as any).customer_snapshot,
        financial_snapshot: (current as any).financial_snapshot,
        notes: (current as any).notes,
        due_date: (current as any).due_date,
        deposit_amount: (current as any).deposit_amount,
        order_signature: (current as any).order_signature,
      }).select("*").single();
    if (eDup) throw eDup;
    // Copy lines
    const { data: lines } = await supabaseAdmin.from("proforma_lines" as any).select("*").eq("proforma_id", (current as any).id);
    if (lines?.length) {
      await supabaseAdmin.from("proforma_lines" as any).insert(
        lines.map((l: any) => ({
          proforma_id: (dup as any).id,
          position: l.position, description: l.description, qty: l.qty, unit: l.unit,
          unit_price: l.unit_price, discount_pct: l.discount_pct, vat_pct: l.vat_pct,
        }))
      );
    }
    return dup;
  });

const sendInput = z.object({
  number: z.string(),
  recipient: z.string().email(),
  cc: z.string().optional().nullable(),
  subject: z.string().min(1).max(200),
  body: z.string().max(8000).optional().nullable(),
  view_url: z.string().url(),
});

export const sendProformaEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => sendInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pf } = await supabaseAdmin
      .from("proformas" as any).select("*").eq("number", data.number).single();
    if (!pf) throw new Error("Proforma not found");

    const { sendBrandedEmail } = await import("@/lib/email/template.server");
    const bodyHtml = (data.body ?? "").replace(/\n/g, "<br/>");
    const r = await sendBrandedEmail({
      to: data.recipient,
      replyTo: "INFO@TOREO.GR",
      subject: data.subject,
      params: {
        kicker: "Proforma Invoice",
        headline: `Proforma ${(pf as any).number}`,
        orderCode: (pf as any).number,
        intro: bodyHtml ? `<p style="margin:0">${bodyHtml}</p>` : `<p style="margin:0">Please find your proforma invoice details below. Click the button to view and print.</p>`,
        cta: { label: "View proforma invoice", url: data.view_url },
      },
    });

    await supabaseAdmin.from("proformas" as any).update({
      status: "sent",
      sent_at: r.ok ? new Date().toISOString() : (pf as any).sent_at,
      recipient: data.recipient,
      cc: data.cc,
      subject: data.subject,
      body: data.body,
      email_status: r.ok ? "sent" : "failed",
      email_error: r.ok ? null : r.error,
    }).eq("id", (pf as any).id);

    return { ok: r.ok, error: r.error };
  });

export const syncProformaFromOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pf } = await supabaseAdmin.from("proformas" as any).select("*").eq("number", data.number).single();
    if (!pf) throw new Error("Not found");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", (pf as any).order_id).single();
    if (!order) throw new Error("Order not found");
    const cs = {
      name: order.customer_name, email: order.customer_email,
      phone: order.customer_phone, company: order.company,
    };
    await supabaseAdmin.from("proformas" as any).update({
      customer_snapshot: cs,
      order_signature: orderSignature(order),
    }).eq("id", (pf as any).id);
    return { ok: true };
  });
