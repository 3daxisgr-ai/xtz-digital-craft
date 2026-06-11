import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSession = { authed?: boolean; ts?: number };

function getSessionConfig() {
  const raw = process.env.ADMIN_PASSWORD ?? "";
  const password = (raw + "::skg3d-admin-session-pad-do-not-share::").padEnd(64, "x");
  return {
    password,
    name: "skg3d_admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, sameSite: "lax" as const, path: "/" },
  };
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("Admin password not configured");
    if (data.password !== expected) {
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false as const };
    }
    const session = await useSession<AdminSession>(getSessionConfig());
    await session.update({ authed: true, ts: Date.now() });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(getSessionConfig());
  await session.clear();
  return { ok: true };
});

export const adminCheck = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(getSessionConfig());
  return { authed: !!session.data.authed };
});

async function requireAdmin() {
  const session = await useSession<AdminSession>(getSessionConfig());
  return !!session.data.authed;
}

export const adminListQuotes = createServerFn({ method: "GET" }).handler(async () => {
  const authed = await requireAdmin();
  if (!authed) return { authed: false as const, rows: [] };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return { authed: true as const, rows: data ?? [] };
});

export const adminSignFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const authed = await requireAdmin();
    if (!authed) return { authed: false as const, url: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("submission-files")
      .createSignedUrl(data.path, 60 * 10, { download: true });
    if (error || !signed) throw new Error(error?.message ?? "Could not sign file");
    return { authed: true as const, url: signed.signedUrl };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      name: z.string().min(1).max(200).optional(),
      email: z.string().email().max(200).optional(),
      phone: z.string().max(50).nullable().optional(),
      service: z.string().max(100).nullable().optional(),
      material: z.string().max(100).nullable().optional(),
      message: z.string().max(5000).nullable().optional(),
      estimated_price: z.number().nullable().optional(),
      status: z.enum(["new", "in_progress", "done"]).optional(),
    })
    .refine((p) => Object.keys(p).length > 0, "No fields to update"),
});

export const adminUpdateQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    const authed = await requireAdmin();
    if (!authed) return { authed: false as const, row: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("quote_requests")
      .update(data.patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { authed: true as const, row };
  });

export const adminDeleteQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const authed = await requireAdmin();
    if (!authed) return { authed: false as const, ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("quote_requests")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.file_path) {
      await supabaseAdmin.storage.from("submission-files").remove([row.file_path]);
    }
    const { error } = await supabaseAdmin.from("quote_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { authed: true as const, ok: true };
  });

// ============ Notifications ============

export const adminListNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const authed = await requireAdmin();
  if (!authed) return { authed: false as const, items: [] };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return { authed: true as const, items: (data ?? []) as Array<{
    id: string;
    quote_id: string | null;
    title: string;
    body: string | null;
    read: boolean;
    created_at: string;
  }> };
});

export const adminMarkNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const authed = await requireAdmin();
    if (!authed) return { authed: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("admin_notifications")
      .update({ read: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { authed: true as const, ok: true };
  });

export const adminMarkAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const authed = await requireAdmin();
  if (!authed) return { authed: false as const };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any)
    .from("admin_notifications")
    .update({ read: true })
    .eq("read", false);
  if (error) throw new Error(error.message);
  return { authed: true as const, ok: true };
});
