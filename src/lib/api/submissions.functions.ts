import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submissionSchema = z.object({
  source: z.enum(["inquiry", "3d-printing-quote"]),
  name: z.string().trim().min(1).max(120),
  surname: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  service: z.string().trim().max(120).optional().nullable(),
  material: z.string().trim().max(120).optional().nullable(),
  stage: z.string().trim().max(120).optional().nullable(),
  dimensions: z.string().trim().max(200).optional().nullable(),
  quantity: z.string().trim().max(60).optional().nullable(),
  weight_g: z.number().nullable().optional(),
  print_hours: z.number().nullable().optional(),
  estimated_price: z.number().nullable().optional(),
  message: z.string().trim().max(4000).optional().nullable(),
  file_path: z
    .string()
    .max(500)
    .refine((v) => /^(inquiry|3dp)\/[A-Za-z0-9._-]+$/.test(v), "Invalid file path")
    .optional()
    .nullable(),
  file_name: z.string().max(255).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const NOTIFY_EMAIL = "INFO@TOREO.GR";

function esc(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function rowsHtml(rows: [string, unknown][]) {
  return rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-family:monospace;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#111;font-family:Arial,sans-serif;font-size:14px">${esc(v)}</td></tr>`,
    )
    .join("");
}

export const submitForm = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submissionSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Generate a signed URL for the uploaded file if present
    let fileUrl: string | null = null;
    if (data.file_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("submission-files")
        .createSignedUrl(data.file_path, 60 * 60 * 24 * 30); // 30 days
      fileUrl = signed?.signedUrl ?? null;
    }

    // 1. Save to DB
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("submissions")
      .insert({
        source: data.source,
        name: data.name,
        surname: data.surname ?? null,
        email: data.email,
        phone: data.phone ?? null,
        company: data.company ?? null,
        service: data.service ?? null,
        material: data.material ?? null,
        stage: data.stage ?? null,
        dimensions: data.dimensions ?? null,
        quantity: data.quantity ?? null,
        weight_g: data.weight_g ?? null,
        print_hours: data.print_hours ?? null,
        estimated_price: data.estimated_price ?? null,
        message: data.message ?? null,
        file_path: data.file_path ?? null,
        file_name: data.file_name ?? null,
        file_url: fileUrl,
        metadata: (data.metadata ?? null) as never,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("submission insert error", insertError);
      throw new Error("Could not save submission");
    }

    const submissionId = inserted?.id as string | undefined;

    // 1b. Mirror into quotes (admin-facing table)
    let quoteId: string | undefined;
    try {
      const { data: qr } = await (supabaseAdmin as any)
        .from("quotes")
        .insert({
          name: `${data.name}${data.surname ? " " + data.surname : ""}`,
          email: data.email,
          phone: data.phone ?? null,
          service: data.service ?? null,
          material: data.material ?? null,
          message: data.message ?? null,
          file_url: fileUrl,
          file_path: data.file_path ?? null,
          file_name: data.file_name ?? null,
          estimated_price: data.estimated_price ?? null,
          source: data.source,
          status: "New",
          metadata: data.metadata ?? null,
        })
        .select("id")
        .single();
      quoteId = (qr as { id?: string } | null)?.id;
    } catch (e) {
      console.error("quotes insert failed", e);
    }

    // 1c. Admin dashboard notification + realtime broadcast
    try {
      const fullName = `${data.name}${data.surname ? " " + data.surname : ""}`;
      const notifTitle = `New quote request from ${fullName}`;
      const notifBody = [data.service, data.material, data.email].filter(Boolean).join(" · ");
      const { data: notif } = await (supabaseAdmin as any)
        .from("admin_notifications")
        .insert({ quote_id: quoteId ?? null, title: notifTitle, body: notifBody })
        .select("*")
        .single();
      try {
        const channel = supabaseAdmin.channel("admin-notifications");
        await channel.send({
          type: "broadcast",
          event: "new",
          payload: { trigger: true },
        });
        await supabaseAdmin.removeChannel(channel);
      } catch (be) {
        console.error("realtime broadcast failed", be);
      }
    } catch (e) {
      console.error("admin notification insert failed", e);
    }


    // 2. Send email notification (best-effort, never block the user)
    const sourceLabel = data.source === "3d-printing-quote" ? "3D Printing Quote" : "Project Inquiry";
    const subject = `🚀 New Quote Request - TOREO`;

    const fileLine = data.file_name
      ? fileUrl
        ? `<a href="${esc(fileUrl)}" style="color:#1a73e8">${esc(data.file_name)}</a>`
        : esc(data.file_name)
      : "—";

    const allRows: [string, unknown][] = [
      ["Source", sourceLabel],
      ["Name", `${data.name}${data.surname ? " " + data.surname : ""}`],
      ["Email", data.email],
      ["Phone", data.phone],
      ["Company", data.company],
      ["Service", data.service],
      ["Material", data.material],
      ["Stage", data.stage],
      ["Dimensions", data.dimensions],
      ["Quantity", data.quantity],
      ["Weight (g)", data.weight_g],
      ["Print time (h)", data.print_hours],
      ["Estimated price", data.estimated_price != null ? `€${data.estimated_price.toFixed(2)}` : null],
      ["Message", data.message],
      ["Uploaded file", fileLine],
    ];

    const html = `<!doctype html><html><body style="background:#f6f6f6;margin:0;padding:24px;font-family:Arial,sans-serif">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden">
        <tr><td style="padding:24px 28px;background:#0b0b0b;color:#fff">
          <div style="font-family:monospace;font-size:11px;letter-spacing:0.3em;color:#7aa8ff;text-transform:uppercase">TOREO · New Submission</div>
          <div style="font-size:22px;font-weight:bold;margin-top:6px">${esc(sourceLabel)}</div>
        </td></tr>
        <tr><td style="padding:0 8px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rowsHtml(allRows)}</table>
        </td></tr>
        <tr><td style="padding:16px 28px;color:#999;font-size:11px;font-family:monospace">Submission ID: ${esc(submissionId)}</td></tr>
      </table></body></html>`;

    const textBody = allRows
      .map(([k, v]) => `${k}: ${v ?? "—"}`)
      .join("\n");

    let emailSent = false;
    let emailError: string | null = null;

    try {
      const lovableKey = process.env.LOVABLE_API_KEY;
      const resendKey = process.env.RESEND_API_KEY;

      if (lovableKey && resendKey) {
        // Resend connector via Lovable gateway
        const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "TOREO Notifications <onboarding@resend.dev>",
            to: [NOTIFY_EMAIL],
            reply_to: data.email,
            subject,
            html,
            text: textBody,
          }),
        });
        if (!res.ok) {
          emailError = `Resend ${res.status}: ${await res.text()}`;
          console.error(emailError);
        } else {
          emailSent = true;
        }
      } else {
        emailError = "Email provider not configured (Resend connector missing).";
        console.warn(emailError);
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
      console.error("Email send failed", e);
    }

    // 3. Discord webhook notification (best-effort)
    try {
      const raw = process.env.DISCORD_WEBHOOK_URL?.trim().replace(/^["']|["']$/g, "");
      const webhook = raw?.match(/https:\/\/discord(?:app)?\.com\/api\/webhooks\/\S+/)?.[0];
      if (webhook) {
        const discordEsc = (v: string) => v.replace(/[\\[\]()*_`~>|]/g, "\\$&");
        const fullName = `${data.name}${data.surname ? " " + data.surname : ""}`;
        const fields: { name: string; value: string; inline?: boolean }[] = [];
        const push = (name: string, v: unknown, inline = true) => {
          if (v === null || v === undefined || v === "") return;
          fields.push({ name, value: discordEsc(String(v)).slice(0, 1024), inline });
        };
        push("👤 Name", fullName);
        push("📧 Email", data.email);
        push("📞 Phone", data.phone);
        push("🛠️ Service", data.service);
        push("🧪 Material", data.material);
        if (data.estimated_price != null) push("💶 Estimated Price", `€${data.estimated_price.toFixed(2)}`);
        if (data.message) fields.push({ name: "📝 Message", value: discordEsc(data.message).slice(0, 1024), inline: false });
        if (data.file_name || fileUrl) {
          const safeName = discordEsc(data.file_name ?? "Download");
          fields.push({
            name: "📎 Uploaded File",
            value: fileUrl ? `[${safeName}](${fileUrl})` : (discordEsc(data.file_name ?? "—")),
            inline: false,
          });
        }

        fields.push({
          name: "🕒 Date & Time",
          value: new Date().toLocaleString("en-GB", { timeZone: "Europe/Athens" }),
          inline: false,
        });

        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "TOREO",
            embeds: [
              {
                title: "🚀 New Quote Request",
                description: `**${sourceLabel}**`,
                color: 0x3b82f6,
                fields,
                timestamp: new Date().toISOString(),
                footer: { text: submissionId ? `ID: ${submissionId}` : "TOREO" },
              },
            ],
          }),
        });
        if (!res.ok) console.error(`Discord ${res.status}: ${await res.text()}`);
      }
    } catch (e) {
      console.error("Discord webhook failed", e);
    }


    if (submissionId) {
      await supabaseAdmin
        .from("submissions")
        .update({ email_sent: emailSent, email_error: emailError })
        .eq("id", submissionId);
    }

    return { ok: true, id: submissionId, emailSent };
  });
