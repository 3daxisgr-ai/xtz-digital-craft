import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSession = { authed?: boolean; ts?: number };

function getSessionConfig() {
  const raw = process.env.ADMIN_PASSWORD ?? "";
  // useSession requires a password >= 32 chars; pad deterministically.
  const password = (raw + "::skg3d-admin-session-pad-do-not-share::").padEnd(64, "x");
  return {
    password,
    name: "skg3d_admin",
    maxAge: 60 * 60 * 8, // 8h
    cookie: { httpOnly: true, sameSite: "lax" as const, path: "/" },
  };
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("Admin password not configured");
    if (data.password !== expected) {
      // tiny delay to slow brute force
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
    .limit(1000);
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
