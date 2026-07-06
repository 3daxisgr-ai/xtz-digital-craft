import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { panelGetOrder } from "@/lib/api/panel.functions";

export const Route = createFileRoute("/admin_/print/$kind/$code")({
  ssr: false,
  head: () => ({ meta: [{ title: "TOREO — Document" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PrintPage,
});

function PrintPage() {
  const { kind, code } = useParams({ from: "/admin_/print/$kind/$code" });
  const get = useServerFn(panelGetOrder);
  const [d, setD] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    get({ data: { order_code: code } })
      .then((r) => setD(r))
      .catch((e) => setErr(e.message ?? "Failed to load"));
  }, [code]); // eslint-disable-line

  useEffect(() => {
    if (d) setTimeout(() => window.print(), 400);
  }, [d]);

  if (err) return <div style={{ padding: 40, color: "#900" }}>Error: {err}</div>;
  if (!d) return <div style={{ padding: 40 }}>Loading…</div>;

  const o = d.order;
  const isInvoice = kind === "invoice";
  const title = isInvoice ? "INVOICE" : "QUOTATION";
  const price = Number(o.quote_price ?? 0);
  const tax = isInvoice ? Math.round(price * 0.24 * 100) / 100 : 0;
  const total = isInvoice ? Math.round((price + tax) * 100) / 100 : price;

  return (
    <div className="print-doc">
      <style>{`
        @page { size: A4; margin: 18mm; }
        * { box-sizing: border-box; }
        html, body { background: #fff !important; color: #111; font-family: Helvetica, Arial, sans-serif; }
        .print-doc { max-width: 720px; margin: 0 auto; padding: 24px; color: #111; }
        .print-doc h1 { font-size: 22px; margin: 0; letter-spacing: 0.15em; }
        .print-doc h2 { font-size: 12px; letter-spacing: 0.35em; margin: 0; color: #666; text-transform: uppercase; }
        .print-doc table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .print-doc th, .print-doc td { text-align: left; padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #eee; }
        .print-doc th { background: #f7f7f7; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; color: #555; }
        .print-doc .total-row td { font-weight: 700; border-top: 2px solid #111; border-bottom: none; font-size: 14px; }
        .print-doc .muted { color: #666; font-size: 11px; }
        .print-doc .brand { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; }
        .print-doc .meta { text-align: right; font-size: 11px; color: #444; }
        .print-doc .box { border: 1px solid #ddd; padding: 12px; border-radius: 4px; margin-top: 16px; }
        .print-doc .actions { margin-top: 24px; text-align: right; }
        .print-doc .actions button { padding: 8px 14px; margin-left: 8px; font-size: 12px; cursor: pointer; }
        @media print { .print-doc .actions { display: none; } }
      `}</style>

      <div className="brand">
        <div>
          <h2>TOREO</h2>
          <h1>{title}</h1>
        </div>
        <div className="meta">
          <div><strong>{isInvoice ? "Invoice" : "Quote"} #</strong> {o.order_code}</div>
          <div>Date: {new Date().toLocaleDateString("en-GB")}</div>
          {o.due_date && <div>Due: {new Date(o.due_date).toLocaleDateString("en-GB")}</div>}
        </div>
      </div>

      <div className="box">
        <div className="muted">Billed to</div>
        <div><strong>{o.customer_name}</strong></div>
        {o.company && <div>{o.company}</div>}
        <div>{o.customer_email}</div>
        {o.customer_phone && <div>{o.customer_phone}</div>}
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style={{ width: 90, textAlign: "right" }}>Qty</th>
            <th style={{ width: 120, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div><strong>{o.service ?? "Custom manufacturing"}</strong></div>
              <div className="muted">
                {o.material && <>Material: {o.material}. </>}
                {o.dimensions && <>Dimensions: {o.dimensions}. </>}
                {o.message && <>Notes: {String(o.message).slice(0, 180)}</>}
              </div>
            </td>
            <td style={{ textAlign: "right" }}>{o.quantity ?? 1}</td>
            <td style={{ textAlign: "right" }}>€{price.toFixed(2)}</td>
          </tr>
          {isInvoice && (
            <tr>
              <td colSpan={2} style={{ textAlign: "right" }}>VAT (24%)</td>
              <td style={{ textAlign: "right" }}>€{tax.toFixed(2)}</td>
            </tr>
          )}
          <tr className="total-row">
            <td colSpan={2} style={{ textAlign: "right" }}>{isInvoice ? "TOTAL DUE" : "ESTIMATED TOTAL"}</td>
            <td style={{ textAlign: "right" }}>€{total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="box">
        <div className="muted">{isInvoice ? "Payment terms" : "Terms"}</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          {isInvoice
            ? "Payment due within 14 days of issue. Bank transfer. Please reference the invoice number above."
            : "Quote valid for 14 days. Delivery timeline confirmed after approval. All engineering choices are handled by our team."}
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 11, color: "#666", textAlign: "center" }}>
        TOREO · Athens, Greece · www.toreo.gr · INFO@TOREO.GR
      </div>

      <div className="actions">
        <button onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
    </div>
  );
}
