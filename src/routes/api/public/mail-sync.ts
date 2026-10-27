/**
 * Scheduled trigger for the info@toreo.gr -> Notion sync.
 * Auth: Authorization: Bearer <token>. Accepted: the MAIL_SYNC_TOKEN server secret (constant-time
 * compare) or the scheduler token, whose SHA-256 hash is stored service-role-only in
 * mail_sync_cron_auth (the raw value exists only inside the database's scheduled job).
 * Rate limit: one run at a time + minimum interval (enforced in the database).
 * The response carries counts only — never email addresses, subjects or content.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({ mode: z.enum(["probe", "dry", "live"]).default("dry") }).strict();

async function digest(s: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
async function hex(s: string) {
  return [...(await digest(s))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function authorized(token: string) {
  const secret = process.env.MAIL_SYNC_TOKEN;
  if (secret && (await safeEqual(token, secret))) return true;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("mail_sync_cron_auth")
    .select("token_hash")
    .eq("id", 1)
    .maybeSingle();
  return !!data?.token_hash && (await safeEqual(await hex(token), data.token_hash));
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const Route = createFileRoute("/api/public/mail-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token || token.length < 32 || token.length > 256)
          return json({ error: "unauthorized" }, 401);
        if (!(await authorized(token))) return json({ error: "unauthorized" }, 401);

        let parsed: z.infer<typeof bodySchema>;
        try {
          const text = await request.text();
          if (text.length > 1000) return json({ error: "payload_too_large" }, 413);
          parsed = bodySchema.parse(text ? JSON.parse(text) : {});
        } catch {
          return json({ error: "invalid_body" }, 400);
        }

        const { runMailSync } = await import("@/lib/mail-sync/sync.server");
        const r = await runMailSync({ mode: parsed.mode, trigger: "cron" });
        if (r.busy) return json({ ok: false, busy: true }, 429);
        if (!r.runId) return json({ ok: false, mode: r.mode, error: r.error }, 409);
        return json(
          {
            ok: r.ok,
            mode: r.mode,
            runId: r.runId,
            transport: r.transport,
            counts: r.counts,
            folders: r.folders.map((f) => ({
              kind: f.kind,
              exists: f.exists,
              pending: f.pending,
              taken: f.taken,
            })),
            schemaOk: r.schemaProblems.length === 0,
            error: r.error,
          },
          r.ok ? 200 : 500,
        );
      },
    },
  },
});
