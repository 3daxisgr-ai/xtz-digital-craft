// Shared, deterministic quote math. Used by the admin editor (live preview)
// and by the server-side PDF generator so both always agree.

export type QuoteLine = {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  discount_pct: number;
  vat_pct: number;
  /** true while the line still mirrors the order (auto-synced first line) */
  auto_managed?: boolean;
};

export type QuoteTotals = {
  gross: number;
  discount: number;
  net: number;
  vat: number;
  total: number;
  deposit: number;
  paid: number;
  balance: number;
};

export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function lineNet(l: QuoteLine): number {
  const gross = (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
  return round2(gross * (1 - (Number(l.discount_pct) || 0) / 100));
}

export function lineVat(l: QuoteLine): number {
  return round2(lineNet(l) * ((Number(l.vat_pct) || 0) / 100));
}

export function lineTotal(l: QuoteLine): number {
  return round2(lineNet(l) + lineVat(l));
}

export function computeTotals(
  lines: QuoteLine[],
  opts?: { depositPct?: number; paid?: number },
): QuoteTotals {
  let gross = 0;
  let net = 0;
  let vat = 0;
  for (const l of lines) {
    gross += (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
    net += lineNet(l);
    vat += lineVat(l);
  }
  gross = round2(gross);
  net = round2(net);
  vat = round2(vat);
  const total = round2(net + vat);
  const deposit = round2(total * ((Number(opts?.depositPct) || 0) / 100));
  const paid = round2(Number(opts?.paid) || 0);
  return {
    gross,
    discount: round2(gross - net),
    net,
    vat,
    total,
    deposit,
    paid,
    balance: round2(total - paid),
  };
}

export function money(n: number, currency = "EUR"): string {
  const v = round2(n).toFixed(2);
  return currency === "EUR" ? `${v} €` : `${v} ${currency}`;
}

export function emptyLine(): QuoteLine {
  return {
    id: Math.random().toString(36).slice(2, 10),
    description: "",
    qty: 1,
    unit: "pcs",
    unit_price: 0,
    discount_pct: 0,
    vat_pct: 24,
  };
}
