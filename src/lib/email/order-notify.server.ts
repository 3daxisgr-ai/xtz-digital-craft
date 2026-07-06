// Server-only helpers to send branded customer emails for order lifecycle events.
// Kept separate so both the JWT-authed and cookie-authed admin surfaces can call it.

import { STATUS_LABEL } from "@/lib/api/orders.functions";

type StatusTemplate = {
  subject: (code: string) => string;
  kicker: string;
  headline: (code: string) => string;
  intro: (o: any) => string;
  outro?: (o: any) => string;
  extraRows?: (o: any) => { label: string; value: unknown }[];
};

const STATUS_TEMPLATES: Record<string, StatusTemplate> = {
  quote_received: {
    subject: (c) => `Quote Request Received – ${c}`,
    kicker: "Order Received",
    headline: () => "We have received your request.",
    intro: () =>
      `<p style="margin:0">Our engineering team will review your files and respond within one business day.</p>`,
  },
  engineering_review: {
    subject: (c) => `Engineering Review Started – ${c}`,
    kicker: "Engineering Review",
    headline: () => "Your project is under engineering review.",
    intro: () =>
      `<p style="margin:0">Our engineers are reviewing technical feasibility, materials, and tolerances. You will receive a formal quotation shortly.</p>`,
  },
  quote_sent: {
    subject: (c) => `Your TOREO Quote is Ready – ${c}`,
    kicker: "Quote Ready",
    headline: () => "Your quotation is ready.",
    intro: (o) =>
      `<p style="margin:0">Total: <strong style="color:#ffffff;font-size:18px">€${Number(o.quote_price ?? 0).toFixed(2)}</strong></p>`,
    outro: () =>
      `<p style="margin:0">Open your portal to review the full quote and approve to begin production.</p>`,
  },
  awaiting_approval: {
    subject: (c) => `Quote Approved – ${c}`,
    kicker: "Quote Approved",
    headline: () => "Your quote is approved and moving forward.",
    intro: () =>
      `<p style="margin:0">Thank you. Your order is being prepared for the production schedule.</p>`,
  },
  payment_received: {
    subject: (c) => `Scheduled for Production – ${c}`,
    kicker: "Scheduled for Production",
    headline: () => "Your order is scheduled for production.",
    intro: () =>
      `<p style="margin:0">Your order has been added to the production schedule. We will notify you again when manufacturing begins.</p>`,
  },
  production: {
    subject: (c) => `Manufacturing Started – ${c}`,
    kicker: "Manufacturing",
    headline: () => "Manufacturing has started.",
    intro: () =>
      `<p style="margin:0">Your order is on the manufacturing floor. We will notify you again when it enters quality control.</p>`,
  },
  quality_inspection: {
    subject: (c) => `Quality Control – ${c}`,
    kicker: "Quality Control",
    headline: () => "Your order is undergoing quality control.",
    intro: () =>
      `<p style="margin:0">Every part is verified against drawings, tolerances, and surface specification before shipping.</p>`,
  },
  ready_for_shipping: {
    subject: (c) => `Packaging – ${c}`,
    kicker: "Packaging",
    headline: () => "Your order is being packaged for shipment.",
    intro: () =>
      `<p style="margin:0">Your order has passed quality control and is being carefully packaged for dispatch.</p>`,
  },
  shipped: {
    subject: (c) => `Order Shipped – ${c}`,
    kicker: "Shipped",
    headline: () => "Your order is on its way.",
    intro: (o) =>
      `<p style="margin:0">Your order has been shipped via <strong style="color:#ffffff">${o.courier ?? "courier"}</strong>.</p>`,
    extraRows: (o) => [
      { label: "Courier", value: o.courier },
      { label: "Tracking number", value: o.tracking_number },
      { label: "Estimated delivery", value: o.estimated_delivery },
    ],
    outro: (o) =>
      o.tracking_url
        ? `<p style="margin:0"><a href="${o.tracking_url}" style="color:#7aa8ff">Track your shipment with the courier →</a></p>`
        : "",
  },
  delivered: {
    subject: (c) => `Order Delivered – ${c}`,
    kicker: "Delivered",
    headline: () => "Your order has been delivered.",
    intro: () =>
      `<p style="margin:0">Thank you for choosing TOREO. We hope the parts meet your expectations. We'd appreciate your feedback.</p>`,
  },
  cancelled: {
    subject: (c) => `Order Cancelled – ${c}`,
    kicker: "Cancelled",
    headline: () => "Your order has been cancelled.",
    intro: () =>
      `<p style="margin:0">This order has been cancelled. If this was unexpected, please contact us.</p>`,
  },
};

export async function sendStatusEmail(order: any, status: string) {
  const tmpl = STATUS_TEMPLATES[status];
  if (!tmpl || !order?.customer_email) return;
  const { sendBrandedEmail } = await import("@/lib/email/template.server");
  const code = order.order_code ?? "";
  const trackUrl = `https://www.toreo.gr/track?code=${encodeURIComponent(code)}`;
  await sendBrandedEmail({
    to: order.customer_email,
    replyTo: "INFO@TOREO.GR",
    subject: tmpl.subject(code),
    params: {
      preview: `Your TOREO order ${code} status: ${STATUS_LABEL[status] ?? status}`,
      kicker: tmpl.kicker,
      headline: tmpl.headline(code),
      orderCode: code,
      status: STATUS_LABEL[status] ?? status,
      intro: tmpl.intro(order),
      sections: tmpl.extraRows ? [{ title: "Details", rows: tmpl.extraRows(order) }] : undefined,
      outro: tmpl.outro?.(order),
      cta: { label: "Open your portal", url: trackUrl },
    },
  });
}

export async function sendCustomerEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  opts?: { kicker?: string; headline?: string; orderCode?: string; cta?: { label: string; url: string } },
) {
  if (!to) return;
  const { sendBrandedEmail } = await import("@/lib/email/template.server");
  await sendBrandedEmail({
    to,
    replyTo: "INFO@TOREO.GR",
    subject,
    params: {
      kicker: opts?.kicker ?? "Order Update",
      headline: opts?.headline ?? subject,
      orderCode: opts?.orderCode ?? null,
      intro: bodyHtml,
      cta: opts?.cta,
    },
  });
}

export function isKnownStatus(s: string | null | undefined) {
  return !!s && s in STATUS_TEMPLATES;
}
