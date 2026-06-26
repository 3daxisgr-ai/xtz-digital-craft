import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeaders } from "@tanstack/react-start/server";

// ----- helpers ---------------------------------------------------------------

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

async function requireAdmin() {
  const u = await getUser();
  if (!u) throw new Error("Not authenticated");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Not authorized");
  return u;
}

const STATUS_FLOW = [
  "quote_received",
  "engineering_review",
  "quote_sent",
  "awaiting_approval",
  "payment_received",
  "production",
  "quality_inspection",
  "ready_for_shipping",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const STATUS_LABEL: Record<string, string> = {
  quote_received: "Quote Received",
  engineering_review: "Engineering Review",
  quote_sent: "Quote Sent",
  awaiting_approval: "Awaiting Approval",
  payment_received: "Payment Received",
  production: "Production",
  quality_inspection: "Quality Inspection",
  ready_for_shipping: "Ready for Shipping",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_EMAIL_BODY: Record<string, { subject: (c: string) => string; html: (o: any) => string }> = {
  quote_sent: {
    subject: (c) => `Your TOREO Quote is Ready – ${c}`,
    html: (o) =>
      `<p>Your quote is ready. Total: <strong>€${(o.quote_price ?? 0).toFixed(2)}</strong>.</p>`,
  },
  payment_received: {
    subject: (c) => `Payment Received – ${c}`,
    html: () => `<p>We have received your payment. Production will start shortly.</p>`,
  },
  production: {
    subject: (c) => `Production Started – ${c}`,
    html: () => `<p>Production has started on your order.</p>`,
  },
  quality_inspection: {
    subject: (c) => `Quality Inspection – ${c}`,
    html: () => `<p>Your order is undergoing quality inspection.</p>`,
  },
  shipped: {
    subject: (c) => `Order Shipped – ${c}`,
    html: (o) => `<p>Your order has been shipped via <strong>${o.courier ?? "—"}</strong>.</p>
      <p>Tracking number: <strong>${o.tracking_number ?? "—"}</strong></p>
      ${o.tracking_url ? `<p><a href="${o.tracking_url}">Track shipment</a></p>` : ""}
      ${o.estimated_delivery ? `<p>Estimated delivery: ${o.estimated_delivery}</p>` : ""}`,
  },
  delivered: {
    subject: (c) => `Order Delivered – ${c}`,
    html: () =>
      `<p>Your order has been delivered. Thank you for choosing TOREO! We'd love your feedback.</p>`,
  },
};

async function sendCustomerEmail(to: string, subject: string, html: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) return;
  await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "TOREO <onboarding@resend.dev>",
      to: [to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
        <div style="font-family:monospace;font-size:11px;letter-spacing:0.3em;color:#666;text-transform:uppercase">TOREO</div>
        ${html}
        <p style="margin-top:24px;color:#666;font-size:12px">TOREO · INFO@TOREO.GR · +30 6970609960</p>
      </div>`,
    }),
  }).catch((e) => console.error("status email failed", e));
}

// ----- customer-facing -------------------------------------------------------

export const listMyOrders = createServerFn({ method: "POST" }).handler(async () => {
  const u = await getUser();
  if (!u) throw new Error("Not authenticated");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_code, status, service, material, quote_price, currency, estimated_delivery, created_at, updated_at",
    )
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getMyOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ order_code: z.string().min(1).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getUser();
    if (!u) throw new Error("Not authenticated");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_code, status, service, material, quantity, dimensions, message, quote_price, currency, courier, tracking_number, tracking_url, estimated_delivery, created_at, updated_at, customer_name, customer_email, user_id",
      )
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order || order.user_id !== u.user.id) throw new Error("Not found");

    const [{ data: events }, { data: files }, { data: messages }] = await Promise.all([
      supabaseAdmin
        .from("order_events")
        .select("id, event_type, title, description, payload, created_at")
        .eq("order_id", order.id)
        .eq("visibility", "customer")
        .order("created_at"),
      supabaseAdmin
        .from("order_files")
        .select("id, file_path, file_name, file_type, size_bytes, created_at")
        .eq("order_id", order.id)
        .eq("visibility", "customer")
        .order("created_at"),
      supabaseAdmin
        .from("order_messages")
        .select("id, from_role, body, created_at")
        .eq("order_id", order.id)
        .order("created_at"),
    ]);
    return { order, events: events ?? [], files: files ?? [], messages: messages ?? [] };
  });

export const customerPostMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ order_code: z.string().min(1), body: z.string().min(1).max(2000) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getUser();
    if (!u) throw new Error("Not authenticated");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order || order.user_id !== u.user.id) throw new Error("Not found");
    await supabaseAdmin.from("order_messages").insert({
      order_id: order.id,
      from_role: "customer",
      author_id: u.user.id,
      body: data.body,
    });
    return { ok: true };
  });

export const getOrderFileUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ file_path: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getUser();
    if (!u) throw new Error("Not authenticated");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Validate: caller must own the related order OR be admin
    const { data: file } = await supabaseAdmin
      .from("order_files")
      .select("order_id, visibility")
      .eq("file_path", data.file_path)
      .maybeSingle();
    if (!file) throw new Error("Not found");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", file.order_id)
      .single();
    if (!order) throw new Error("Not found");
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;
    if (!isAdmin && (order?.user_id !== u.user.id || file.visibility !== "customer")) {
      throw new Error("Forbidden");
    }
    const bucket = data.file_path.startsWith("inquiry/") || data.file_path.startsWith("3dp/")
      ? "submission-files"
      : "order-files";
    const { data: signed } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(data.file_path, 60 * 60);
    return { url: signed?.signedUrl ?? null };
  });

// ----- public tracking -------------------------------------------------------

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        order_code: z.string().trim().min(3).max(40),
        email: z.string().trim().email(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_code, status, courier, tracking_number, tracking_url, estimated_delivery, created_at",
      )
      .eq("order_code", data.order_code)
      .ilike("customer_email", data.email)
      .maybeSingle();
    if (!order) return { found: false as const };
    const { data: events } = await supabaseAdmin
      .from("order_events")
      .select("event_type, title, description, created_at")
      .eq("order_id", order.id)
      .eq("visibility", "customer")
      .order("created_at");
    return { found: true as const, order, events: events ?? [] };
  });

// ----- admin -----------------------------------------------------------------

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ q: z.string().trim().max(120).optional(), status: z.string().optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let qb = supabaseAdmin
      .from("orders")
      .select(
        "id, order_code, status, customer_name, customer_email, company, service, quote_price, currency, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status && data.status !== "all") qb = qb.eq("status", data.status as any);
    if (data.q) {
      const q = data.q;
      qb = qb.or(
        `order_code.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,company.ilike.%${q}%`,
      );
    }
    const { data: rows, error } = await qb;
    if (error) throw error;
    return rows ?? [];
  });

export const adminGetOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ order_code: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order) throw new Error("Not found");
    const [{ data: events }, { data: files }, { data: messages }] = await Promise.all([
      supabaseAdmin
        .from("order_events")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at"),
      supabaseAdmin
        .from("order_files")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at"),
      supabaseAdmin
        .from("order_messages")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at"),
    ]);
    return { order, events: events ?? [], files: files ?? [], messages: messages ?? [] };
  });

const updateSchema = z.object({
  order_code: z.string().min(1),
  status: z.enum(STATUS_FLOW).optional(),
  quote_price: z.number().nullable().optional(),
  courier: z.string().max(80).nullable().optional(),
  tracking_number: z.string().max(120).nullable().optional(),
  tracking_url: z.string().url().max(500).nullable().optional(),
  estimated_delivery: z.string().nullable().optional(),
  internal_notes: z.string().max(4000).nullable().optional(),
  customer_name: z.string().max(160).optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().max(60).nullable().optional(),
  company: z.string().max(160).nullable().optional(),
});

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { order_code, ...rest } = data;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) patch[k] = v;
    const { data: updated, error } = await supabaseAdmin
      .from("orders")
      .update(patch as any)
      .eq("order_code", order_code)
      .select("*")
      .single();
    if (error) throw error;
    if (!updated) throw new Error("Not found");

    // Trigger transactional email if status changed to a notify-able status
    if (data.status && STATUS_EMAIL_BODY[data.status]) {
      const tmpl = STATUS_EMAIL_BODY[data.status];
      await sendCustomerEmail(
        updated.customer_email,
        tmpl.subject(updated.order_code ?? order_code),
        tmpl.html(updated),
      );
    }
    return updated;
  });

export const adminAddNote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        order_code: z.string().min(1),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        visibility: z.enum(["customer", "admin"]).default("customer"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_code", data.order_code)
      .single();
    if (!order) throw new Error("Not found");
    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      event_type: "note",
      title: data.title,
      description: data.description ?? null,
      actor: "admin",
      visibility: data.visibility,
    });
    return { ok: true };
  });

export const adminPostMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ order_code: z.string().min(1), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const u = await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, customer_email, order_code")
      .eq("order_code", data.order_code)
      .single();
    if (!order) throw new Error("Not found");
    await supabaseAdmin.from("order_messages").insert({
      order_id: order.id,
      from_role: "admin",
      author_id: u.user.id,
      body: data.body,
    });
    await sendCustomerEmail(
      order.customer_email,
      `New message regarding ${order.order_code}`,
      `<p>You have a new message from TOREO:</p><blockquote style="border-left:3px solid #999;padding-left:12px;color:#444">${data.body.replace(/</g, "&lt;")}</blockquote>
       <p><a href="https://www.toreo.gr/portal">Open your portal</a></p>`,
    );
    return { ok: true };
  });

export const adminUploadOrderFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        order_code: z.string().min(1),
        file_name: z.string().min(1).max(255),
        file_base64: z.string().min(1),
        file_type: z.string().max(60).optional(),
        visibility: z.enum(["customer", "admin"]).default("customer"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_code")
      .eq("order_code", data.order_code)
      .single();
    if (!order) throw new Error("Not found");
    const safeName = data.file_name.replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `${order.order_code}/${Date.now()}-${safeName}`;
    const buf = Buffer.from(data.file_base64, "base64");
    const { error: upErr } = await supabaseAdmin.storage
      .from("order-files")
      .upload(path, buf, { contentType: data.file_type || "application/octet-stream" });
    if (upErr) throw upErr;
    await supabaseAdmin.from("order_files").insert({
      order_id: order.id,
      file_path: path,
      file_name: data.file_name,
      file_type: data.file_type ?? null,
      size_bytes: buf.byteLength,
      uploaded_by: "admin",
      visibility: data.visibility,
    });
    return { ok: true, path };
  });

export const meIsAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const u = await getUser();
  if (!u) return { admin: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return { admin: !!data };
});

export { STATUS_FLOW, STATUS_LABEL };
