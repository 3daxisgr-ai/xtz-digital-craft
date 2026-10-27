/**
 * Scheduled trigger for the info@toreo.gr -> Notion sync.
 * Auth: Authorization: Bearer <MAIL_SYNC_TOKEN> (server-only secret, constant-time compare).
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
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/mail-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.MAIL_SYNC_TOKEN;
        if (!expected) return json({ error: "not_configured" }, 503);
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token || !(await safeEqual(token, expected))) return json({ error: "unauthorized" }, 401);

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
            folders: r.folders.map((f) => ({ kind: f.kind, exists: f.exists, pending: f.pending, taken: f.taken })),
            schemaOk: r.schemaProblems.length === 0,
            error: r.error,
          },
          r.ok ? 200 : 500,
        );
      },
    },
  },
});
