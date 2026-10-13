// Server-only: fills the ORIGINAL PDF templates. The template pages are never
// redrawn — Offer values go into its existing form fields; Order Form values are
// written into the empty spaces of the original page.
import offerTpl from "@/assets/templates/offer-template.pdf.asset.json";
import orderTpl from "@/assets/templates/order-form-template.pdf.asset.json";
import fontAsset from "@/assets/DejaVuSans.ttf.asset.json";
import {
  type DocType, type OfferFields, type OrderFormFields,
  offerTotals, orderTotals, money,
} from "./admin-docs";

const ASSET_ORIGIN = "https://www.toreo.gr";
const cache = new Map<string, Uint8Array>();
async function asset(url: string) {
  const hit = cache.get(url);
  if (hit) return hit;
  const res = await fetch(ASSET_ORIGIN + url);
  if (!res.ok) throw new Error(`Template file unavailable (${res.status})`);
  const b = new Uint8Array(await res.arrayBuffer());
  cache.set(url, b);
  return b;
}

export async function renderDocument(type: DocType, number: string, fields: any): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const doc = await PDFDocument.load(await asset(type === "offer" ? offerTpl.url : orderTpl.url));
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await asset(fontAsset.url), { subset: true });
  doc.setTitle(`${type === "offer" ? "ΠΡΟΣΦΟΡΑ" : "ΔΕΛΤΙΟ ΠΑΡΑΓΓΕΛΙΑΣ"} ${number}`);
  doc.setAuthor("TOREO");

  if (type === "offer") {
    const f = fields as OfferFields;
    const t = offerTotals(f);
    const form = doc.getForm();
    const values: Record<string, string> = {
      quote_number: number,
      quote_date: f.quote_date,
      quote_validity_top: f.quote_validity,
      quote_validity: f.quote_validity,
      client_name: f.client_name,
      client_phone: f.client_phone,
      client_email: f.client_email,
      project_title: f.project_title,
      project_description: f.project_description,
      service_type: f.service_type,
      material: f.material,
      dimensions: f.dimensions,
      thickness_tolerance: f.thickness_tolerance,
      drawing_reference: f.drawing_reference,
      technical_notes: f.technical_notes,
      quantity: String(f.quantity),
      unit_price: money(f.unit_price),
      discount_percent: String(f.discount_percent),
      subtotal: money(t.subtotal),
      vat_percent: String(f.vat_percent),
      vat_amount: money(t.vat_amount),
      final_total: money(t.final_total),
      deposit_percent: String(f.deposit_percent),
      delivery_time: f.delivery_time,
      payment_terms: f.payment_terms,
      client_notes: f.client_notes,
      approval_name: f.approval_name,
      approval_date: f.approval_date,
    };
    for (const [name, v] of Object.entries(values)) {
      try { form.getTextField(name).setText(v ?? ""); } catch { /* field absent */ }
    }
    form.updateFieldAppearances(font);
    form.flatten();
  } else {
    const f = fields as OrderFormFields;
    const t = orderTotals(f);
    const page = doc.getPages()[0];
    const H = page.getHeight();
    const black = rgb(0, 0, 0);
    // top = top of the text line in the original layout (points from page top)
    const put = (s: string, x: number, top: number, opts: { size?: number; right?: boolean; maxW?: number } = {}) => {
      if (!s) return;
      const size = opts.size ?? 7.5;
      let text = s.replace(/\s+/g, " ").trim();
      if (opts.maxW) while (text.length > 1 && font.widthOfTextAtSize(text, size) > opts.maxW) text = text.slice(0, -2) + "…";
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: opts.right ? x - w : x, y: H - top - 7, size, font, color: black });
    };
    const white = rgb(1, 1, 1);
    // The Word original carries fixed sample dates; replace them with this document's dates.
    page.drawRectangle({ x: 427, y: H - 118, width: 42, height: 9, color: white });
    page.drawRectangle({ x: 499, y: H - 118, width: 42, height: 9, color: white });
    put(f.date, 428, 109.5, { size: 7 });
    put(f.valid_until, 500, 109.5, { size: 7 });
    put(number.replace(/^TR-\d{4}-/, ""), 541, 99.5, { size: 7 });

    const X = 332, MW = 205;
    put(f.to_name, X, 160.5, { maxW: MW });
    put(f.to_attention, 319, 170.5, { maxW: MW + 13 });
    put(f.to_address, X, 180.5, { maxW: MW });
    put(f.to_area, 322, 190.5, { maxW: MW + 10 });
    put(f.to_tax_office, 314, 200.5, { maxW: MW + 18 });
    put(f.to_vat_number, 314, 209.5, { maxW: MW + 18 });
    put(f.to_phone, 330, 219.5, { maxW: MW });
    put(f.to_email, 312, 229.5, { maxW: MW + 20 });

    const rows = [297, 313, 328.5, 345, 361, 377];
    t.lines.forEach((l, i) => {
      const top = rows[i];
      if (!l.description && !l.unit_price) return;
      put(l.description, 99, top, { maxW: 200 });
      put(String(l.quantity), 309, top);
      if (i >= 2) put(l.unit || "ΤΕΜ", 356, top); // rows 1-2 already print "ΤΕΜ"
      put(money(l.unit_price), 461, top, { right: true });
      put(money(l.total), 531, top, { right: true });
      if (i >= 3) { put("€", 463, top); put("€", 533, top); }
    });
    put(money(t.net), 227, 402, { right: true });
    put(money(t.vat), 227, 415, { right: true });
    put(money(t.total), 227, 428, { right: true });

    put(f.delivery_time, 75, 499, { size: 7, maxW: 148 });
    put(f.warranty, 119, 513, { size: 7, maxW: 104 });
    put(f.technical_details, 339, 515, { size: 6, maxW: 42 });
    put(f.remarks, 451, 515, { size: 6, maxW: 86 });
  }
  return await doc.save();
}

export async function sha256Hex(b: Uint8Array) {
  const h = await crypto.subtle.digest("SHA-256", b as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function toBase64(b: Uint8Array) {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
