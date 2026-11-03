// Admin-only, read-only mailbox access for info@toreo.gr (foundation for the AI email assistant).
// Cookie-session authed like the rest of the admin panel. Nothing here sends mail, changes
// mailbox flags/messages, writes to Notion or stores message content.
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

type Fail = { ok: false; kind: string; error: string };
async function guarded<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | Fail> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const kind = (e as { kind?: string })?.kind ?? "protocol";
    return { ok: false, kind, error: e instanceof Error ? e.message.slice(0, 300) : String(e) };
  }
}

const folder = z.string().trim().min(1).max(200);

export const mailboxStatus = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { PAPAKI } = await import("@/lib/mail-sync/imap.server");
  const { SMTP } = await import("@/lib/mailbox/mailbox.server");
  return {
    account: PAPAKI.user,
    imap: `${PAPAKI.host}:${PAPAKI.port}`,
    smtp: `${SMTP.host}:${SMTP.port}`,
    secretConfigured: !!process.env.PAPAKI_EMAIL_PASSWORD,
  };
});

export const mailboxTest = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminCookie();
  const { testConnection } = await import("@/lib/mailbox/mailbox.server");
  return guarded(testConnection);
});

export const mailboxList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        folder,
        limit: z.number().int().min(1).max(50).default(25),
        beforeUid: z.number().int().positive().optional(),
      })
      .strict()
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { listMessages } = await import("@/lib/mailbox/mailbox.server");
    return guarded(() => listMessages(data));
  });

export const mailboxMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ folder, uid: z.number().int().positive() }).strict().parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { getMessage } = await import("@/lib/mailbox/mailbox.server");
    return guarded(() => getMessage(data));
  });

export const mailboxSmtpCheck = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ verifyLogin: z.boolean() }).strict().parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { assessSmtp } = await import("@/lib/mailbox/mailbox.server");
    return guarded(() => assessSmtp(data));
  });
