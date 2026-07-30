// Server-side TOREO quotation PDF renderer.
// Real A4, selectable text, embedded DejaVu Sans (full Greek + € coverage).
// Visual system follows the TOREO ΠΡΟΣΦΟΡΑ reference document:
// black header band, light-grey content cards, subtle blue accents, dark footer.
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { computeTotals, lineNet, lineVat, lineTotal, round2, type QuoteLine } from "@/lib/quote-calc";

export type QuotePdfInput = {
  lang: "el" | "en";
  number: string;
  issueDate: string;
  orderReference: string;
  validity: string;
  company: {
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    vat?: string | null;
    legal?: string | null;
  };
  customer: {
    name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    vat?: string | null;
    address?: string | null;
  };
  project: {
    title?: string | null;
    description?: string | null;
    service?: string | null;
    material?: string | null;
    dimensions?: string | null;
    thickness?: string | null;
    tolerance?: string | null;
    drawing_code?: string | null;
    extra?: string | null;
  };
  lines: QuoteLine[];
  currency: string;
  depositPct: number;
  paid: number;
  terms: {
    payment_terms?: string | null;
    delivery_time?: string | null;
    notes?: string | null;
  };
  image?: { bytes: Uint8Array; kind: "png" | "jpg" } | null;
  logo?: Uint8Array | null;
  fontRegular: Uint8Array;
  fontBold: Uint8Array;
};

const A4: [number, number] = [595.28, 841.89];
const M = 36; // page margin
const INK = rgb(0.07, 0.08, 0.1);
const BLACK = rgb(0.04, 0.05, 0.06);
const MUTED = rgb(0.42, 0.46, 0.53);
const LINE = rgb(0.85, 0.87, 0.9);
const CARD = rgb(0.97, 0.975, 0.985);
const ACCENT = rgb(0.13, 0.4, 0.85);
const ACCENT_SOFT = rgb(0.92, 0.945, 0.99);
const WHITE = rgb(1, 1, 1);

const L = {
  el: {
    title: "ΠΡΟΣΦΟΡΑ",
    sub1: "Επαγγελματική προσφορά",
    sub2: "Μηχανική και Κατασκευή",
    address: "Διεύθυνση",
    phone: "Τηλέφωνο",
    email: "Ηλεκτρονικό ταχυδρομείο",
    website: "Ιστότοπος",
    vat: "ΑΦΜ",
    quoteInfo: "Στοιχεία Προσφοράς",
    quoteNo: "Αριθμός προσφοράς",
    date: "Ημερομηνία",
    validity: "Ισχύς προσφοράς",
    orderRef: "Κωδικός έργου",
    customerInfo: "Στοιχεία Πελάτη",
    name: "Ονοματεπώνυμο / Επωνυμία",
    company: "Εταιρεία",
    custAddress: "Διεύθυνση",
    projectInfo: "Στοιχεία Έργου / Προϊόντος",
    projTitle: "Τίτλος έργου / προϊόντος",
    description: "Περιγραφή",
    service: "Υπηρεσία / Κατεργασία",
    material: "Υλικό",
    dimensions: "Διαστάσεις",
    thickness: "Πάχος / Ανοχή",
    drawing: "Κωδικός / Αναφορά σχεδίου",
    extra: "Πρόσθετες τεχνικές πληροφορίες",
    imageTitle: "Εικόνα / Τεχνικό σχέδιο",
    financial: "Οικονομική Προσφορά",
    thDesc: "Περιγραφή",
    thQty: "Ποσότητα",
    thUnit: "Μονάδα",
    thPrice: "Τιμή μονάδας",
    thDisc: "Έκπτωση",
    thNet: "Καθαρή αξία",
    thVatPct: "ΦΠΑ %",
    thVat: "Ποσό ΦΠΑ",
    thTotal: "Σύνολο",
    subtotal: "Μερικό σύνολο",
    discount: "Συνολική έκπτωση",
    net: "Καθαρή αξία",
    vatAmount: "Ποσό ΦΠΑ",
    grand: "Τελικό ποσό",
    deposit: "Προκαταβολή",
    paid: "Καταβληθέν ποσό",
    balance: "Υπόλοιπο",
    delivery: "Χρόνος παράδοσης",
    termsTitle: "Όροι και Σημειώσεις",
    payTerms: "Τρόπος / όροι πληρωμής",
    notes: "Σημειώσεις προς τον πελάτη",
    approval: "Έγκριση",
    signature: "Ονοματεπώνυμο / Υπογραφή Πελάτη",
    sigDate: "Ημερομηνία",
    footerNote: "Το παρόν έγγραφο αποτελεί εμπορική προσφορά και δεν αποτελεί φορολογικό παραστατικό.",
    page: "Σελίδα",
  },
  en: {
    title: "QUOTATION",
    sub1: "Professional quotation",
    sub2: "Engineering and Manufacturing",
    address: "Address",
    phone: "Phone",
    email: "Email",
    website: "Website",
    vat: "VAT ID",
    quoteInfo: "Quotation Details",
    quoteNo: "Quotation number",
    date: "Date",
    validity: "Validity",
    orderRef: "Project reference",
    customerInfo: "Customer Details",
    name: "Full name / Company name",
    company: "Company",
    custAddress: "Address",
    projectInfo: "Project / Product Details",
    projTitle: "Project / product title",
    description: "Description",
    service: "Service / Process",
    material: "Material",
    dimensions: "Dimensions",
    thickness: "Thickness / Tolerance",
    drawing: "Drawing code / reference",
    extra: "Additional technical information",
    imageTitle: "Image / Technical drawing",
    financial: "Commercial Offer",
    thDesc: "Description",
    thQty: "Qty",
    thUnit: "Unit",
    thPrice: "Unit price",
    thDisc: "Disc.",
    thNet: "Net value",
    thVatPct: "VAT %",
    thVat: "VAT amount",
    thTotal: "Line total",
    subtotal: "Subtotal",
    discount: "Total discount",
    net: "Net value",
    vatAmount: "VAT amount",
    grand: "Grand total",
    deposit: "Deposit",
    paid: "Amount paid",
    balance: "Remaining balance",
    delivery: "Delivery time",
    termsTitle: "Terms and Notes",
    payTerms: "Payment terms",
    notes: "Notes to the customer",
    approval: "Approval",
    signature: "Customer name / signature",
    sigDate: "Date",
    footerNote: "This document is a commercial quotation and is not a tax invoice.",
    page: "Page",
  },
};

function fmt(n: number, currency: string): string {
  const v = round2(n).toFixed(2);
  return currency === "EUR" ? `${v} \u20AC` : `${v} ${currency}`;
}

export async function renderQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const t = L[input.lang];
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  let font: PDFFont;
  let bold: PDFFont;
  try {
    font = await doc.embedFont(input.fontRegular, { subset: true });
    bold = await doc.embedFont(input.fontBold, { subset: true });
  } catch {
    font = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  doc.setTitle(`${t.title} ${input.number}`);
  doc.setAuthor("TOREO");
  doc.setSubject(`${t.title} ${input.number} — ${input.orderReference}`);
  doc.setCreator("TOREO Admin");

  const pages: PDFPage[] = [];
  let page = doc.addPage(A4);
  pages.push(page);
  let y = A4[1];

  const W = A4[0] - M * 2;

  // ---------- primitives ----------
  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const out: string[] = [];
    for (const raw of String(text ?? "").split(/\r?\n/)) {
      let cur = "";
      for (const word of raw.split(/\s+/)) {
        const next = cur ? `${cur} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) > maxW && cur) {
          out.push(cur);
          cur = word;
        } else {
          cur = next;
        }
      }
      out.push(cur);
    }
    return out;
  };

  const text = (
    s: string,
    x: number,
    ty: number,
    o: { size?: number; f?: PDFFont; color?: any; maxW?: number; align?: "left" | "right" | "center" } = {},
  ) => {
    const size = o.size ?? 9;
    const f = o.f ?? font;
    const color = o.color ?? INK;
    const str = String(s ?? "");
    if (!str) return ty;
    const lines = o.maxW ? wrap(str, f, size, o.maxW) : [str];
    let cy = ty;
    for (const ln of lines) {
      let cx = x;
      if (o.align === "right") cx = x - f.widthOfTextAtSize(ln, size);
      else if (o.align === "center") cx = x - f.widthOfTextAtSize(ln, size) / 2;
      page.drawText(ln, { x: cx, y: cy, size, font: f, color });
      cy -= size * 1.35;
    }
    return cy;
  };

  const heightOf = (s: string, f: PDFFont, size: number, maxW: number) =>
    wrap(String(s ?? ""), f, size, maxW).length * size * 1.35;

  const card = (x: number, top: number, w: number, h: number, fill = CARD) => {
    page.drawRectangle({
      x,
      y: top - h,
      width: w,
      height: h,
      color: fill,
      borderColor: LINE,
      borderWidth: 0.7,
    });
  };

  const field = (label: string, value: string | null | undefined, x: number, top: number, w: number) => {
    text(label, x, top - 8, { size: 6.5, f: bold, color: MUTED });
    const v = value && String(value).trim() ? String(value) : "";
    page.drawRectangle({ x, y: top - 30, width: w, height: 15, color: WHITE, borderColor: LINE, borderWidth: 0.6 });
    if (v) text(v, x + 4, top - 25.5, { size: 8.5, maxW: w - 8 });
    return top - 36;
  };

  const sectionTitle = (label: string, x: number, top: number) => {
    text(label, x, top - 10, { size: 11, f: bold, color: INK });
    return top - 20;
  };

  const newPage = () => {
    page = doc.addPage(A4);
    pages.push(page);
    y = A4[1] - M;
  };

  const ensure = (h: number) => {
    if (y - h < M + 40) newPage();
  };

  // ---------- header band ----------
  const HEADER_H = 104;
  page.drawRectangle({ x: 0, y: A4[1] - HEADER_H, width: A4[0], height: HEADER_H, color: BLACK });
  if (input.logo) {
    try {
      const img = await doc.embedPng(input.logo);
      const lw = 118;
      const lh = (img.height / img.width) * lw;
      page.drawImage(img, { x: M, y: A4[1] - HEADER_H / 2 - lh / 2, width: lw, height: lh });
    } catch {
      text("TOREO", M, A4[1] - 58, { size: 22, f: bold, color: WHITE });
    }
  } else {
    text("TOREO", M, A4[1] - 58, { size: 22, f: bold, color: WHITE });
  }
  const rx = A4[0] - M;
  text(t.title, rx, A4[1] - 44, { size: 22, f: bold, color: WHITE, align: "right" });
  text(t.sub1, rx, A4[1] - 60, { size: 7.5, color: rgb(0.72, 0.76, 0.82), align: "right" });
  page.drawRectangle({ x: A4[0] - M - 240, y: A4[1] - 70, width: 240, height: 0.7, color: rgb(0.35, 0.5, 0.75) });
  text(t.sub2, rx, A4[1] - 84, { size: 7.5, color: rgb(0.72, 0.76, 0.82), align: "right" });

  y = A4[1] - HEADER_H - 14;

  // ---------- company card ----------
  const compH = 56;
  card(M, y, W, compH);
  text(t.address, M + 10, y - 12, { size: 6.5, f: bold, color: MUTED });
  text(input.company.address ?? "", M + 10, y - 22, { size: 8.5, maxW: W - 20 });
  const col = (W - 20) / 3;
  const rowY = y - 34;
  text(t.phone, M + 10, rowY, { size: 6.5, f: bold, color: MUTED });
  text(input.company.phone ?? "", M + 10, rowY - 10, { size: 8.5, maxW: col - 6 });
  text(t.email, M + 10 + col, rowY, { size: 6.5, f: bold, color: MUTED });
  text(input.company.email ?? "", M + 10 + col, rowY - 10, { size: 8.5, maxW: col - 6 });
  text(t.website, M + 10 + col * 2, rowY, { size: 6.5, f: bold, color: MUTED });
  text(input.company.website ?? "", M + 10 + col * 2, rowY - 10, { size: 8.5, maxW: col - 6 });
  y -= compH + 12;

  // ---------- quote + customer cards ----------
  const gap = 12;
  const halfW = (W - gap) / 2;
  const infoH = 132;
  card(M, y, halfW, infoH);
  card(M + halfW + gap, y, halfW, infoH, ACCENT_SOFT);

  let ly = sectionTitle(t.quoteInfo, M + 10, y);
  ly = field(t.quoteNo, input.number, M + 10, ly, halfW - 20);
  ly = field(t.date, input.issueDate, M + 10, ly, halfW - 20);
  ly = field(t.validity, input.validity, M + 10, ly, halfW - 20);

  const cx0 = M + halfW + gap + 10;
  let cy0 = sectionTitle(t.customerInfo, cx0, y);
  cy0 = field(t.name, input.customer.name ?? input.customer.company ?? "", cx0, cy0, halfW - 20);
  cy0 = field(t.phone, input.customer.phone ?? "", cx0, cy0, halfW - 20);
  cy0 = field(t.email, input.customer.email ?? "", cx0, cy0, halfW - 20);
  y -= infoH + 12;

  // ---------- project + image ----------
  const projW = W * 0.56;
  const imgW = W - projW - gap;
  const descLines = Math.max(3, wrap(input.project.description ?? "", font, 8.5, projW - 20).length);
  const projH = Math.max(210, 150 + descLines * 11);
  ensure(projH + 20);
  card(M, y, projW, projH);
  card(M + projW + gap, y, imgW, projH);

  let py = sectionTitle(t.projectInfo, M + 10, y);
  py = field(t.projTitle, input.project.title ?? "", M + 10, py, projW - 20);
  text(t.description, M + 10, py - 8, { size: 6.5, f: bold, color: MUTED });
  const descBoxH = Math.max(40, descLines * 11 + 8);
  page.drawRectangle({
    x: M + 10,
    y: py - 14 - descBoxH,
    width: projW - 20,
    height: descBoxH,
    color: WHITE,
    borderColor: LINE,
    borderWidth: 0.6,
  });
  if (input.project.description) {
    text(input.project.description, M + 14, py - 24, { size: 8.5, maxW: projW - 28 });
  }
  py = py - 20 - descBoxH;

  const halfCol = (projW - 26) / 2;
  const pairs: [string, string | null | undefined][] = [
    [t.service, input.project.service],
    [t.material, input.project.material],
    [t.dimensions, input.project.dimensions],
    [t.thickness, [input.project.thickness, input.project.tolerance].filter(Boolean).join(" / ")],
    [t.drawing, input.project.drawing_code],
    [t.extra, input.project.extra],
  ];
  for (let i = 0; i < pairs.length; i += 2) {
    const ya = py;
    field(pairs[i][0], pairs[i][1] ?? "", M + 10, ya, halfCol);
    if (pairs[i + 1]) field(pairs[i + 1][0], pairs[i + 1][1] ?? "", M + 16 + halfCol, ya, halfCol);
    py = ya - 36;
  }

  // image panel
  const ix = M + projW + gap;
  sectionTitle(t.imageTitle, ix + 10, y);
  const boxTop = y - 26;
  const boxH = projH - 40;
  page.drawRectangle({
    x: ix + 10,
    y: boxTop - boxH,
    width: imgW - 20,
    height: boxH,
    color: WHITE,
    borderColor: LINE,
    borderWidth: 0.6,
  });
  if (input.image) {
    try {
      const img =
        input.image.kind === "png" ? await doc.embedPng(input.image.bytes) : await doc.embedJpg(input.image.bytes);
      const availW = imgW - 28;
      const availH = boxH - 16;
      const scale = Math.min(availW / img.width, availH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      page.drawImage(img, {
        x: ix + 10 + (imgW - 20 - dw) / 2,
        y: boxTop - boxH + (boxH - dh) / 2,
        width: dw,
        height: dh,
      });
    } catch {
      /* unreadable image — leave the panel empty */
    }
  }
  y -= projH + 14;

  // ---------- financial ----------
  ensure(120);
  y = sectionTitle(t.financial, M, y) - 2;

  const cols = [
    { key: "desc", label: t.thDesc, w: W * 0.3, align: "left" as const },
    { key: "qty", label: t.thQty, w: W * 0.07, align: "right" as const },
    { key: "unit", label: t.thUnit, w: W * 0.07, align: "left" as const },
    { key: "price", label: t.thPrice, w: W * 0.12, align: "right" as const },
    { key: "disc", label: t.thDisc, w: W * 0.07, align: "right" as const },
    { key: "net", label: t.thNet, w: W * 0.12, align: "right" as const },
    { key: "vatp", label: t.thVatPct, w: W * 0.08, align: "right" as const },
    { key: "vat", label: t.thVat, w: W * 0.08, align: "right" as const },
    { key: "total", label: t.thTotal, w: W * 0.09, align: "right" as const },
  ];

  const drawHeadRow = () => {
    page.drawRectangle({ x: M, y: y - 16, width: W, height: 16, color: BLACK });
    let cx = M + 4;
    for (const c of cols) {
      const tx = c.align === "right" ? cx + c.w - 8 : cx;
      text(c.label, tx, y - 11.5, { size: 6.8, f: bold, color: WHITE, align: c.align === "right" ? "right" : "left" });
      cx += c.w;
    }
    y -= 16;
  };
  drawHeadRow();

  let zebra = false;
  for (const l of input.lines) {
    const descH = heightOf(l.description || "—", font, 8, cols[0].w - 10);
    const rowH = Math.max(18, descH + 8);
    if (y - rowH < M + 40) {
      newPage();
      drawHeadRow();
    }
    if (zebra) page.drawRectangle({ x: M, y: y - rowH, width: W, height: rowH, color: rgb(0.975, 0.98, 0.99) });
    page.drawRectangle({ x: M, y: y - rowH, width: W, height: 0.5, color: LINE });
    const vals: Record<string, string> = {
      desc: l.description || "—",
      qty: String(round2(Number(l.qty) || 0)),
      unit: l.unit || "",
      price: fmt(Number(l.unit_price) || 0, input.currency),
      disc: `${round2(Number(l.discount_pct) || 0)}%`,
      net: fmt(lineNet(l), input.currency),
      vatp: `${round2(Number(l.vat_pct) || 0)}%`,
      vat: fmt(lineVat(l), input.currency),
      total: fmt(lineTotal(l), input.currency),
    };
    let cx = M + 4;
    for (const c of cols) {
      const tx = c.align === "right" ? cx + c.w - 8 : cx;
      text(vals[c.key], tx, y - 12, {
        size: 8,
        maxW: c.key === "desc" ? c.w - 10 : undefined,
        align: c.align === "right" ? "right" : "left",
      });
      cx += c.w;
    }
    y -= rowH;
    zebra = !zebra;
  }

  // totals
  const tot = computeTotals(input.lines, { depositPct: input.depositPct, paid: input.paid });
  const totRows: [string, string][] = [
    [t.subtotal, fmt(tot.gross, input.currency)],
    [t.discount, fmt(tot.discount, input.currency)],
    [t.net, fmt(tot.net, input.currency)],
    [t.vatAmount, fmt(tot.vat, input.currency)],
  ];
  const extraRows: [string, string][] = [];
  if (input.depositPct > 0) extraRows.push([`${t.deposit} (${round2(input.depositPct)}%)`, fmt(tot.deposit, input.currency)]);
  if (input.paid > 0) {
    extraRows.push([t.paid, fmt(tot.paid, input.currency)]);
    extraRows.push([t.balance, fmt(tot.balance, input.currency)]);
  }
  const boxRows = totRows.length + extraRows.length;
  const totH = 26 + boxRows * 13 + 30;
  ensure(totH + 10);
  y -= 12;
  const tW = 250;
  const tX = M + W - tW;
  card(tX, y, tW, totH, ACCENT_SOFT);
  let ty = y - 16;
  for (const [k, v] of totRows) {
    text(k, tX + 10, ty, { size: 8, color: MUTED });
    text(v, tX + tW - 10, ty, { size: 8, align: "right" });
    ty -= 13;
  }
  page.drawRectangle({ x: tX + 10, y: ty + 6, width: tW - 20, height: 0.7, color: ACCENT });
  ty -= 6;
  text(t.grand, tX + 10, ty - 8, { size: 11, f: bold, color: INK });
  text(fmt(tot.total, input.currency), tX + tW - 10, ty - 8, { size: 13, f: bold, color: ACCENT, align: "right" });
  ty -= 26;
  for (const [k, v] of extraRows) {
    text(k, tX + 10, ty, { size: 8, color: MUTED });
    text(v, tX + tW - 10, ty, { size: 8, align: "right" });
    ty -= 13;
  }

  // delivery block on the left of the totals
  const dW = W - tW - 12;
  card(M, y, dW, totH);
  let dy = y - 14;
  text(t.delivery, M + 10, dy, { size: 6.5, f: bold, color: MUTED });
  dy = text(input.terms.delivery_time ?? "", M + 10, dy - 12, { size: 9, maxW: dW - 20 });
  dy -= 6;
  text(t.validity, M + 10, dy, { size: 6.5, f: bold, color: MUTED });
  dy = text(input.validity, M + 10, dy - 12, { size: 9, maxW: dW - 20 });
  dy -= 6;
  text(t.orderRef, M + 10, dy, { size: 6.5, f: bold, color: MUTED });
  text(input.orderReference, M + 10, dy - 12, { size: 9, f: bold, maxW: dW - 20 });
  y -= totH + 16;

  // ---------- terms ----------
  const notesH = input.terms.notes ? heightOf(input.terms.notes, font, 8.5, W - 20) : 0;
  const termsH = 74 + notesH;
  ensure(termsH + 10);
  card(M, y, W, termsH);
  let yy = sectionTitle(t.termsTitle, M + 10, y);
  const halfT = (W - 26) / 2;
  field(t.payTerms, input.terms.payment_terms ?? "", M + 10, yy, halfT);
  field(t.validity, input.validity, M + 16 + halfT, yy, halfT);
  yy -= 40;
  if (input.terms.notes) {
    text(t.notes, M + 10, yy, { size: 6.5, f: bold, color: MUTED });
    text(input.terms.notes, M + 10, yy - 12, { size: 8.5, maxW: W - 20 });
  }
  y -= termsH + 12;

  // ---------- approval ----------
  const apprH = 56;
  ensure(apprH + 10);
  card(M, y, W, apprH);
  const ay = sectionTitle(t.approval, M + 10, y);
  field(t.signature, "", M + 10, ay, W * 0.6);
  field(t.sigDate, "", M + 20 + W * 0.6, ay, W * 0.35 - 20);
  y -= apprH + 12;

  // ---------- footers ----------
  const total = pages.length;
  pages.forEach((p, i) => {
    p.drawRectangle({ x: 0, y: 0, width: A4[0], height: 26, color: BLACK });
    const line = `TOREO  |  ${input.company.email ?? ""}  |  ${input.company.phone ?? ""}  |  ${input.company.website ?? ""}`;
    p.drawText(line, { x: M, y: 10, size: 7, font, color: rgb(0.75, 0.79, 0.85) });
    const pg = `${t.page} ${i + 1}/${total}`;
    p.drawText(pg, {
      x: A4[0] - M - font.widthOfTextAtSize(pg, 7),
      y: 10,
      size: 7,
      font,
      color: rgb(0.75, 0.79, 0.85),
    });
    p.drawText(t.footerNote, { x: M, y: 32, size: 6.2, font, color: MUTED });
  });

  return await doc.save();
}
