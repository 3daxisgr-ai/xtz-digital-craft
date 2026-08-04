/**
 * Branded transactional email template for TOREO.
 * Dark industrial styling, premium manufacturing aesthetic.
 * Inline CSS only — email clients strip <style>/external CSS.
 */

const LOGO_URL =
  "https://www.toreo.gr/__l5e/assets-v1/ced9dc77-1474-48b6-85e3-e476a30a8ed3/toreo-white-logo.png";

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

export type EmailRow = { label: string; value: unknown };
export type EmailSection = { title: string; rows: EmailRow[] };
export type EmailCTA = { label: string; url: string };

export interface BrandedEmailParams {
  preview?: string;
  /** mono kicker line above the headline, e.g. "ORDER CONFIRMATION" */
  kicker?: string;
  /** the H1 line */
  headline: string;
  /** intro paragraph(s) above the data table */
  intro?: string;
  /** optional ORDER-ID pill at the top */
  orderCode?: string | null;
  /** status badge, e.g. "Waiting for Quote" */
  status?: string | null;
  /** structured sections, each renders as a titled table */
  sections?: EmailSection[];
  /** outro paragraph(s) below the data */
  outro?: string;
  /** big CTA button */
  cta?: EmailCTA;
  /** custom footer note before the standard contact block */
  footerNote?: string;
}

function renderRows(rows: EmailRow[]): string {
  return rows
    .filter((r) => r.value !== null && r.value !== undefined && r.value !== "")
    .map(
      (r) =>
        `<tr>
          <td style="padding:10px 14px;border-bottom:1px solid #1f2230;color:#7a849a;font-family:'Courier New',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;white-space:nowrap;vertical-align:top;width:38%">${esc(r.label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #1f2230;color:#e6ebf3;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45">${esc(r.value)}</td>
        </tr>`,
    )
    .join("");
}

function renderSection(s: EmailSection): string {
  const body = renderRows(s.rows);
  if (!body) return "";
  return `
    <tr><td style="padding:24px 32px 8px 32px">
      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;color:#5e8bff;text-transform:uppercase">${esc(s.title)}</div>
    </td></tr>
    <tr><td style="padding:0 24px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#0f1320;border:1px solid #1f2230;border-radius:6px">
        ${body}
      </table>
    </td></tr>`;
}

export function brandedEmailHtml(p: BrandedEmailParams): string {
  const sections = (p.sections ?? []).map(renderSection).join("");

  const orderPill = p.orderCode
    ? `<div style="display:inline-block;background:#0c1020;border:1px solid #2a3550;border-radius:4px;padding:10px 18px;margin-top:18px">
         <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.3em;color:#7a849a;text-transform:uppercase">Order ID</div>
         <div style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.1em;margin-top:4px">${esc(p.orderCode)}</div>
       </div>`
    : "";

  const statusPill = p.status
    ? `<div style="display:inline-block;background:#1a2750;color:#7aa8ff;border:1px solid #2d4380;border-radius:999px;padding:6px 14px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;margin-top:14px;margin-left:8px;vertical-align:top">${esc(p.status)}</div>`
    : "";

  const cta = p.cta
    ? `<tr><td align="center" style="padding:24px 32px 8px 32px">
        <a href="${esc(p.cta.url)}" style="display:inline-block;background:#5e8bff;color:#0a0d18;text-decoration:none;padding:14px 32px;border-radius:4px;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;letter-spacing:0.22em;text-transform:uppercase">${esc(p.cta.label)} →</a>
       </td></tr>`
    : "";

  const intro = p.intro
    ? `<tr><td style="padding:8px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#c7cfdd">${p.intro}</td></tr>`
    : "";

  const outro = p.outro
    ? `<tr><td style="padding:20px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#c7cfdd">${p.outro}</td></tr>`
    : "";

  const footerNote = p.footerNote
    ? `<tr><td style="padding:18px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#9aa3b8">${p.footerNote}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark only" />
  <title>${esc(p.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#06080f;font-family:Arial,Helvetica,sans-serif">
  ${p.preview ? `<div style="display:none;max-height:0;overflow:hidden;color:#06080f">${esc(p.preview)}</div>` : ""}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#06080f;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;width:100%;background:#0a0d18;border:1px solid #1f2230;border-radius:10px;overflow:hidden">

        <!-- HEADER -->
        <tr><td style="padding:32px 32px 24px 32px;background:linear-gradient(135deg,#0a0d18 0%,#111a30 100%);border-bottom:1px solid #1f2230">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="vertical-align:middle">
                <img src="${LOGO_URL}" alt="TOREO" height="34" style="height:34px;display:block;border:0;outline:none" />
              </td>
              <td align="right" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;color:#5e8bff;text-transform:uppercase;vertical-align:middle">
                Manufacturing&nbsp;·&nbsp;EST.&nbsp;1996
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- TITLE BLOCK -->
        <tr><td style="padding:32px 32px 8px 32px">
          ${p.kicker ? `<div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.3em;color:#5e8bff;text-transform:uppercase;margin-bottom:10px">${esc(p.kicker)}</div>` : ""}
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.25;color:#ffffff;letter-spacing:-0.01em">${esc(p.headline)}</h1>
          ${orderPill}${statusPill}
        </td></tr>

        ${intro}
        ${sections}
        ${cta}
        ${outro}
        ${footerNote}

        <!-- CONTACT FOOTER -->
        <tr><td style="padding:28px 32px 12px 32px">
          <div style="border-top:1px solid #1f2230;padding-top:20px">
            <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.3em;color:#5e8bff;text-transform:uppercase;margin-bottom:12px">Need to change something?</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#c7cfdd">
              If you need to modify your request after submission, contact us by phone or email and mention your Order ID.
            </div>
            <div style="margin-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#e6ebf3">
              📞 <a href="tel:+306970609960" style="color:#e6ebf3;text-decoration:none">+30 6970609960</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              ✉ <a href="mailto:INFO@TOREO.GR" style="color:#e6ebf3;text-decoration:none">INFO@TOREO.GR</a>
            </div>
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px 28px 32px;background:#06080f;border-top:1px solid #1f2230">
          <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.25em;color:#5e8bff;text-transform:uppercase">TOREO Manufacturing</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#5e6577;margin-top:6px">
            Industrial precision · Thessaloniki, Greece · <a href="https://www.toreo.gr" style="color:#7a849a;text-decoration:none">toreo.gr</a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function brandedEmailText(p: BrandedEmailParams): string {
  const lines: string[] = [];
  lines.push("TOREO Manufacturing");
  if (p.kicker) lines.push(p.kicker.toUpperCase());
  lines.push("");
  lines.push(p.headline);
  if (p.orderCode) lines.push(`Order ID: ${p.orderCode}`);
  if (p.status) lines.push(`Status: ${p.status}`);
  lines.push("");
  if (p.intro) lines.push(p.intro.replace(/<[^>]+>/g, ""));
  for (const s of p.sections ?? []) {
    lines.push("");
    lines.push(s.title);
    lines.push("-".repeat(s.title.length));
    for (const r of s.rows) {
      if (r.value === null || r.value === undefined || r.value === "") continue;
      lines.push(`${r.label}: ${String(r.value)}`);
    }
  }
  if (p.cta) {
    lines.push("");
    lines.push(`${p.cta.label}: ${p.cta.url}`);
  }
  if (p.outro) {
    lines.push("");
    lines.push(p.outro.replace(/<[^>]+>/g, ""));
  }
  lines.push("");
  lines.push("Contact: INFO@TOREO.GR · +30 6970609960");
  lines.push("https://www.toreo.gr");
  return lines.join("\n");
}

/**
 * Send a branded email through the Resend connector (Lovable gateway).
 * Never throws — always returns a result object with the exact provider error
 * so callers can surface it. Every step is logged server-side.
 */
export async function sendBrandedEmail(opts: {
  to: string | string[];
  cc?: string | string[] | null;
  subject: string;
  params: BrandedEmailParams;
  replyTo?: string;
  from?: string;
  attachments?: { filename: string; content: string }[];
}): Promise<{ ok: boolean; error?: string; messageId?: string; status?: number }> {
  const { resolveEmailConfig, emailLog, emailError, maskEmail, EMAIL_GATEWAY_URL } = await import(
    "@/lib/email/config.server"
  );

  const cfg = resolveEmailConfig();
  emailLog("send:start", { to: maskEmail(opts.to), subject: opts.subject, configured: cfg.ok });

  if (!cfg.ok) {
    emailError("send:not-configured", { missing: cfg.missing, subject: opts.subject });
    return { ok: false, error: cfg.error };
  }

  if (cfg.usingSandboxSender) {
    emailError("send:sandbox-sender", {
      note:
        "Sending from onboarding@resend.dev — Resend only delivers this address to the account owner. " +
        "Set EMAIL_FROM to an address on a domain verified in Resend (e.g. TOREO <info@toreo.gr>).",
    });
  }

  const payload = {
    from: opts.from ?? cfg.from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    ...(opts.cc ? { cc: Array.isArray(opts.cc) ? opts.cc : [opts.cc] } : {}),
    reply_to: opts.replyTo,
    subject: opts.subject,
    html: brandedEmailHtml(opts.params),
    text: brandedEmailText(opts.params),
    ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
  };

  try {
    emailLog("send:request", { from: payload.from, to: maskEmail(payload.to), attachments: opts.attachments?.length ?? 0 });
    const res = await fetch(EMAIL_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.lovableKey}`,
        "X-Connection-Api-Key": cfg.resendKey,
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    if (!res.ok) {
      const error = `Email provider returned ${res.status}: ${raw}`;
      emailError("send:provider-error", { status: res.status, body: raw.slice(0, 800), subject: opts.subject });
      return { ok: false, error, status: res.status };
    }

    let messageId: string | undefined;
    try {
      const j: any = JSON.parse(raw);
      messageId = j?.id ?? j?.data?.id;
      // Some providers report failure inside a 2xx body.
      if (j?.error) {
        const error = `Email provider error: ${typeof j.error === "string" ? j.error : JSON.stringify(j.error)}`;
        emailError("send:provider-body-error", { body: raw.slice(0, 800) });
        return { ok: false, error, status: res.status };
      }
    } catch {
      /* provider returned no JSON body */
    }

    emailLog("send:ok", { messageId: messageId ?? null, to: maskEmail(payload.to), subject: opts.subject });
    return { ok: true, messageId, status: res.status };
  } catch (e) {
    const error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    emailError("send:exception", { error, subject: opts.subject });
    return { ok: false, error };
  }
}


