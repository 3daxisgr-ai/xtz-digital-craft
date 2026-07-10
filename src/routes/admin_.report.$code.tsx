import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getManufacturingReport } from "@/lib/api/features.functions";
import toreoLogoAsset from "@/assets/toreo-logo.png.asset.json";
const toreoLogo = toreoLogoAsset.url;

export const Route = createFileRoute("/admin_/report/$code")({
  ssr: false,
  head: () => ({ meta: [{ title: "TOREO — Manufacturing Report" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { code } = useParams({ from: "/admin_/report/$code" });
  const get = useServerFn(getManufacturingReport);
  const [d, setD] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showInternal, setShowInternal] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);

  useEffect(() => {
    get({ data: { order_code: code } }).then(setD).catch((e) => setErr(e.message));
  }, [code]); // eslint-disable-line

  if (err) return <div style={{ padding: 40, color: "#900" }}>Error: {err}</div>;
  if (!d) return <div style={{ padding: 40 }}>Loading…</div>;
  const o = d.order;
  const trackUrl = `https://www.toreo.gr/track?code=${encodeURIComponent(o.order_code)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(trackUrl)}`;

  return (
    <div className="report-doc">
      <style>{`
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; }
        html, body { background: #fff !important; color: #111; font-family: Helvetica, Arial, sans-serif; }
        .report-doc { max-width: 780px; margin: 0 auto; padding: 20px; }
        .brand { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; }
        .brand img { height: 42px; }
        h1 { font-size: 22px; margin: 4px 0 0; letter-spacing: 0.12em; }
        h2 { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #666; margin: 24px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .meta { text-align: right; font-size: 11px; color: #444; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 12px; }
        .grid dt { color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
        .grid dd { margin: 0 0 6px; font-weight: 500; }
        .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .photos img { width: 100%; height: 220px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
        .caption { font-size: 10px; color: #666; margin-top: 4px; }
        .notes { border: 1px solid #ddd; padding: 10px; border-radius: 4px; font-size: 12px; white-space: pre-wrap; background: #fafafa; }
        .actions { margin-top: 24px; text-align: right; }
        .actions button { padding: 8px 14px; margin-left: 8px; font-size: 12px; cursor: pointer; }
        .actions label { margin-right: 12px; font-size: 12px; }
        @media print { .actions { display: none; } }
        .footer { margin-top: 32px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
      `}</style>

      <div className="brand">
        <div>
          <img src={toreoLogo} alt="TOREO" />
          <h1>MANUFACTURING REPORT</h1>
        </div>
        <div className="meta">
          <img src={qrUrl} alt="QR" style={{ width: 90 }} />
          <div><strong>Order</strong> {o.order_code}</div>
          <div>Generated: {new Date().toLocaleDateString("en-GB")}</div>
        </div>
      </div>

      <h2>Customer</h2>
      <dl className="grid">
        <div><dt>Name</dt><dd>{o.customer_name}</dd></div>
        <div><dt>Email</dt><dd>{o.customer_email}</dd></div>
        {o.company && <div><dt>Company</dt><dd>{o.company}</dd></div>}
        {o.customer_phone && <div><dt>Phone</dt><dd>{o.customer_phone}</dd></div>}
      </dl>

      <h2>Production</h2>
      <dl className="grid">
        <div><dt>Service</dt><dd>{o.service ?? "—"}</dd></div>
        <div><dt>Material</dt><dd>{o.material ?? "—"}</dd></div>
        <div><dt>Quantity</dt><dd>{o.quantity ?? "1"}</dd></div>
        <div><dt>Production purpose</dt><dd>{(o.metadata as any)?.purpose ?? o.service ?? "Standard"}</dd></div>
        <div><dt>Status</dt><dd>{String(o.status).replace(/_/g, " ")}</dd></div>
        <div><dt>Due date</dt><dd>{o.due_date ?? "—"}</dd></div>
        {d.job?.duration_minutes && <div><dt>Est. manufacturing time</dt><dd>{Math.round(d.job.duration_minutes / 60 * 10) / 10} h</dd></div>}
        {d.analysis?.model_volume_mm3 && <div><dt>Model volume</dt><dd>{(d.analysis.model_volume_mm3 / 1000).toFixed(1)} cm³</dd></div>}
      </dl>

      {d.files.length > 0 && (
        <>
          <h2>Uploaded files</h2>
          <ul style={{ fontSize: 12, margin: 0, paddingLeft: 18 }}>
            {d.files.map((n: string, i: number) => <li key={i}>{n}</li>)}
          </ul>
        </>
      )}

      {o.message && (
        <>
          <h2>Manufacturing notes</h2>
          <div className="notes">{o.message}</div>
        </>
      )}

      {showInternal && o.internal_notes && (
        <>
          <h2>Internal notes (admin)</h2>
          <div className="notes">{o.internal_notes}</div>
        </>
      )}

      {showPhotos && d.photos.length > 0 && (
        <>
          <h2>Production photos</h2>
          <div className="photos">
            {d.photos.map((p: any, i: number) => (
              <div key={i}>
                {p.url && <img src={p.url} alt={p.name} />}
                {p.caption && <div className="caption">{p.caption}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="footer">
        TOREO · Athens, Greece · www.toreo.gr · INFO@TOREO.GR<br />
        Track: {trackUrl}
      </div>

      <div className="actions">
        <label><input type="checkbox" checked={showInternal} onChange={(e) => setShowInternal(e.target.checked)} /> Include internal notes</label>
        <label><input type="checkbox" checked={showPhotos} onChange={(e) => setShowPhotos(e.target.checked)} /> Include photos</label>
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>
    </div>
  );
}
