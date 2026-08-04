// Branded emails for accepting or declining a customer quote.
export async function sendQuoteAcceptedEmail(opts: {
  to: string;
  orderCode: string;
  price: number;
  currency?: string;
  deliveryTime?: string | null;
  paymentTerms?: string | null;
  message?: string | null;
  orderId?: string | null;
}) {
  if (!opts.to) return { ok: false };
  const { sendBrandedEmail } = await import("@/lib/email/template.server");
  const currency = opts.currency ?? "EUR";
  return sendBrandedEmail({
    to: opts.to,
    replyTo: "INFO@TOREO.GR",
    subject: `Quote Accepted – ${opts.orderCode}`,
    context: { orderId: opts.orderId ?? null, orderCode: opts.orderCode, emailType: "quote_accepted" },
    params: {
      kicker: "Quote Accepted",
      headline: "Your quotation is confirmed.",
      orderCode: opts.orderCode,
      intro: `<p style="margin:0">We are pleased to confirm your order. Please find the details below and proceed with the deposit to schedule production.</p>`,
      sections: [
        {
          title: "Confirmed Details",
          rows: [
            { label: "Total", value: `${currency === "EUR" ? "€" : currency + " "}${Number(opts.price).toFixed(2)}` },
            { label: "Delivery", value: opts.deliveryTime ?? "To be confirmed" },
            { label: "Payment terms", value: opts.paymentTerms ?? "50% deposit / 50% before shipping" },
          ],
        },
      ],
      outro: opts.message ? `<p style="margin:0;white-space:pre-wrap">${escapeHtml(opts.message)}</p>` : undefined,
      cta: { label: "Open your portal", url: `https://www.toreo.gr/track?code=${encodeURIComponent(opts.orderCode)}` },
    },
  });
}

export async function sendQuoteDeclinedEmail(opts: {
  to: string;
  orderCode: string;
  reason?: string | null;
  message?: string | null;
  orderId?: string | null;
}) {
  if (!opts.to) return { ok: false };
  const { sendBrandedEmail } = await import("@/lib/email/template.server");
  return sendBrandedEmail({
    to: opts.to,
    replyTo: "INFO@TOREO.GR",
    subject: `Update on your quote – ${opts.orderCode}`,
    context: { orderId: opts.orderId ?? null, orderCode: opts.orderCode, emailType: "quote_declined" },
    params: {
      kicker: "Quote Update",
      headline: "We are unable to proceed with this quote.",
      orderCode: opts.orderCode,
      intro: `<p style="margin:0">Thank you for reaching out to TOREO. Unfortunately we cannot move forward with this request at the moment.</p>`,
      sections: opts.reason
        ? [{ title: "Reason", rows: [{ label: "Notes", value: opts.reason }] }]
        : undefined,
      outro: opts.message
        ? `<p style="margin:0;white-space:pre-wrap">${escapeHtml(opts.message)}</p>`
        : `<p style="margin:0">If you'd like to discuss alternatives or resubmit a modified project, please reply to this email.</p>`,
      cta: { label: "Contact us", url: "mailto:INFO@TOREO.GR" },
    },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
