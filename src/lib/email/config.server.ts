/**
 * Central email provider configuration + diagnostics + logging.
 * Server-only. Every email path in the app goes through here so that
 * misconfiguration is reported once, consistently, with a real error string.
 */

export const EMAIL_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";
export const EMAIL_VERIFY_URL = "https://connector-gateway.lovable.dev/api/v1/verify_credentials";

/** Fallback sender. Resend's shared sandbox address only delivers to the Resend account owner. */
const SANDBOX_FROM = "TOREO <onboarding@resend.dev>";

export type EmailConfig =
  | { ok: true; lovableKey: string; resendKey: string; from: string; usingSandboxSender: boolean }
  | { ok: false; error: string; missing: string[] };

export function resolveEmailConfig(): EmailConfig {
  const lovableKey = process.env.LOVABLE_API_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || SANDBOX_FROM;

  const missing: string[] = [];
  if (!lovableKey) missing.push("LOVABLE_API_KEY");
  if (!resendKey) missing.push("RESEND_API_KEY");

  if (missing.length) {
    return {
      ok: false,
      missing,
      error:
        `Email provider not configured — missing ${missing.join(", ")}. ` +
        `Link the Resend connector to this project so RESEND_API_KEY is injected into the server runtime.`,
    };
  }

  return {
    ok: true,
    lovableKey: lovableKey!,
    resendKey: resendKey!,
    from,
    usingSandboxSender: from === SANDBOX_FROM,
  };
}

export function emailLog(step: string, detail: Record<string, unknown> = {}) {
  try {
    console.log(`[email] ${step} ${JSON.stringify(detail)}`);
  } catch {
    console.log(`[email] ${step}`);
  }
}

export function emailError(step: string, detail: Record<string, unknown> = {}) {
  try {
    console.error(`[email:ERROR] ${step} ${JSON.stringify(detail)}`);
  } catch {
    console.error(`[email:ERROR] ${step}`);
  }
}

export function maskEmail(v: string | string[] | null | undefined): string {
  const one = (s: string) => {
    const [u, d] = s.split("@");
    if (!d) return "***";
    return `${u.slice(0, 2)}***@${d}`;
  };
  if (!v) return "—";
  return Array.isArray(v) ? v.map(one).join(",") : one(v);
}

/** Full provider diagnostics used by the admin "Test notifications" panel. */
export async function runEmailDiagnostics() {
  const cfg = resolveEmailConfig();
  const report: Record<string, unknown> = {
    env: {
      LOVABLE_API_KEY: !!process.env.LOVABLE_API_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM ?? null,
    },
  };

  if (!cfg.ok) {
    return { ok: false as const, error: cfg.error, missing: cfg.missing, ...report };
  }

  report["from"] = cfg.from;
  report["usingSandboxSender"] = cfg.usingSandboxSender;

  // Verify the connector credentials without sending anything.
  try {
    const res = await fetch(EMAIL_VERIFY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.lovableKey}`,
        "X-Connection-Api-Key": cfg.resendKey,
      },
    });
    const body = await res.text();
    emailLog("verify_credentials", { status: res.status, body: body.slice(0, 400) });
    if (!res.ok) {
      return { ok: false as const, error: `Credential check failed (${res.status}): ${body}`, ...report };
    }
    report["credentials"] = body.slice(0, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    emailError("verify_credentials threw", { msg });
    return { ok: false as const, error: `Credential check threw: ${msg}`, ...report };
  }

  return { ok: true as const, ...report };
}
