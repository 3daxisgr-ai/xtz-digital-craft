import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { panelGetMaterialEstimates } from "@/lib/api/material-estimate.functions";
import { manualSheetCalc } from "@/lib/material-estimate";

const e2 = (v: any) => (v == null ? "—" : `€${Number(v).toFixed(2)}`);
const k2 = (v: any) => (v == null ? "—" : `${Number(v).toFixed(3)} kg`);

/** Admin-only internal view of the material-only estimate. */
export function MaterialEstimateAdmin({ orderId }: { orderId: string }) {
  const get = useServerFn(panelGetMaterialEstimates);
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { get({ data: { order_id: orderId } }).then(setRows).catch(() => setRows([])); }, [orderId]); // eslint-disable-line
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  const profit = r.price != null && r.material_cost != null ? Number(r.price) - Number(r.material_cost) : null;
  const items: [string, string][] = [
    ["Material", `${r.material_label ?? "—"}${r.material_code ? ` (${r.material_code})` : ""}`],
    ["Thickness", r.thickness_mm ? `${r.thickness_mm} mm` : "—"],
    ["Quantity", String(r.quantity)],
    ["Total kg", r.kg_min != null && r.kg_max != null && Number(r.kg_min) !== Number(r.kg_max) ? `${k2(r.kg)} (${Number(r.kg_min).toFixed(2)}–${Number(r.kg_max).toFixed(2)})` : k2(r.kg)],
    ["Purchase €/kg", e2(r.cost_per_kg)],
    ["Material purchase cost", e2(r.material_cost)],
    ["Markup %", r.markup_pct != null ? `${r.markup_pct}%` : "—"],
    ["Profit", e2(profit)],
    ["Customer price", r.mode === "range" ? `${e2(r.price_min)} – ${e2(r.price_max)} (mid ${e2(r.price)})` : e2(r.price)],
    ["Mode", r.mode],
    ["Confidence", r.confidence != null ? `${Math.round(Number(r.confidence) * 100)}%` : "—"],
    ["Geometry source", r.geometry_source],
  ];
  return (
    <section className="border border-amber-300/30 bg-amber-300/[0.03] rounded p-5 space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-300">Material Estimate (internal)</div>
      <dl className="grid md:grid-cols-3 gap-3 text-sm">
        {items.map(([k, v]) => (
          <div key={k}><dt className="text-[10px] font-mono uppercase tracking-widest text-white/40">{k}</dt><dd className="text-white/90">{v}</dd></div>
        ))}
      </dl>
      {Array.isArray(r.assumptions) && r.assumptions.length > 0 && (
        <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">Assumptions</div>
          <ul className="text-xs text-white/70 list-disc ml-5">{r.assumptions.map((a: string) => <li key={a}>{a}</li>)}</ul></div>
      )}
      {Array.isArray(r.missing_fields) && r.missing_fields.length > 0 && (
        <div className="text-xs text-red-300/80">Missing: {r.missing_fields.join(", ")}</div>
      )}
      <details className="text-xs text-white/50"><summary className="cursor-pointer">Raw inputs / interpretation</summary>
        <pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify({ inputs: r.inputs, interpretation: r.ai_output, geometry: r.geometry }, null, 2)}</pre>
      </details>
    </section>
  );
}

/** Manual sheet calculator: "Υπολογισμός λαμαρίνας". Local markup override only. */
export function SheetCalculator({ materials, defaultMarkup }: { materials: any[]; defaultMarkup: number }) {
  const sheets = materials.filter((m) => m.process === "sheet_metal");
  const [code, setCode] = useState("");
  const [kg, setKg] = useState("");
  const [pct, setPct] = useState(String(defaultMarkup));
  const [res, setRes] = useState<{ cost: number; sale: number; profit: number; cpk: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setPct(String(defaultMarkup)); }, [defaultMarkup]);
  const inp = "w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm focus:border-white/30 outline-none";
  function calc() {
    setErr(null); setRes(null);
    const m = sheets.find((x) => x.code === code);
    const k = Number(kg), p = Number(pct), cpk = Number(m?.price_per_kg);
    if (!m) return setErr("Επιλέξτε υλικό.");
    if (!(cpk > 0)) return setErr("Το υλικό δεν έχει τιμή αγοράς €/kg.");
    if (!(k > 0 && k <= 100000)) return setErr("Μη έγκυρο βάρος.");
    if (!(p >= 0 && p <= 1000)) return setErr("Μη έγκυρο ποσοστό.");
    setRes({ ...manualSheetCalc(k, cpk, p), cpk });
  }
  return (
    <section className="border border-white/10 bg-white/[0.02] rounded p-5 mb-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-4">Υπολογισμός λαμαρίνας</div>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="text-xs"><div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">Υλικό / λαμαρίνα</div>
          <select className={inp} value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">—</option>
            {sheets.map((m) => <option key={m.code} value={m.code}>{m.name} · €{Number(m.price_per_kg ?? 0).toFixed(2)}/kg</option>)}
          </select>
        </label>
        <label className="text-xs"><div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">Βάρος (kg)</div>
          <input type="number" step="0.01" className={inp} value={kg} onChange={(e) => setKg(e.target.value)} />
        </label>
        <label className="text-xs"><div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">Προσαύξηση / markup %</div>
          <input type="number" step="0.1" className={inp} value={pct} onChange={(e) => setPct(e.target.value)} />
        </label>
      </div>
      <button onClick={calc} className="mt-4 bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded">Υπολόγισε</button>
      {err && <div className="mt-3 text-xs text-red-300">{err}</div>}
      {res && (
        <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
          <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Κόστος υλικού</div><div className="text-lg">€{res.cost.toFixed(2)}</div><div className="text-[11px] text-white/40">{kg} kg × €{res.cpk.toFixed(2)}/kg</div></div>
          <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Κέρδος</div><div className="text-lg text-emerald-300">€{res.profit.toFixed(2)}</div><div className="text-[11px] text-white/40">τιμή πώλησης − κόστος υλικού</div></div>
          <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Τιμή προς πελάτη</div><div className="text-lg text-amber-300">€{res.sale.toFixed(2)}</div><div className="text-[11px] text-white/40">κόστος × (1 + {pct}%)</div></div>
        </div>
      )}
      <p className="mt-3 text-[11px] text-white/40">Το ποσοστό εδώ ισχύει μόνο για αυτόν τον υπολογισμό· η γενική προεπιλογή ρυθμίζεται παραπάνω.</p>
    </section>
  );
}
