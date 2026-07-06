import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminCheck } from "@/lib/api/admin.functions";
import {
  panelListMachines, panelUpsertMachine, panelDeleteMachine,
  panelListMaterials, panelUpsertMaterial, panelDeleteMaterial,
  panelAnalyzeFile, panelListAnalyses, panelDeleteAnalysis,
  panelGetSettings, panelUpdateSettings, panelReadinessCheck, panelApplyOverride,
} from "@/lib/api/factory.functions";
import { AIAnalysisCard } from "@/components/factory/AIAnalysisCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/factory")({
  component: FactoryPage,
  head: () => ({ meta: [{ title: "AI Factory OS · TOREO Admin" }] }),
});

function FactoryPage() {
  const check = useServerFn(adminCheck);
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { check().then((r) => setAuthed(r.authed)); }, [check]);

  if (authed === null) return <div className="min-h-screen bg-neutral-950 text-white grid place-items-center">Loading…</div>;
  if (!authed) return (
    <div className="min-h-screen bg-neutral-950 text-white grid place-items-center">
      <div>Not authenticated. <Link to="/admin" className="underline">Sign in</Link></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">TOREO AI Factory OS</div>
          <h1 className="text-xl font-semibold">Factory Control</h1>
        </div>
        <Link to="/admin" className="text-sm text-white/70 hover:text-white">← Back to Admin</Link>
      </header>
      <main className="p-6 grid gap-8 max-w-7xl mx-auto">
        <MachinesPanel />
        <MaterialsPanel />
        <AnalysisPanel />
      </main>
    </div>
  );
}

function MachinesPanel() {
  const list = useServerFn(panelListMachines);
  const upsert = useServerFn(panelUpsertMachine);
  const del = useServerFn(panelDeleteMachine);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", kind: "printer", vendor: "", model: "", hourly_cost: 0 });
  const refresh = () => list().then(setRows).catch((e) => toast.error(String(e)));
  useEffect(() => { refresh(); }, []);
  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <h2 className="text-lg font-semibold mb-4">Machines</h2>
      <div className="grid md:grid-cols-5 gap-2 mb-4">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Kind (printer/cnc/laser)" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
        <Input placeholder="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <Input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        <div className="flex gap-2">
          <Input type="number" placeholder="€/h" value={form.hourly_cost} onChange={(e) => setForm({ ...form, hourly_cost: Number(e.target.value) })} />
          <Button onClick={async () => { if (!form.name) return; await upsert({ data: { patch: form as any } }); setForm({ name: "", kind: "printer", vendor: "", model: "", hourly_cost: 0 }); refresh(); }}>Add</Button>
        </div>
      </div>
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between border border-white/10 rounded px-3 py-2">
            <div className="text-sm"><b>{r.name}</b> · {r.kind} · {r.vendor} {r.model} · €{r.hourly_cost}/h · <span className="text-white/60">{r.status}</span></div>
            <Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: r.id } }); refresh(); }}>Delete</Button>
          </div>
        ))}
        {!rows.length && <div className="text-sm text-white/50">No machines yet.</div>}
      </div>
    </Card>
  );
}

function MaterialsPanel() {
  const list = useServerFn(panelListMaterials);
  const upsert = useServerFn(panelUpsertMaterial);
  const del = useServerFn(panelDeleteMaterial);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", name: "", family: "PLA", process: "3d_printing", price_per_kg: 25, density_g_cm3: 1.24 });
  const refresh = () => list().then(setRows).catch((e) => toast.error(String(e)));
  useEffect(() => { refresh(); }, []);
  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <h2 className="text-lg font-semibold mb-4">Materials</h2>
      <div className="grid md:grid-cols-6 gap-2 mb-4">
        <Input placeholder="Code (e.g. PLA-BLK)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Family" value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} />
        <Input placeholder="Process" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} />
        <Input type="number" placeholder="€/kg" value={form.price_per_kg} onChange={(e) => setForm({ ...form, price_per_kg: Number(e.target.value) })} />
        <div className="flex gap-2">
          <Input type="number" step="0.01" placeholder="g/cm³" value={form.density_g_cm3} onChange={(e) => setForm({ ...form, density_g_cm3: Number(e.target.value) })} />
          <Button onClick={async () => { if (!form.code || !form.name) return; await upsert({ data: { patch: form as any } }); setForm({ code: "", name: "", family: "PLA", process: "3d_printing", price_per_kg: 25, density_g_cm3: 1.24 }); refresh(); }}>Add</Button>
        </div>
      </div>
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between border border-white/10 rounded px-3 py-2">
            <div className="text-sm"><b>{r.code}</b> · {r.name} · {r.family}/{r.process} · €{r.price_per_kg}/kg · {r.density_g_cm3} g/cm³</div>
            <Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: r.id } }); refresh(); }}>Delete</Button>
          </div>
        ))}
        {!rows.length && <div className="text-sm text-white/50">No materials yet.</div>}
      </div>
    </Card>
  );
}

function AnalysisPanel() {
  const analyze = useServerFn(panelAnalyzeFile);
  const list = useServerFn(panelListAnalyses);
  const del = useServerFn(panelDeleteAnalysis);
  const [orderCode, setOrderCode] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"prototype"|"durable"|"decorative">("prototype");
  const [service, setService] = useState<"3d_printing"|"cnc"|"laser"|"welding"|"other">("3d_printing");
  const load = async () => { if (!orderCode) return; try { setRows(await list({ data: { order_code: orderCode } })); } catch (e) { toast.error(String(e)); } };

  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <h2 className="text-lg font-semibold mb-1">AI Analysis</h2>
      <p className="text-sm text-white/60 mb-4">Enter an order code (e.g. TR-2026-0001), pick service + production mode, then run analysis. Results are saved to the project.</p>
      <div className="grid md:grid-cols-5 gap-2 mb-3">
        <Input placeholder="TR-2026-0001" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} onBlur={load} />
        <select className="bg-neutral-800 border border-white/10 rounded px-2 text-sm" value={service} onChange={(e) => setService(e.target.value as any)}>
          <option value="3d_printing">3D printing</option><option value="cnc">CNC</option><option value="laser">Laser</option><option value="welding">Welding</option><option value="other">Other</option>
        </select>
        <select className="bg-neutral-800 border border-white/10 rounded px-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="prototype">Prototype</option><option value="durable">Durable</option><option value="decorative">Decorative</option>
        </select>
        <Button disabled={!orderCode || busy} onClick={async () => {
          setBusy(true);
          try { await analyze({ data: { order_code: orderCode, service, production_mode: mode } }); toast.success("Analysis complete"); await load(); }
          catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
          finally { setBusy(false); }
        }}>{busy ? "Analysing…" : "Run AI Analysis"}</Button>
        <Button variant="ghost" onClick={load}>Refresh</Button>
      </div>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-white/10 rounded p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.file_name ?? "—"} · {r.service} · {r.production_mode}</div>
              <Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: r.id } }); load(); }}>Delete</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
              <Stat label="DFM" value={`${r.dfm_score}/100`} />
              <Stat label="Complexity" value={`${r.complexity_score}/100`} />
              <Stat label="Printability" value={`${r.printability_score}/100`} />
              <Stat label="Confidence" value={`${r.confidence}%`} />
              <Stat label="Material" value={r.recommended_material} />
              <Stat label="Nozzle" value={r.recommended_nozzle ?? "—"} />
              <Stat label="Layer" value={r.recommended_layer_height_mm ? `${r.recommended_layer_height_mm} mm` : "—"} />
              <Stat label="Infill" value={r.recommended_infill_pct != null ? `${r.recommended_infill_pct}%` : "—"} />
              <Stat label="Print time" value={`${r.estimated_print_hours} h`} />
              <Stat label="Material use" value={`${r.estimated_material_g} g`} />
              <Stat label="Cost" value={`€${r.estimated_cost_eur}`} />
              <Stat label="Quote" value={`€${r.quote_price_eur}`} />
            </div>
            {r.ai_summary && <p className="mt-3 text-white/80">{r.ai_summary}</p>}
            {Array.isArray(r.ai_warnings) && r.ai_warnings.length > 0 && (
              <div className="mt-2"><b className="text-amber-400">Warnings:</b><ul className="list-disc pl-5">{r.ai_warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>
            )}
            {Array.isArray(r.ai_recommendations) && r.ai_recommendations.length > 0 && (
              <div className="mt-2"><b className="text-emerald-400">Recommendations:</b><ul className="list-disc pl-5">{r.ai_recommendations.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>
            )}
          </div>
        ))}
        {!rows.length && orderCode && <div className="text-sm text-white/50">No analyses for this order yet.</div>}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="border border-white/10 rounded px-2 py-1"><div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div><div>{value}</div></div>;
}
