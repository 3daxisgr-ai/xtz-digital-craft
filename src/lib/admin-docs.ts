// Pure, deterministic helpers for the admin Offer / Order Form documents.
// No I/O here — unit-tested in admin-docs.test.ts.

export type DocType = "offer" | "order_form";
export type DocStatus = "draft" | "approved" | "sending" | "sent" | "failed";

export const DOC_LABEL: Record<DocType, string> = {
  offer: "Quotation / Offer",
  order_form: "Order Form",
};

export interface OfferFields {
  quote_date: string;
  quote_validity: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  project_title: string;
  project_description: string;
  service_type: string;
  material: string;
  dimensions: string;
  thickness_tolerance: string;
  drawing_reference: string;
  technical_notes: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  vat_percent: number;
  deposit_percent: number;
  delivery_time: string;
  payment_terms: string;
  client_notes: string;
  approval_name: string;
  approval_date: string;
}

export interface OrderLine {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export interface OrderFormFields {
  date: string;
  valid_until: string;
  to_name: string;
  to_attention: string;
  to_address: string;
  to_area: string;
  to_tax_office: string;
  to_vat_number: string;
  to_phone: string;
  to_email: string;
  lines: OrderLine[];
  vat_percent: number;
  delivery_time: string;
  warranty: string;
  technical_details: string;
  remarks: string;
}

export const ORDER_FORM_MAX_LINES = 6;

export const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export function offerTotals(f: Pick<OfferFields, "quantity" | "unit_price" | "discount_percent" | "vat_percent">) {
  const gross = round2(Math.max(0, f.quantity) * Math.max(0, f.unit_price));
  const disc = Math.min(100, Math.max(0, f.discount_percent));
  const subtotal = round2(gross * (1 - disc / 100));
  const vat_amount = round2((subtotal * Math.max(0, f.vat_percent)) / 100);
  return { subtotal, vat_amount, final_total: round2(subtotal + vat_amount) };
}

export function orderTotals(f: Pick<OrderFormFields, "lines" | "vat_percent">) {
  const lines = f.lines.slice(0, ORDER_FORM_MAX_LINES).map((l) => ({
    ...l,
    total: round2(Math.max(0, l.quantity) * Math.max(0, l.unit_price)),
  }));
  const net = round2(lines.reduce((s, l) => s + l.total, 0));
  const vat = round2((net * Math.max(0, f.vat_percent)) / 100);
  return { lines, net, vat, total: round2(net + vat) };
}

/** Greek money format: 1.234,50 */
export function money(n: number): string {
  return round2(n).toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Document number: the order code, plus -R2, -R3… for later documents of the same type. */
export function documentNumber(orderCode: string, existingCount: number): string {
  return existingCount <= 0 ? orderCode : `${orderCode}-R${existingCount + 1}`;
}

/** Which transitions an admin may trigger. Sending is only allowed from "approved" (or retry after "failed"). */
export function canEdit(s: DocStatus) {
  return s === "draft" || s === "approved" || s === "failed";
}
export function canSend(s: DocStatus) {
  return s === "approved" || s === "failed";
}

export function todayGr(d = new Date()): string {
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Athens" });
}
export function addDaysGr(days: number, d = new Date()): string {
  return todayGr(new Date(d.getTime() + days * 86400000));
}

export function defaultOffer(o: any): OfferFields {
  return {
    quote_date: todayGr(),
    quote_validity: "15 ημέρες",
    client_name: o?.company ? `${o.customer_name ?? ""} — ${o.company}` : o?.customer_name ?? "",
    client_phone: o?.customer_phone ?? "",
    client_email: o?.customer_email ?? "",
    project_title: "",
    project_description: o?.message ? String(o.message).slice(0, 400) : "",
    service_type: o?.service ?? "",
    material: o?.material ?? "",
    dimensions: o?.dimensions ?? "",
    thickness_tolerance: "",
    drawing_reference: "",
    technical_notes: "",
    quantity: Number(o?.quantity) || 1,
    unit_price: 0,
    discount_percent: 0,
    vat_percent: 24,
    deposit_percent: 50,
    delivery_time: "3-5 εργάσιμες ημέρες",
    payment_terms: "Η κατασκευή ξεκινά μετά από προκαταβολή.",
    client_notes: "",
    approval_name: "",
    approval_date: "",
  };
}

export function defaultOrderForm(o: any): OrderFormFields {
  return {
    date: todayGr(),
    valid_until: addDaysGr(15),
    to_name: o?.company || o?.customer_name || "",
    to_attention: o?.company ? o?.customer_name ?? "" : "",
    to_address: "",
    to_area: "",
    to_tax_office: "",
    to_vat_number: "",
    to_phone: o?.customer_phone ?? "",
    to_email: o?.customer_email ?? "",
    lines: [{ description: [o?.service, o?.material].filter(Boolean).join(" — "), quantity: Number(o?.quantity) || 1, unit: "ΤΕΜ", unit_price: 0 }],
    vat_percent: 24,
    delivery_time: "",
    warranty: "",
    technical_details: "",
    remarks: "",
  };
}
