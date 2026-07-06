// TOREO AI Factory OS — Part 5.1: unified admin config surface.
// Central navigation + factory settings quick-edit.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminCheck } from "@/lib/api/admin.functions";
import { panelGetSettings, panelUpdateSettings } from "@/lib/api/factory.functions";
import { panelOvernightOptimize, panelBatchSuggest } from "@/lib/api/insights.functions";
import { panelRecomputeSchedule } from "@/lib/api/scheduler.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/config")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Config · TOREO" }, { name: "robots", content: "noindex" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const check = useServerFn(adminCheck);
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { check().then((r) => setAuthed(r.authed)).catch(() => setAuthed(false)); }, [check]);
  if (authed === null) return <div className="min-h-screen bg-[#0a0d12] text-white/40 text-xs font-mono grid place-items-center">VERIFYING…</div>;
  if (!authed) return <div className="min-h-screen bg-[#0a0d12] text-white grid place-items-center">Not authenticated. <Link to="/admin" className="underline text-amber-300 ml-2">Sign in</Link></div>;

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white px-6 py-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-amber-300/70 font-mono">System Config</div>
          <h1 className="text-2xl font-semibold mt-1">Admin Control Panel</h1>
        </div>
        <Link to="/admin" className="text-xs text-white/60 hover:text-white">← Admin</Link>
      </header>

      <section className="grid md:grid-cols-3 gap-4 mb-10">
        <NavCard to="/admin_/live" label="Live Dashboard" desc="Real-time factory telemetry, utilization, revenue." />
        <NavCard to="/admin_/scheduler" label="Smart Scheduler" desc="Production queue, capacity, maintenance blocks." />
        <NavCard to="/admin_/factory" label="Factory Control" desc="Machines, materials, AI analyses, overrides." />
        <NavCard to="/admin" label="Orders & Customers" desc="Order pipeline, customer records, uploads." />
        <NavCard to="/admin_/config" label="Config (this page)" desc="Global settings, optimizers, batching." highlight />
      </section>

      <SettingsCard />
      <OptimizerCard />
    </div>
  );
}

function NavCard({ to, label, desc, highlight }: { to: string; label: string; desc: string; highlight?: boolean }) {
  return (
    <Link to={to as any} className={`border rounded p-5 transition ${highlight ? "border-amber-300/40 bg-amber-300/[0.03]" : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"}`}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-white/50 mt-1">{desc}</div>
    </Link>
  );
}

function SettingsCard() {
  const get = useServerFn(panelGetSettings);
  const upd = useServerFn(panelUpdateSettings);
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { get().then(setS).catch(() => setS({})); }, [get]);
  if (!s) return null;

  async function save() {
    setBusy(true);
    try {
      const patch = {
        min_margin_pct: Number(s.min_margin_pct),
        min_hourly_rate_eur: Number(s.min_hourly_rate_eur),
        min_production_charge_eur: Number(s.min_production_charge_eur),
        min_order_value_eur: Number(s.min_order_value_eur),
        allow_overnight_default: !!s.allow_overnight_default,
        work_start_hour: Number(s.work_start_hour),
        work_end_hour: Number(s.work_end_hour),
      };
      await upd({ data: { patch } });
      toast.success("Factory settings saved");
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <section className="border border-white/10 bg-white/[0.02] rounded p-5 mb-6">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-4">Global Business Rules</div>
      <div className="grid md:grid-cols-4 gap-4">
        <Field label="Min margin %" v={s.min_margin_pct} on={(v) => setS({ ...s, min_margin_pct: v })} />
        <Field label="Min hourly €" v={s.min_hourly_rate_eur} on={(v) => setS({ ...s, min_hourly_rate_eur: v })} />
        <Field label="Min prod charge €" v={s.min_production_charge_eur} on={(v) => setS({ ...s, min_production_charge_eur: v })} />
        <Field label="Min order value €" v={s.min_order_value_eur} on={(v) => setS({ ...s, min_order_value_eur: v })} />
        <Field label="Work start hour" v={s.work_start_hour} on={(v) => setS({ ...s, work_start_hour: v })} />
        <Field label="Work end hour" v={s.work_end_hour} on={(v) => setS({ ...s, work_end_hour: v })} />
        <label className="flex items-center gap-2 text-xs mt-6">
          <input type="checkbox" checked={!!s.allow_overnight_default} onChange={(e) => setS({ ...s, allow_overnight_default: e.target.checked })} />
          Overnight-OK by default
        </label>
      </div>
      <div className="mt-4">
        <button onClick={save} disabled={busy} className="bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded disabled:opacity-40">{busy ? "SAVING…" : "SAVE SETTINGS"}</button>
      </div>
    </section>
  );
}

function Field({ label, v, on }: { label: string; v: any; on: (v: string) => void }) {
  return (
    <label className="block text-xs">
      <div className="text-white/50 mb-1">{label}</div>
      <input value={v ?? ""} onChange={(e) => on(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm focus:border-white/30 outline-none" />
    </label>
  );
}

function OptimizerCard() {
  const overnight = useServerFn(panelOvernightOptimize);
  const batch = useServerFn(panelBatchSuggest);
  const recompute = useServerFn(panelRecomputeSchedule);
  const [batches, setBatches] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function runOvernight() {
    setBusy("overnight");
    try { const r = await overnight(); toast.success(`Marked ${r.updated}/${r.candidates_found} jobs overnight-OK`); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }
  async function loadBatches() {
    setBusy("batch");
    try { const r = await batch(); setBatches(r.suggestions); toast.success(`${r.suggestions.length} batch group(s)`); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }
  async function runRecompute() {
    setBusy("recompute");
    try { const r = await recompute(); toast.success(`Scheduled ${r.scheduled} jobs across ${r.machines} machines`); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  return (
    <section className="border border-white/10 bg-white/[0.02] rounded p-5">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-4">Production Optimizers</div>
      <div className="flex flex-wrap gap-3">
        <button onClick={runRecompute} disabled={busy !== null} className="border border-white/15 hover:border-sky-300/50 px-4 py-2 text-xs font-mono rounded disabled:opacity-40">{busy === "recompute" ? "RECOMPUTING…" : "RECOMPUTE SCHEDULE"}</button>
        <button onClick={runOvernight} disabled={busy !== null} className="border border-white/15 hover:border-amber-300/50 px-4 py-2 text-xs font-mono rounded disabled:opacity-40">{busy === "overnight" ? "OPTIMIZING…" : "OPTIMIZE OVERNIGHT"}</button>
        <button onClick={loadBatches} disabled={busy !== null} className="border border-white/15 hover:border-emerald-300/50 px-4 py-2 text-xs font-mono rounded disabled:opacity-40">{busy === "batch" ? "ANALYZING…" : "SUGGEST BATCHES"}</button>
      </div>
      {batches !== null && (
        <div className="mt-4 space-y-2">
          {batches.length === 0 && <div className="text-xs text-white/40">No batch opportunities right now (need ≥ 2 jobs sharing material + service).</div>}
          {batches.map((b) => (
            <div key={b.key} className="border border-white/10 rounded p-3 text-xs">
              <div className="flex justify-between mb-1">
                <span className="font-mono text-amber-300/80">{b.material_code} · {b.service}</span>
                <span className="text-white/50">{b.jobs.length} jobs · {b.total_hours.toFixed(1)}h · due {b.earliest_due ? new Date(b.earliest_due).toLocaleDateString() : "—"}</span>
              </div>
              <div className="text-white/60">{b.jobs.map((j: any) => j.order_code).join(", ")}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
