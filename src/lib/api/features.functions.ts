// TOREO — Feature server functions: production photos, reviews, loyalty,
// shipping list, project library, manufacturing report data. Reuses existing
// order_files (folder='production_photos'), order_events, and orders tables.
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

async function requireUser() {
  const u = await getUser();
  if (!u) throw new Error("Not authenticated");
  return u;
}

async function isAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

// ---------- LOYALTY ----------
export type LoyaltyTier = { level: string; discount_pct: number; min_orders: number };

const TIERS: LoyaltyTier[] = [
  { level: "Standard", discount_pct: 0, min_orders: 0 },
  { level: "Silver", discount_pct: 5, min_orders: 5 },
  { level: "Gold", discount_pct: 10, min_orders: 10 },
  { level: "Platinum", discount_pct: 15, min_orders: 20 },
];

export function tierFor(orders: number): { current: LoyaltyTier; next: LoyaltyTier | null } {
  let current = TIERS[0];
  for (const t of TIERS) if (orders >= t.min_orders) current = t;
  const next = TIERS.find((t) => t.min_orders > orders) ?? null;
  return { current, next };
}

export const getMyLoyalty = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireUser();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("orders")
    .select("quote_price, status")
    .eq("user_id", u.user.id);
  const paid = (rows ?? []).filter((r: any) =>
    ["payment_received", "production", "quality_inspection", "ready_for_shipping", "shipped", "delivered", "completed"].includes(r.status),
  );
  const count = paid.length;
  const spent = paid.reduce((s: number, r: any) => s + (Number(r.quote_price) || 0), 0);
  const { current, next } = tierFor(count);
  return {
    orders_count: count,
    total_spent: Math.round(spent * 100) / 100,
    tier: current,
    next,
    orders_to_next: next ? Math.max(0, next.min_orders - count) : 0,
  };
});

// ---------- PRODUCTION PHOTOS + APPROVAL ----------
// Uses order_files with folder path 'production_photos/…' and visibility='customer'.
// Approval status stored in orders.metadata.production_approval: 'pending'|'approved'|'changes_requested'

export const listProductionPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = await isAdmin(u.user.id);
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, metadata")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order) throw new Error("Not found");
    if (!admin && order.user_id !== u.user.id) throw new Error("Forbidden");
    const { data: files } = await supabaseAdmin
      .from("order_files")
      .select("id, file_path, file_name, size_bytes, created_at, metadata")
      .eq("order_id", order.id)
      .eq("visibility", "customer")
      .ilike("file_path", `%/production_photos/%`)
      .order("created_at");
    // Sign URLs
    const withUrls = await Promise.all(
      (files ?? []).map(async (f: any) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("order-files")
          .createSignedUrl(f.file_path, 60 * 60);
        return { ...f, url: signed?.signedUrl ?? null, caption: (f.metadata as any)?.caption ?? null };
      }),
    );
    return {
      photos: withUrls,
      approval: (order.metadata as any)?.production_approval ?? null,
    };
  });

export const setPhotoCaption = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ file_id: z.string().uuid(), caption: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    if (!(await isAdmin(u.user.id))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin.from("order_files").select("metadata").eq("id", data.file_id).maybeSingle();
    const meta = { ...((cur?.metadata as any) ?? {}), caption: data.caption };
    await supabaseAdmin.from("order_files").update({ metadata: meta } as any).eq("id", data.file_id);
    return { ok: true };
  });

export const customerRespondPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      order_code: z.string().min(1),
      action: z.enum(["approve", "request_changes"]),
      comment: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const u = await requireUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, order_code, metadata, status, customer_email, customer_name")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order || order.user_id !== u.user.id) throw new Error("Not found");

    const approval = data.action === "approve" ? "approved" : "changes_requested";
    const meta = {
      ...((order.metadata as any) ?? {}),
      production_approval: approval,
      production_approval_at: new Date().toISOString(),
      production_approval_comment: data.comment ?? null,
    };
    const patch: any = { metadata: meta };
    // If approved and status is quality_inspection, advance to ready_for_shipping
    if (data.action === "approve" && ["production", "quality_inspection"].includes(order.status as any)) {
      patch.status = "ready_for_shipping";
    }
    await supabaseAdmin.from("orders").update(patch).eq("id", order.id);

    // Timeline event
    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      event_type: data.action === "approve" ? "photos_approved" : "photos_changes_requested",
      title: data.action === "approve" ? "Customer approved production photos" : "Customer requested changes",
      description: data.comment ?? null,
      actor: "customer",
      visibility: "customer",
    });

    // Admin notification (in-app)
    try {
      await supabaseAdmin.from("admin_notifications" as any).insert({
        kind: data.action === "approve" ? "photos_approved" : "changes_requested",
        title: `${order.order_code}: ${data.action === "approve" ? "Customer approved production photos" : "Customer requested changes"}`,
        body: data.comment ?? null,
        meta: { order_code: order.order_code },
      });
    } catch (e) { console.error("admin_notifications insert failed", e); }

    // Email admin
    try {
      const { sendBrandedEmail } = await import("@/lib/email/template.server");
      await sendBrandedEmail({
        to: "INFO@TOREO.GR",
        subject: `${order.order_code} – ${data.action === "approve" ? "Photos approved" : "Changes requested"}`,
        params: {
          kicker: "Order Update",
          headline: `${order.customer_name ?? order.customer_email}`,
          orderCode: order.order_code ?? "",
          intro: `<p>${data.action === "approve" ? "Production photos approved. Ready to ship." : "Customer requested changes:"}</p>${data.comment ? `<p>${escapeHtml(data.comment)}</p>` : ""}`,
        },
      });
    } catch (e) { console.error("admin email failed", e); }

    return { ok: true, approval };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ---------- REVIEWS ----------
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      order_code: z.string().min(1),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(2000).optional(),
      photo_base64: z.string().optional(),
      photo_name: z.string().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const u = await requireUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, order_code, customer_name")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order || order.user_id !== u.user.id) throw new Error("Not found");

    let photo_path: string | null = null;
    if (data.photo_base64 && data.photo_name) {
      const safe = data.photo_name.replace(/[^A-Za-z0-9._-]/g, "_");
      const path = `${order.order_code}/reviews/${Date.now()}-${safe}`;
      const buf = Buffer.from(data.photo_base64, "base64");
      const { error } = await supabaseAdmin.storage
        .from("order-files")
        .upload(path, buf, { contentType: "image/jpeg", upsert: false });
      if (!error) photo_path = path;
    }

    const { data: row, error } = await supabaseAdmin
      .from("reviews")
      .upsert({
        order_id: order.id,
        user_id: u.user.id,
        customer_name: order.customer_name,
        rating: data.rating,
        comment: data.comment ?? null,
        photo_path,
        approved: false,
      } as any, { onConflict: "order_id" })
      .select("*")
      .single();
    if (error) throw error;

    try {
      await supabaseAdmin.from("admin_notifications" as any).insert({
        kind: "review_submitted",
        title: `New review for ${order.order_code} – ${data.rating}★`,
        body: data.comment?.slice(0, 200) ?? null,
        meta: { order_code: order.order_code, review_id: row.id },
      });
    } catch (e) { console.error(e); }
    return { ok: true };
  });

export const getMyReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order || order.user_id !== u.user.id) return null;
    const { data: rev } = await supabaseAdmin.from("reviews").select("*").eq("order_id", order.id).maybeSingle();
    return rev ?? null;
  });

export const listPublicReviews = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("reviews")
    .select("id, customer_name, rating, comment, photo_path, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(50);
  const withUrls = await Promise.all(
    (rows ?? []).map(async (r: any) => {
      let photo_url = null;
      if (r.photo_path) {
        const { data: s } = await supabaseAdmin.storage.from("order-files").createSignedUrl(r.photo_path, 60 * 60 * 24);
        photo_url = s?.signedUrl ?? null;
      }
      return { ...r, photo_url };
    }),
  );
  return withUrls;
});

// Admin: list & approve reviews
export const adminListReviews = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireUser();
  if (!(await isAdmin(u.user.id))) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("reviews")
    .select("*, orders!inner(order_code, customer_email)")
    .order("created_at", { ascending: false })
    .limit(200);
  return rows ?? [];
});

export const adminSetReviewApproval = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    if (!(await isAdmin(u.user.id))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("reviews").update({ approved: data.approved }).eq("id", data.id);
    return { ok: true };
  });

// ---------- PROJECT LIBRARY ----------
export const listMyProjects = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireUser();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  return projects ?? [];
});

export const renameProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), name: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("projects").update({ name: data.name } as any).eq("id", data.id).eq("user_id", u.user.id);
    return { ok: true };
  });

export const archiveProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("projects").update({ archived: data.archived } as any).eq("id", data.id).eq("user_id", u.user.id);
    return { ok: true };
  });

export const repeatOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!src || src.user_id !== u.user.id) throw new Error("Not found");

    const { data: newOrder, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: u.user.id,
        customer_name: src.customer_name,
        customer_email: src.customer_email,
        customer_phone: src.customer_phone,
        company: src.company,
        source: "portal" as any,
        service: src.service,
        material: src.material,
        quantity: src.quantity,
        dimensions: src.dimensions,
        message: `Repeat of ${src.order_code}. ${src.message ?? ""}`.trim(),
        status: "quote_received" as any,
        metadata: { repeat_of: src.order_code },
      } as any)
      .select("*")
      .single();
    if (error) throw error;

    // Copy customer-visible files
    const { data: files } = await supabaseAdmin
      .from("order_files")
      .select("*")
      .eq("order_id", src.id)
      .eq("visibility", "customer")
      .not("file_path", "ilike", "%/production_photos/%")
      .not("file_path", "ilike", "%/reviews/%");
    for (const f of files ?? []) {
      const bucket = f.file_path.startsWith("inquiry/") || f.file_path.startsWith("3dp/") ? "submission-files" : "order-files";
      try {
        const { data: blob } = await supabaseAdmin.storage.from(bucket).download(f.file_path);
        if (blob) {
          const arr = new Uint8Array(await blob.arrayBuffer());
          const newPath = `${newOrder.order_code}/${f.file_name}`;
          const { error: upErr } = await supabaseAdmin.storage.from("order-files").upload(newPath, arr, {
            contentType: f.file_type || "application/octet-stream",
            upsert: false,
          });
          if (!upErr) {
            await supabaseAdmin.from("order_files").insert({
              order_id: newOrder.id,
              file_path: newPath,
              file_name: f.file_name,
              file_type: f.file_type,
              size_bytes: f.size_bytes,
              uploaded_by: "customer",
              visibility: "customer",
            });
          }
        }
      } catch (e) { console.error("copy file failed", e); }
    }
    return { order_code: newOrder.order_code };
  });

// ---------- SHIPPING DASHBOARD ----------
export const adminShippingList = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireUser();
  if (!(await isAdmin(u.user.id))) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("orders")
    .select("id, order_code, status, customer_name, customer_email, courier, tracking_number, tracking_url, estimated_delivery, updated_at, due_date")
    .in("status", ["ready_for_shipping", "shipped", "delivered"] as any)
    .order("updated_at", { ascending: false })
    .limit(300);
  const now = Date.now();
  const withFlags = (rows ?? []).map((r: any) => {
    const delayed =
      r.status === "shipped" &&
      r.estimated_delivery &&
      new Date(r.estimated_delivery).getTime() < now;
    return { ...r, delayed };
  });
  return withFlags;
});

// ---------- MANUFACTURING REPORT DATA (for print route) ----------
export const getManufacturingReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = await isAdmin(u.user.id);
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_code", data.order_code)
      .maybeSingle();
    if (!order) throw new Error("Not found");
    if (!admin && order.user_id !== u.user.id) throw new Error("Forbidden");

    const [{ data: files }, { data: analysis }, { data: job }] = await Promise.all([
      supabaseAdmin.from("order_files").select("*").eq("order_id", order.id).order("created_at"),
      supabaseAdmin.from("project_analyses").select("*").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("production_jobs").select("*").eq("order_id", order.id).maybeSingle(),
    ]);

    const photos = await Promise.all(
      (files ?? [])
        .filter((f: any) => /\/production_photos\//.test(f.file_path))
        .map(async (f: any) => {
          const { data: s } = await supabaseAdmin.storage.from("order-files").createSignedUrl(f.file_path, 60 * 60);
          return { url: s?.signedUrl ?? null, caption: (f.metadata as any)?.caption ?? null, name: f.file_name };
        }),
    );
    const uploadFiles = (files ?? []).filter((f: any) => !/\/production_photos\//.test(f.file_path) && !/\/reviews\//.test(f.file_path));

    return {
      order,
      analysis: analysis ?? null,
      job: job ?? null,
      photos,
      files: uploadFiles.map((f: any) => f.file_name),
      isAdmin: admin,
    };
  });
