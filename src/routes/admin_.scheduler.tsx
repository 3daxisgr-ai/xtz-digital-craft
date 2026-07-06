import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminCheck } from "@/lib/api/admin.functions";
import {
  panelListQueue, panelRecomputeSchedule, panelCreateJobForOrder,
  panelUpdateJob, panelDeleteJob, panelAddMaintenance, panelDeleteMaintenance,
  panelFactoryCapacity,
} from "@/lib/api/scheduler.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/scheduler")({
  component: SchedulerPage,
  head: () => ({ meta: [{ title: "Smart Scheduler · TOREO Admin" }] }),
});

function SchedulerPage() {
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
          <div className="text-xs uppercase tracking-widest text-white/50">TOREO AI Factory OS · Part 4.1</div>
          <h1 className="text-xl font-semibold">Smart Scheduler & Production Queue</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <Link to="/admin_/factory" className="text-white/70 hover:text-white">Factory Control →</Link>
          <Link to="/admin" className="text-white/70 hover:text-white">← Admin</Link>
        </div>
      </header>
      <main className="p-6 grid gap-6 max-w-7xl mx-auto">
        <CapacityBar />
        <QueuePanel />
        <MaintenancePanel />
      </main>
    </div>
  );
}

function CapacityBar() {
  const cap = useServerFn(panelFactoryCapacity);
  const [c, setC] = useState<any>(null);
  useEffect(() => { cap().then(setC).catch(() => {}); }, []);
  if (!c) return null;
  const stat = (label: string, value: string) => (
    <div className="bg-neutral-900 border border-white/10 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stat("Active machines", `${c.active_machines} / ${c.total_machines}`)}
      {stat("Open jobs", String(c.open_jobs))}
      {stat("Backlog", `${c.backlog_hours} h`)}
      {stat("Daily capacity", `${c.daily_capacity_hours} h`)}
      {stat("Backlog days", c.backlog_days ?? "—")}
    </div>
  );
}

function QueuePanel() {
  const list = useServerFn(panelListQueue);
  const recompute = useServerFn(panelRecomputeSchedule);
  const create = useServerFn(panelCreateJobForOrder);
  const upd = useServerFn(panelUpdateJob);
  const del = useServerFn(panelDeleteJob);
  const [data, setData] = useState<any>({ jobs: [], machines: [], blocks: [] });
  const [orderCode, setOrderCode] = useState("");
  const [overnight, setOvernight] = useState(false);
  const refresh = () => list().then(setData).catch((e) => toast.error(String(e)));
  useEffect(() => { refresh(); }, []);

  async function addJob() {
    if (!orderCode.trim()) return;
    try {
      const r: any = await create({ data: { order_code: orderCode.trim(), overnight_ok: overnight } });
      toast.success(r.existed ? "Job already exists" : "Job queued");
      setOrderCode("");
      refresh();
    } catch (e: any) { toast.error(e.message ?? String(e)); }
  }
  async function runScheduler() {
    try {
      const r: any = await recompute();
      toast.success(`Scheduled ${r.scheduled} job(s) across ${r.machines} machine(s)`);
      refresh();
    } catch (e: any) { toast.error(e.message ?? String(e)); }
  }

  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-lg font-semibold">Production Queue</h2>
          <p className="text-sm text-white/50">Load-balanced across active machines. Priority = due date + priority + value.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/40">Order code</label>
            <Input value={orderCode} onChange={(e) => setOrderCode(e.target.value)} placeholder="TR-2026-0001" className="bg-black/40 border-white/10 text-white w-40" />
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70 mb-2"><input type="checkbox" checked={overnight} onChange={(e) => setOvernight(e.target.checked)} /> Overnight OK</label>
          <Button onClick={addJob} variant="secondary">+ Queue</Button>
          <Button onClick={runScheduler}>Recompute Schedule</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/10">
            <tr>
              <th className="text-left py-2">#</th>
              <th className="text-left">Order</th>
              <th className="text-left">Service</th>
              <th className="text-left">Machine</th>
              <th className="text-left">Planned start</th>
              <th className="text-left">Hours</th>
              <th className="text-left">Priority</th>
              <th className="text-left">Score</th>
              <th className="text-left">State</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((j: any) => (
              <tr key={j.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2 text-white/40">{j.queue_position ?? "—"}</td>
                <td className="font-mono">{j.orders?.order_code}</td>
                <td className="text-white/70">{j.orders?.service ?? "—"}</td>
                <td>
                  <select
                    value={j.machine_id ?? ""}
                    onChange={async (e) => { await upd({ data: { id: j.id, patch: { machine_id: e.target.value || null } } }); refresh(); }}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                  >
                    <option value="">— unassigned —</option>
                    {data.machines.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </td>
                <td className="text-xs text-white/60">{j.planned_start ? new Date(j.planned_start).toLocaleString() : "—"}</td>
                <td className="text-white/70">{j.estimated_hours ?? "—"}</td>
                <td className="text-white/70">{j.orders?.priority}</td>
                <td className="text-white/70">{j.priority_score}</td>
                <td>
                  <select
                    value={j.state}
                    onChange={async (e) => { await upd({ data: { id: j.id, patch: { state: e.target.value as any } } }); refresh(); }}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                  >
                    {["queued","ready","running","paused","blocked","done","cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="text-right">
                  <button onClick={async () => { if (confirm("Delete job?")) { await del({ data: { id: j.id } }); refresh(); } }} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {data.jobs.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-white/40 text-xs">No jobs queued. Add one by order code.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MaintenancePanel() {
  const list = useServerFn(panelListQueue);
  const add = useServerFn(panelAddMaintenance);
  const del = useServerFn(panelDeleteMaintenance);
  const [data, setData] = useState<any>({ machines: [], blocks: [] });
  const [form, setForm] = useState({ machine_id: "", starts_at: "", ends_at: "", notes: "" });
  const refresh = () => list().then(setData).catch(() => {});
  useEffect(() => { refresh(); }, []);
  async function submit() {
    if (!form.machine_id || !form.starts_at || !form.ends_at) return toast.error("Fill machine + window");
    try {
      await add({ data: { machine_id: form.machine_id, starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString(), notes: form.notes || undefined, kind: "maintenance" } });
      setForm({ machine_id: "", starts_at: "", ends_at: "", notes: "" });
      refresh();
    } catch (e: any) { toast.error(e.message ?? String(e)); }
  }
  return (
    <Card className="bg-neutral-900 border-white/10 text-white p-5">
      <h2 className="text-lg font-semibold mb-4">Machine Calendar — Maintenance windows</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <select value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })} className="bg-black/40 border border-white/10 rounded px-2 py-2 text-xs">
          <option value="">— machine —</option>
          {data.machines.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="bg-black/40 border-white/10 text-white text-xs" />
        <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="bg-black/40 border-white/10 text-white text-xs" />
        <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-black/40 border-white/10 text-white text-xs" />
        <Button onClick={submit}>+ Block</Button>
      </div>
      <ul className="divide-y divide-white/5 text-sm">
        {(data.blocks ?? []).map((b: any) => {
          const m = data.machines.find((x: any) => x.id === b.machine_id);
          return (
            <li key={b.id} className="py-2 flex justify-between">
              <div>
                <div className="font-medium">{m?.name ?? "?"} · <span className="text-white/50 text-xs">{b.kind}</span></div>
                <div className="text-xs text-white/50">{new Date(b.starts_at).toLocaleString()} → {new Date(b.ends_at).toLocaleString()}</div>
                {b.notes && <div className="text-xs text-white/40">{b.notes}</div>}
              </div>
              <button onClick={async () => { await del({ data: { id: b.id } }); refresh(); }} className="text-red-400 text-xs">Remove</button>
            </li>
          );
        })}
        {(data.blocks ?? []).length === 0 && <li className="text-xs text-white/40 py-4">No maintenance windows scheduled.</li>}
      </ul>
    </Card>
  );
}
