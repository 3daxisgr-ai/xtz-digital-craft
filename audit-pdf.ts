import { renderQuotePdf } from "@/lib/pdf/quote-pdf.server";
import reg from "@/assets/DejaVuSans.ttf.asset.json";
import bold from "@/assets/DejaVuSans-Bold.ttf.asset.json";
const g = async (u: string) => new Uint8Array(await (await fetch(u)).arrayBuffer());
const bytes = await renderQuotePdf({
  lang: "el", number: "TR-9999", issueDate: "04/08/2026", orderReference: "TR-2026-0012", validity: "15 ημέρες",
  company: { address: "Θεσσαλονίκη", phone: "+30 6970609960", email: "info@toreo.gr", website: "toreo.gr", vat: "EL000", legal: "TOREO" },
  customer: { name: "Δοκιμή Πελάτη", company: "TOREO QA", email: "info@toreo.gr", phone: "+30", vat: "-", address: "-" },
  project: { title: "Λέιζερ κοπή", description: "Δοκιμαστικό", service: "Fiber Laser", material: "Inox 304", dimensions: "100x100", thickness: "2mm" },
  lines: [{ description: "Κοπή λέιζερ", qty: 5, unit: "τεμ", unit_price: 82.5, discount_pct: 0, vat_pct: 24 } as any],
  currency: "EUR", depositPct: 50, paid: 0,
  terms: { payment_terms: "50% προκαταβολή", delivery_time: "7 εργάσιμες", notes: "Δοκιμή" },
  fontRegular: await g(reg.url), fontBold: await g(bold.url),
});
await Bun.write("/tmp/quote.pdf", bytes);
console.log("PDF bytes", bytes.length);
