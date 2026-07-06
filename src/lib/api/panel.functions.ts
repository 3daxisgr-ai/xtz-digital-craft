// Admin Panel server functions — cookie-session authed (admin / ADMIN_PASSWORD).
// All endpoints check the session cookie set by adminLogin (admin.functions.ts).
// They use the service-role client and never accept a user JWT.

import { createServerFn } from "@tanstack/react-start";
import { useSession, getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSession = { authed?: boolean; ts?: number };
const SESSION_NAME = "skg3d_admin";

function sessionConfig() {
  const raw = process.env.ADMIN_PASSWORD ?? "";
  const password = (raw + "::skg3d-admin-session-pad-do-not-share::").padEnd(64, "x");
  return {
    password,
    name: SESSION_NAME,
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, sameSite: "lax" as const, path: "/" },
  };
}

async function requireAdminCookie() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.authed) throw new Error("Unauthorized");
  return true;
}

function clientIp() {
  try {
    const h = getRequestHeaders();
    const xf = (h["x-forwarded-for"] || h["X-Forwarded-For"]) as string | undefined;
    return (xf?.split(",")[0]?.trim()) || (h["x-real-ip"] as string | undefined) || null;
  } catch {
    return null;
  }
}
function clientUa() {
  try {
    const h = getRequestHeaders();
    return (h["user-agent"] as string) || null;
  } catch {
    return null;
  }
}

async function logAction(action: string, target?: { type?: string; id?: string }, details?: Record<string, unknown>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_activity_log" as any).insert({
      actor: "admin",
      action,
      target_type: target?.type ?? null,
      target_id: target?.id ?? null,
      details: details ?? {},
      ip: clientIp(),
      user_agent: clientUa(),
    });
  } catch (e) {
    console.error("logAction failed", e);
  }
}

// ---------------- DASHBOARD ----------------

export const panelStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const counts = async (filter?: (q: any) => any) => {
    let q: any = supabaseAdmin.from("orders").select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count } = await q;
    return count ?? 0;
  };

  const [total, pending, inProduction, shipped, delivered, customers, revRes, recent, activity] = await Promise.all([
    counts(),
    counts((q) => q.in("status", ["quote_received", "engineering_review", "quote_sent", "awaiting_approval"])),
    counts((q) => q.in("status", ["production", "quality_inspection", "ready_for_shipping"])),
    counts((q) => q.eq("status", "shipped")),
    counts((q) => q.eq("status", "delivered")),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0),
    supabaseAdmin
      .from("orders")
      .select("quote_price")
      .in("status", ["payment_received", "production", "quality_inspection", "ready_for_shipping", "shipped", "delivered", "completed" as any])
      .then((r) => (r.data ?? []).reduce((s, o: any) => s + (Number(o.quote_price) || 0), 0)),
    supabaseAdmin
      .from("orders")
      .select("id, order_code, customer_name, customer_email, status, quote_price, currency, priority, created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .then((r) => r.data ?? []),
    supabaseAdmin
      .from("admin_activity_log" as any)
      .select("id, action, target_type, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .then((r) => r.data ?? []),
  ]);

  return { total, pending, inProduction, shipped, delivered, customers, revenue: revRes, recent, activity };
});

// ---------------- ORDERS ----------------

const orderListInput = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  courier: z.string().optional(),
  sort: z.enum(["created_at", "updated_at", "due_date", "priority"]).default("created_at"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export const panelListOrders = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let qb: any = supabaseAdmin
      .from("orders")
      .select(
        "id, order_code, status, priority, due_date, customer_name, customer_email, company, service, quote_price, currency, courier, tracking_number, created_at, updated_at",
      )
      .order(data.sort, { ascending: data.dir === "asc" })
      .limit(500);
    if (data.status && data.status !== "all") qb = qb.eq("status", data.status);
    if (data.priority && data.priority !== "all") qb = qb.eq("priority", data.priority);
    if (data.courier && data.courier !== "all") qb = qb.eq("courier", data.courier);
    if (data.q) {
      const q = data.q.replace(/[%_,]/g, " ");
      qb = qb.or(
        `order_code.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,company.ilike.%${q}%,tracking_number.ilike.%${q}%`,
      );
    }
    const { data: rows, error } = await qb;
    if (error) throw error;
    return rows ?? [];
  });

export const panelGetOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("order_code", data.order_code).maybeSingle();
    if (!order) throw new Error("Not found");
    const [{ data: events }, { data: files }, { data: messages }] = await Promise.all([
      supabaseAdmin.from("order_events").select("*").eq("order_id", order.id).order("created_at"),
      supabaseAdmin.from("order_files").select("*").eq("order_id", order.id).order("created_at"),
      supabaseAdmin.from("order_messages").select("*").eq("order_id", order.id).order("created_at"),
    ]);
    return { order, events: events ?? [], files: files ?? [], messages: messages ?? [] };
  });

const updateOrderInput = z.object({
  order_code: z.string().min(1),
  patch: z
    .object({
      status: z.string().max(40).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      due_date: z.string().nullable().optional(),
      quote_price: z.number().nullable().optional(),
      courier: z.string().max(80).nullable().optional(),
      tracking_number: z.string().max(120).nullable().optional(),
      tracking_url: z.string().max(500).nullable().optional(),
      estimated_delivery: z.string().nullable().optional(),
      internal_notes: z.string().max(8000).nullable().optional(),
      customer_name: z.string().max(160).optional(),
      customer_email: z.string().email().optional(),
      customer_phone: z.string().max(60).nullable().optional(),
      company: z.string().max(160).nullable().optional(),
      service: z.string().max(160).nullable().optional(),
      material: z.string().max(160).nullable().optional(),
      message: z.string().max(8000).nullable().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, "No fields"),
});

export const panelUpdateOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateOrderInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update(data.patch as any)
      .eq("order_code", data.order_code)
      .select("*")
      .single();
    if (error) throw error;
    await logAction("order_updated", { type: "order", id: data.order_code }, { fields: Object.keys(data.patch) });
    return row;
  });

const createOrderInput = z.object({
  customer_name: z.string().min(1).max(160),
  customer_email: z.string().email(),
  customer_phone: z.string().max(60).optional(),
  company: z.string().max(160).optional(),
  service: z.string().max(160).optional(),
  material: z.string().max(160).optional(),
  message: z.string().max(8000).optional(),
  quote_price: z.number().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export const panelCreateOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createOrderInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({ ...data, source: "manual" as any, status: "quote_received" as any })
      .select("*")
      .single();
    if (error) throw error;
    await logAction("order_created", { type: "order", id: row.order_code ?? row.id });
    return row;
  });

export const panelDeleteOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order) throw new Error("Not found");
    await supabaseAdmin.from("order_messages").delete().eq("order_id", order.id);
    await supabaseAdmin.from("order_events").delete().eq("order_id", order.id);
    const { data: files } = await supabaseAdmin.from("order_files").select("file_path").eq("order_id", order.id);
    if (files?.length) {
      const paths = files.map((f: any) => f.file_path).filter(Boolean);
      if (paths.length) await supabaseAdmin.storage.from("order-files").remove(paths);
    }
    await supabaseAdmin.from("order_files").delete().eq("order_id", order.id);
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
    await logAction("order_deleted", { type: "order", id: data.order_code });
    return { ok: true };
  });

// ---------------- EVENTS / TIMELINE ----------------

const eventInput = z.object({
  order_code: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  event_type: z.string().max(40).default("update"),
  visibility: z.enum(["customer", "admin"]).default("customer"),
  color_tag: z.string().max(20).nullable().optional(),
  image_path: z.string().max(500).nullable().optional(),
  attachment_path: z.string().max(500).nullable().optional(),
  occurred_at: z.string().optional(),
});

export const panelAddEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => eventInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order) throw new Error("Not found");
    const insert: any = {
      order_id: order.id,
      event_type: data.event_type,
      title: data.title,
      description: data.description ?? null,
      actor: "admin",
      visibility: data.visibility,
      color_tag: data.color_tag ?? null,
      image_path: data.image_path ?? null,
      attachment_path: data.attachment_path ?? null,
    };
    if (data.occurred_at) insert.created_at = data.occurred_at;
    const { data: row, error } = await supabaseAdmin.from("order_events").insert(insert).select("*").single();
    if (error) throw error;
    await logAction("event_added", { type: "order", id: data.order_code }, { title: data.title });
    return row;
  });

export const panelDeleteEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), order_code: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("order_events").delete().eq("id", data.id);
    await logAction("event_deleted", { type: "order", id: data.order_code });
    return { ok: true };
  });

// ---------------- COMMENTS / MESSAGES ----------------

export const panelAddComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        order_code: z.string().min(1),
        body: z.string().min(1).max(4000),
        visibility: z.enum(["customer", "admin"]).default("customer"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order) throw new Error("Not found");
    // Public messages go into order_messages; internal go into order_events as note
    if (data.visibility === "customer") {
      const { data: row, error } = await supabaseAdmin
        .from("order_messages")
        .insert({ order_id: order.id, from_role: "admin", body: data.body })
        .select("*")
        .single();
      if (error) throw error;
      await logAction("comment_added", { type: "order", id: data.order_code }, { visibility: "customer" });
      return row;
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("order_events")
        .insert({
          order_id: order.id,
          event_type: "note",
          title: "Internal note",
          description: data.body,
          actor: "admin",
          visibility: "admin",
        })
        .select("*")
        .single();
      if (error) throw error;
      await logAction("comment_added", { type: "order", id: data.order_code }, { visibility: "admin" });
      return row;
    }
  });

export const panelDeleteComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), kind: z.enum(["message", "event"]), order_code: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.kind === "message" ? "order_messages" : "order_events";
    await supabaseAdmin.from(table).delete().eq("id", data.id);
    await logAction("comment_deleted", { type: "order", id: data.order_code });
    return { ok: true };
  });

// ---------------- FILES ----------------

export const panelUploadFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        order_code: z.string().min(1),
        file_name: z.string().min(1).max(255),
        file_base64: z.string().min(1),
        file_type: z.string().max(60).optional(),
        visibility: z.enum(["customer", "admin"]).default("customer"),
        folder: z.string().max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_code")
      .eq("order_code", data.order_code)
      .single();
    if (!order) throw new Error("Not found");
    const safeName = data.file_name.replace(/[^A-Za-z0-9._-]/g, "_");
    const folder = data.folder ? `${data.folder.replace(/[^A-Za-z0-9._-]/g, "_")}/` : "";
    const path = `${order.order_code}/${folder}${Date.now()}-${safeName}`;
    const buf = Buffer.from(data.file_base64, "base64");
    const { error: upErr } = await supabaseAdmin.storage
      .from("order-files")
      .upload(path, buf, { contentType: data.file_type || "application/octet-stream", upsert: false });
    if (upErr) throw upErr;
    const { data: row, error } = await supabaseAdmin
      .from("order_files")
      .insert({
        order_id: order.id,
        file_path: path,
        file_name: data.file_name,
        file_type: data.file_type ?? null,
        size_bytes: buf.byteLength,
        uploaded_by: "admin",
        visibility: data.visibility,
      })
      .select("*")
      .single();
    if (error) throw error;
    await logAction("file_uploaded", { type: "order", id: data.order_code }, { name: data.file_name });
    return row;
  });

export const panelDeleteFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), order_code: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: f } = await supabaseAdmin.from("order_files").select("file_path").eq("id", data.id).maybeSingle();
    if (f?.file_path) {
      const bucket = f.file_path.startsWith("inquiry/") || f.file_path.startsWith("3dp/") ? "submission-files" : "order-files";
      await supabaseAdmin.storage.from(bucket).remove([f.file_path]);
    }
    await supabaseAdmin.from("order_files").delete().eq("id", data.id);
    await logAction("file_deleted", { type: "order", id: data.order_code });
    return { ok: true };
  });

export const panelSignFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = data.path.startsWith("inquiry/") || data.path.startsWith("3dp/") ? "submission-files" : "order-files";
    const { data: signed, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(data.path, 60 * 30);
    if (error) throw error;
    return { url: signed?.signedUrl ?? null };
  });

// ---------------- CUSTOMERS ----------------

export const panelListCustomers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().max(120).optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Customers = distinct emails from orders, joined with optional profile
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("customer_name, customer_email, customer_phone, company, user_id, created_at, quote_price")
      .order("created_at", { ascending: false })
      .limit(2000);
    const byEmail = new Map<string, any>();
    for (const r of rows ?? []) {
      const k = (r.customer_email || "").toLowerCase();
      if (!k) continue;
      if (!byEmail.has(k)) {
        byEmail.set(k, {
          email: r.customer_email,
          name: r.customer_name,
          phone: r.customer_phone,
          company: r.company,
          user_id: r.user_id,
          orders: 0,
          spend: 0,
          last: r.created_at,
        });
      }
      const c = byEmail.get(k);
      c.orders += 1;
      c.spend += Number(r.quote_price) || 0;
      if (r.created_at > c.last) c.last = r.created_at;
    }
    const list = Array.from(byEmail.values()).sort((a, b) => (a.last > b.last ? -1 : 1));
    const q = data.q?.toLowerCase();
    return q
      ? list.filter(
          (c) =>
            c.email?.toLowerCase().includes(q) ||
            c.name?.toLowerCase().includes(q) ||
            c.company?.toLowerCase().includes(q),
        )
      : list;
  });

export const panelGetCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, order_code, status, service, quote_price, currency, created_at")
      .eq("customer_email", data.email.trim().toLowerCase())
      .order("created_at", { ascending: false });
    return { email: data.email, orders: orders ?? [] };
  });

// ---------------- LOGS ----------------

export const panelListLogs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().max(120).optional(), limit: z.number().int().min(1).max(500).default(200) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let qb: any = supabaseAdmin
      .from("admin_activity_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.q) qb = qb.or(`action.ilike.%${data.q}%,target_id.ilike.%${data.q}%`);
    const { data: rows } = await qb;
    return rows ?? [];
  });

// ---------------- GLOBAL SEARCH ----------------

export const panelGlobalSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.q.replace(/[%_,]/g, " ");
    const [orders, quotes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("order_code, customer_name, customer_email, company, tracking_number, status")
        .or(
          `order_code.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,company.ilike.%${q}%,tracking_number.ilike.%${q}%`,
        )
        .limit(20)
        .then((r) => r.data ?? []),
      supabaseAdmin
        .from("quotes" as any)
        .select("id, name, email, service, status, created_at")
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,service.ilike.%${q}%`)
        .limit(20)
        .then((r) => r.data ?? []),
    ]);
    return { orders, quotes };
  });
