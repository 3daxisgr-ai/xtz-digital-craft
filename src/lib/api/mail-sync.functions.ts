/* eslint-disable @typescript-eslint/no-explicit-any -- service-role client follows the existing untyped admin-client pattern */
// Admin controls for the info@toreo.gr -> Notion sync (cookie-session authed like the admin panel).
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

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
async function requireAdminCookie() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- TanStack server session helper, not a React hook
  const s = await useSession<AdminSession>(sessionConfig());
  if (!s.data.authed) throw new Error("Unauthorized");
}
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const mailSyncOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const db = await admin();
  const [settings, runs, review, state] = await Promise.all([
    db.from("mail_sync_settings").select("*").eq("id", 1).single(),
    db
      .from("mail_sync_runs")
      .select("id, mode, trigger, started_at, finished_at, ok, counts, error")
      .order("started_at", { ascending: false })
      .limit(20),
    db
      .from("mail_sync_messages")
      .select(
        "id, direction, folder, from_email, to_emails, subject, sent_at, status, match_reason, error, notion_order_record, updated_at",
      )
      .in("status", ["manual_review", "failed"])
      .order("updated_at", { ascending: false })
      .limit(50),
    db.from("mail_sync_state").select("*"),
  ]);
  if (settings.error) throw new Error(settings.error.message);
  return {
    settings: settings.data,
    runs: runs.data ?? [],
    review: review.data ?? [],
    state: state.data ?? [],
    configured: {
      email: !!process.env.PAPAKI_EMAIL_PASSWORD,
      notion: !!process.env.NOTION_API_KEY,
    },
  };
});

export const mailSyncGetRun = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const db = await admin();
    const { data: run, error } = await db
      .from("mail_sync_runs")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return run;
  });

export const mailSyncRun = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ mode: z.enum(["probe", "dry", "live"]) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { runMailSync } = await import("@/lib/mail-sync/sync.server");
    return runMailSync({ mode: data.mode, trigger: "admin" });
  });

export const mailSyncUpdateSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        actor: z.string().trim().min(2).max(80),
        live_writes: z.boolean().optional(),
        website_hook: z.boolean().optional(),
        max_per_folder: z.number().int().min(1).max(25).optional(),
        lookback_days: z.number().int().min(1).max(60).optional(),
      })
      .strict()
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const db = await admin();
    const { actor, ...patch } = data;
    const { data: row, error } = await db
      .from("mail_sync_settings")
      .update({ ...patch, updated_by: actor })
      .eq("id", 1)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
