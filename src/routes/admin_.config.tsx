// TOREO AI Factory OS — /admin/config
// Unified admin configuration surface (Part 5.1 + follow-up).
// One route file, multiple functional sections (URL-hashable via ?section=).
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminCheck } from "@/lib/api/admin.functions";
import {
  panelGetSettings, panelUpdateSettings,
  panelListMachines, panelUpsertMachine, panelDeleteMachine,
  panelListMaterials, panelUpsertMaterial, panelDeleteMaterial, panelSetMaterialStatus,
} from "@/lib/api/factory.functions";

import { panelOvernightOptimize, panelBatchSuggest } from "@/lib/api/insights.functions";
import { panelRecomputeSchedule } from "@/lib/api/scheduler.functions";
import { z } from "zod";
import { toast } from "sonner";

const searchSchema = z.object({ section: z.string().optional() }).partial();

export const Route = createFileRoute("/admin_/config")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Admin Config · TOREO" }, { name: "robots", content: "noindex" }] }),
  component: ConfigPage,
});

const SECTIONS = [
  { id: "company", label: "Company" },
  { id: "pricing", label: "Pricing" },
  { id: "materials", label: "Materials" },
  { id: "machines", label: "Machines" },
  { id: "ai", label: "AI Modules" },
  { id: "timeline", label: "Timeline" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "system", label: "System" },
  { id: "optimizers", label: "Optimizers" },
] as const;
type SectionId = typeof SECTIONS[number]["id"];

function ConfigPage() {
  const check = useServerFn(adminCheck);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const search = useSearch({ from: "/admin_/config" }) as { section?: string };
  const [section, setSection] = useState<SectionId>(
    (SECTIONS.find((s) => s.id === search.section)?.id ?? "company") as SectionId,
  );
  useEffect(() => { check().then((r) => setAuthed(r.authed)).catch(() => setAuthed(false)); }, [check]);

  if (authed === null) return <div className="min-h-screen bg-[#0a0d12] text-white/40 text-xs font-mono grid place-items-center">VERIFYING…</div>;
  if (!authed) return <div className="min-h-screen bg-[#0a0d12] text-white grid place-items-center">Not authenticated. <Link to="/admin" className="underline text-amber-300 ml-2">Sign in</Link></div>;

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white">
      <header className="border-b border-white/10 px-6 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-amber-300/70 font-mono">System Config</div>
          <h1 className="text-2xl font-semibold mt-1">Admin Control Panel</h1>
        </div>
        <div className="flex gap-4 text-xs text-white/60">
          <Link to="/admin/live" className="hover:text-white">Live</Link>
          <Link to="/admin/scheduler" className="hover:text-white">Scheduler</Link>
          <Link to="/admin/factory" className="hover:text-white">Factory</Link>
          <Link to="/admin" className="hover:text-white">Orders</Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid md:grid-cols-[220px_1fr] gap-8">
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full text-left px-3 py-2 text-xs font-mono rounded transition ${section === s.id ? "bg-amber-300/10 text-amber-300 border border-amber-300/30" : "text-white/60 hover:text-white hover:bg-white/[0.03] border border-transparent"}`}
            >
              {s.label.toUpperCase()}
            </button>
          ))}
        </nav>

        <main className="min-w-0">
          {section === "company" && <CompanySection />}
          {section === "pricing" && <PricingSection />}
          {section === "materials" && <MaterialsSection />}
          {section === "machines" && <MachinesSection />}
          {section === "ai" && <AISection />}
          {section === "timeline" && <TimelineSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "security" && <SecuritySection />}
          {section === "system" && <SystemSection />}
          {section === "optimizers" && <OptimizersSection />}
        </main>
      </div>
    </div>
  );
}

// ---------- Shared helpers ----------

const inp = "w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm focus:border-white/30 outline-none";
const Label = ({ children }: { children: React.ReactNode }) => <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">{children}</div>;
const Panel = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className="border border-white/10 bg-white/[0.02] rounded p-5 mb-4">
    <div className="flex items-center justify-between mb-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">{title}</div>
      {right}
    </div>
    {children}
  </section>
);

function useSettings() {
  const get = useServerFn(panelGetSettings);
  const upd = useServerFn(panelUpdateSettings);
  const [s, setS] = useState<any>(null);
  useEffect(() => { get().then(setS).catch(() => setS({})); }, [get]);
  async function save(patch: Record<string, unknown>) {
    try { const r = await upd({ data: patch as any }); setS(r); toast.success("Saved"); }
    catch (e: any) { toast.error(e.message ?? "Save failed"); }
  }
  return { s, setS, save };
}

// ---------- COMPANY ----------
function CompanySection() {
  const { s, save } = useSettings();
  const info = (s?.company_info ?? {}) as any;
  const [f, setF] = useState<any>({});
  useEffect(() => { setF({
    name: info.name ?? "TOREO",
    tagline: info.tagline ?? "",
    email: info.email ?? "info@toreo.gr",
    phone: info.phone ?? "",
    address: info.address ?? "",
    vat: info.vat ?? "",
    website: info.website ?? "https://www.toreo.gr",
    hours: info.hours ?? "Mon–Fri 09:00–18:00",
    logo_url: info.logo_url ?? "",
  }); /* eslint-disable-next-line */ }, [s?.id]);
  if (!s) return <div className="text-xs text-white/40">Loading…</div>;
  return (
    <Panel title="Company Information">
      <div className="grid md:grid-cols-2 gap-4">
        {(["name","tagline","email","phone","website","vat","hours","logo_url","address"] as const).map((k) => (
          <label key={k} className="block text-xs">
            <Label>{k.replace("_", " ")}</Label>
            <input className={inp} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="mt-4"><button onClick={() => save({ company_info: f })} className="bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded">SAVE COMPANY</button></div>
    </Panel>
  );
}

// ---------- PRICING ----------
function PricingSection() {
  const { s, save } = useSettings();
  const [f, setF] = useState<any>({});
  useEffect(() => { if (s) setF({ ...s }); }, [s]);
  if (!s) return <div className="text-xs text-white/40">Loading…</div>;
  const num = (k: string) => (
    <label key={k} className="block text-xs">
      <Label>{k.replace(/_/g, " ")}</Label>
      <input className={inp} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <>
      <Panel title="Business Rules & Margins">
        <div className="grid md:grid-cols-3 gap-4">
          {["min_margin_pct","min_hourly_rate_eur","min_production_charge_eur","min_order_value_eur","work_start_hour","work_end_hour"].map(num)}
          <label className="flex items-center gap-2 text-xs mt-6">
            <input type="checkbox" checked={!!f.allow_overnight_default} onChange={(e) => setF({ ...f, allow_overnight_default: e.target.checked })} />
            Overnight-OK by default
          </label>
        </div>
      </Panel>
      <Panel title="Urgency Surcharge Rules">
        <div className="grid md:grid-cols-4 gap-4">
          {["urgency_surcharge_flexible_eur","urgency_surcharge_standard_eur","urgency_surcharge_urgent_eur","urgency_high_load_threshold_hours"].map(num)}
        </div>
        <p className="mt-3 text-[11px] text-white/40">Urgent surcharge auto-applies to new AI quotes; extra €5 added if backlog exceeds the load threshold.</p>
      </Panel>
      <button onClick={() => {
        const patch: any = {};
        for (const k of ["min_margin_pct","min_hourly_rate_eur","min_production_charge_eur","min_order_value_eur","work_start_hour","work_end_hour","urgency_surcharge_flexible_eur","urgency_surcharge_standard_eur","urgency_surcharge_urgent_eur","urgency_high_load_threshold_hours"]) {
          const v = Number(f[k]); if (Number.isFinite(v)) patch[k] = v;
        }
        patch.allow_overnight_default = !!f.allow_overnight_default;
        save(patch);
      }} className="bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded">SAVE PRICING</button>
    </>
  );
}

// ---------- MATERIALS ----------
function MaterialsSection() {
  const list = useServerFn(panelListMaterials);
  const upsert = useServerFn(panelUpsertMaterial);
  const del = useServerFn(panelDeleteMaterial);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  async function refresh() { setRows(await list() as any[]); }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);
  async function save() {
    if (!editing) return;
    const patch: any = {
      code: editing.code, name: editing.name, family: editing.family, process: editing.process ?? "3d_printing",
      color: editing.color ?? null, price_per_kg: Number(editing.price_per_kg) || null,
      density_g_cm3: Number(editing.density_g_cm3) || null, stock_kg: Number(editing.stock_kg) || null,
      active: editing.active !== false,
    };
    try { await upsert({ data: { id: editing.id, patch } }); toast.success("Saved"); setEditing(null); refresh(); }
    catch (e: any) { toast.error(e.message ?? "Save failed"); }
  }
  return (
    <Panel title="Materials Catalog" right={<button onClick={() => setEditing({ family: "PLA", process: "3d_printing", active: true })} className="bg-amber-300 text-black text-xs font-mono px-3 py-1.5 rounded">+ NEW</button>}>
      <div className="space-y-1">
        {rows.map((m) => (
          <div key={m.id} className="flex items-center justify-between border border-white/10 rounded px-3 py-2 text-sm">
            <div><span className="font-mono text-xs text-amber-300/80">{m.code}</span> · {m.family} · {m.name} · <span className="text-white/50">{m.stock_kg ?? 0}kg · €{m.price_per_kg ?? 0}/kg</span></div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(m)} className="text-xs text-sky-300 hover:underline">Edit</button>
              <button onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: m.id } }); refresh(); } }} className="text-xs text-red-300 hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-xs text-white/40">No materials yet.</div>}
      </div>
      {editing && (
        <div className="mt-5 border border-amber-300/30 rounded p-4 bg-amber-300/[0.02] space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            {["code","name","family","process","color"].map((k) => (
              <label key={k} className="text-xs"><Label>{k}</Label><input className={inp} value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></label>
            ))}
            {["price_per_kg","density_g_cm3","stock_kg"].map((k) => (
              <label key={k} className="text-xs"><Label>{k}</Label><input className={inp} value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active / in catalog</label>
          <div className="flex gap-2"><button onClick={save} className="bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded">SAVE</button><button onClick={() => setEditing(null)} className="border border-white/15 text-xs font-mono px-4 py-2 rounded">CANCEL</button></div>
        </div>
      )}
    </Panel>
  );
}

// ---------- MACHINES ----------
function MachinesSection() {
  const list = useServerFn(panelListMachines);
  const upsert = useServerFn(panelUpsertMachine);
  const del = useServerFn(panelDeleteMachine);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  async function refresh() { setRows(await list() as any[]); }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);
  async function save() {
    if (!editing) return;
    const patch: any = {
      name: editing.name, kind: editing.kind ?? "printer", vendor: editing.vendor ?? null, model: editing.model ?? null,
      hourly_cost: Number(editing.hourly_cost) || null, power_watts: Number(editing.power_watts) || null,
      status: editing.status ?? "idle", active: editing.active !== false,
      nozzles: (editing.nozzles_str ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
    };
    try { await upsert({ data: { id: editing.id, patch } }); toast.success("Saved"); setEditing(null); refresh(); }
    catch (e: any) { toast.error(e.message ?? "Save failed"); }
  }
  return (
    <Panel title="Machines Fleet" right={<button onClick={() => setEditing({ kind: "printer", status: "idle", active: true, nozzles_str: "0.4" })} className="bg-amber-300 text-black text-xs font-mono px-3 py-1.5 rounded">+ NEW</button>}>
      <div className="space-y-1">
        {rows.map((m) => (
          <div key={m.id} className="flex items-center justify-between border border-white/10 rounded px-3 py-2 text-sm">
            <div><span className="text-white">{m.name}</span> <span className="text-white/50">· {m.kind} · nozzles {(m.nozzles ?? []).join("/") || "—"} · {m.status}{m.active ? "" : " · INACTIVE"}</span></div>
            <div className="flex gap-2">
              <button onClick={() => setEditing({ ...m, nozzles_str: (m.nozzles ?? []).join(",") })} className="text-xs text-sky-300 hover:underline">Edit</button>
              <button onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: m.id } }); refresh(); } }} className="text-xs text-red-300 hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-xs text-white/40">No machines yet.</div>}
      </div>
      {editing && (
        <div className="mt-5 border border-amber-300/30 rounded p-4 bg-amber-300/[0.02] space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            {["name","kind","vendor","model"].map((k) => (
              <label key={k} className="text-xs"><Label>{k}</Label><input className={inp} value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></label>
            ))}
            <label className="text-xs"><Label>nozzles (comma)</Label><input className={inp} value={editing.nozzles_str ?? ""} onChange={(e) => setEditing({ ...editing, nozzles_str: e.target.value })} /></label>
            {["hourly_cost","power_watts"].map((k) => (
              <label key={k} className="text-xs"><Label>{k}</Label><input className={inp} value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></label>
            ))}
            <label className="text-xs"><Label>status</Label>
              <select className={inp} value={editing.status ?? "idle"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="idle">idle</option><option value="running">running</option><option value="maintenance">maintenance</option><option value="offline">offline</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
          <div className="flex gap-2"><button onClick={save} className="bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded">SAVE</button><button onClick={() => setEditing(null)} className="border border-white/15 text-xs font-mono px-4 py-2 rounded">CANCEL</button></div>
        </div>
      )}
    </Panel>
  );
}

// ---------- AI MODULES ----------
function AISection() {
  const { s, save } = useSettings();
  const modules = (s?.ai_modules ?? {}) as any;
  const [f, setF] = useState<any>({});
  useEffect(() => { setF({
    analysis: modules.analysis !== false,
    pricing: modules.pricing !== false,
    machine_assignment: modules.machine_assignment !== false,
    calendar_automation: modules.calendar_automation !== false,
    scheduler_automation: modules.scheduler_automation !== false,
    customer_ai_visible: !!modules.customer_ai_visible,
  }); /* eslint-disable-next-line */ }, [s?.id]);
  if (!s) return <div className="text-xs text-white/40">Loading…</div>;
  const rows: Array<[keyof typeof f, string, string]> = [
    ["analysis", "AI Analysis", "Auto-run DFM + costing on new quotes."],
    ["pricing", "AI Pricing", "AI computes cost breakdown & margin."],
    ["machine_assignment", "Auto Machine Assignment", "Assign printer based on purpose/nozzle."],
    ["calendar_automation", "Calendar Automation", "New quotes enter production calendar."],
    ["scheduler_automation", "Scheduler Automation", "Overnight optimizer & smart batching."],
    ["customer_ai_visible", "Show AI to Customer", "OFF = customer only sees final price."],
  ];
  return (
    <Panel title="AI Modules & Automation">
      <div className="space-y-3">
        {rows.map(([k, label, desc]) => (
          <label key={String(k)} className="flex items-start gap-3 border border-white/10 rounded p-3 cursor-pointer hover:border-white/20">
            <input type="checkbox" className="mt-1" checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />
            <div><div className="text-sm text-white">{label}</div><div className="text-xs text-white/50">{desc}</div></div>
          </label>
        ))}
      </div>
      <div className="mt-4"><button onClick={() => save({ ai_modules: f })} className="bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded">SAVE AI CONFIG</button></div>
    </Panel>
  );
}

// ---------- TIMELINE ----------
function TimelineSection() {
  const { s, save } = useSettings();
  const [stages, setStages] = useState<string>("");
  useEffect(() => {
    const cur = Array.isArray(s?.timeline_stages) && s.timeline_stages.length
      ? s.timeline_stages
      : ["Quote Submitted","Engineering Review","Quote Confirmed","Payment Received","In Production","Quality Inspection","Ready for Shipping","Shipped","Delivered"];
    setStages(cur.join("\n"));
  }, [s?.id]);
  if (!s) return <div className="text-xs text-white/40">Loading…</div>;
  return (
    <Panel title="Customer Timeline Stages">
      <Label>One stage per line (in order)</Label>
      <textarea rows={12} className={inp + " font-mono text-sm"} value={stages} onChange={(e) => setStages(e.target.value)} />
      <div className="mt-4"><button onClick={() => save({ timeline_stages: stages.split("\n").map((l) => l.trim()).filter(Boolean) })} className="bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded">SAVE TIMELINE</button></div>
    </Panel>
  );
}

// ---------- NOTIFICATIONS ----------
function NotificationsSection() {
  const { s, save } = useSettings();
  const n = (s?.notifications ?? {}) as any;
  const [f, setF] = useState<any>({});
  useEffect(() => { setF({
    admin_email: n.admin_email ?? "INFO@TOREO.GR",
    notify_new_quote: n.notify_new_quote !== false,
    notify_status_change: n.notify_status_change !== false,
    customer_confirmation: n.customer_confirmation !== false,
    quote_subject: n.quote_subject ?? "Quote Request Received – {order_code}",
    status_subject: n.status_subject ?? "Order {order_code} · Status Update",
  }); /* eslint-disable-next-line */ }, [s?.id]);
  if (!s) return <div className="text-xs text-white/40">Loading…</div>;
  return (
    <Panel title="Notifications">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-xs"><Label>Admin notification email</Label><input className={inp} value={f.admin_email ?? ""} onChange={(e) => setF({ ...f, admin_email: e.target.value })} /></label>
        <label className="text-xs"><Label>New quote email subject</Label><input className={inp} value={f.quote_subject ?? ""} onChange={(e) => setF({ ...f, quote_subject: e.target.value })} /></label>
        <label className="text-xs"><Label>Status update email subject</Label><input className={inp} value={f.status_subject ?? ""} onChange={(e) => setF({ ...f, status_subject: e.target.value })} /></label>
      </div>
      <div className="mt-4 space-y-2">
        {(["notify_new_quote","notify_status_change","customer_confirmation"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /> {k.replace(/_/g, " ")}</label>
        ))}
      </div>
      <div className="mt-4"><button onClick={() => save({ notifications: f })} className="bg-amber-300 text-black text-xs font-mono px-4 py-2 rounded">SAVE NOTIFICATIONS</button></div>
    </Panel>
  );
}

// ---------- SECURITY ----------
function SecuritySection() {
  return (
    <Panel title="Security & Access">
      <p className="text-sm text-white/70 mb-3">Admin access is protected by a shared password cookie session (env <code className="text-amber-300">ADMIN_PASSWORD</code>) and per-user Supabase roles (<code className="text-amber-300">has_role(user, 'admin')</code>).</p>
      <ul className="text-xs text-white/60 space-y-2 list-disc list-inside">
        <li>Rotate the admin password by updating the <code>ADMIN_PASSWORD</code> secret.</li>
        <li>Grant a signed-in user admin access by adding a row to <code>user_roles</code> with role <code>admin</code>.</li>
        <li>All admin activity is logged to <code>admin_activity_log</code> (IP + user agent).</li>
        <li>Row-Level Security is enforced on every customer-owned table.</li>
      </ul>
      <div className="mt-4 flex gap-2">
        <Link to="/admin" className="border border-white/15 hover:border-white/30 text-xs font-mono px-3 py-2 rounded">Open Orders</Link>
        <a href="/admin" onClick={(e) => { e.preventDefault(); if (confirm("Sign out of admin?")) location.href = "/admin?signout=1"; }} className="border border-red-400/30 hover:border-red-400 text-red-300 text-xs font-mono px-3 py-2 rounded">Sign out</a>
      </div>
    </Panel>
  );
}

// ---------- SYSTEM ----------
function SystemSection() {
  return (
    <Panel title="System">
      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <Link to="/admin/live" className="border border-white/10 rounded p-3 hover:border-white/25 hover:bg-white/[0.03]">
          <div className="text-white text-sm">Live Dashboard</div><div className="text-white/50 mt-1">Realtime factory telemetry, utilization, revenue.</div>
        </Link>
        <Link to="/admin/scheduler" className="border border-white/10 rounded p-3 hover:border-white/25 hover:bg-white/[0.03]">
          <div className="text-white text-sm">Smart Scheduler</div><div className="text-white/50 mt-1">Backlog, machine calendar, maintenance blocks.</div>
        </Link>
        <Link to="/admin/factory" className="border border-white/10 rounded p-3 hover:border-white/25 hover:bg-white/[0.03]">
          <div className="text-white text-sm">Factory Control</div><div className="text-white/50 mt-1">Machines, materials, AI analysis overrides.</div>
        </Link>
        <a href="mailto:INFO@TOREO.GR" className="border border-white/10 rounded p-3 hover:border-white/25 hover:bg-white/[0.03]">
          <div className="text-white text-sm">Support</div><div className="text-white/50 mt-1">Contact platform support.</div>
        </a>
      </div>
      <div className="mt-6 text-[11px] text-white/40 font-mono">Version · TOREO AI Factory OS 1.0</div>
    </Panel>
  );
}

// ---------- OPTIMIZERS ----------
function OptimizersSection() {
  const overnight = useServerFn(panelOvernightOptimize);
  const batch = useServerFn(panelBatchSuggest);
  const recompute = useServerFn(panelRecomputeSchedule);
  const [batches, setBatches] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function run(name: string, fn: () => Promise<any>, onResult?: (r: any) => void) {
    setBusy(name);
    try { const r = await fn(); onResult?.(r); toast.success(`${name} complete`); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }
  return (
    <Panel title="Production Optimizers">
      <div className="flex flex-wrap gap-3">
        <button disabled={!!busy} onClick={() => run("Recompute schedule", () => recompute())} className="border border-white/15 hover:border-sky-300/50 px-4 py-2 text-xs font-mono rounded disabled:opacity-40">{busy === "Recompute schedule" ? "…" : "RECOMPUTE SCHEDULE"}</button>
        <button disabled={!!busy} onClick={() => run("Overnight optimize", () => overnight())} className="border border-white/15 hover:border-amber-300/50 px-4 py-2 text-xs font-mono rounded disabled:opacity-40">{busy === "Overnight optimize" ? "…" : "OPTIMIZE OVERNIGHT"}</button>
        <button disabled={!!busy} onClick={() => run("Batch suggest", () => batch(), (r) => setBatches(r.suggestions))} className="border border-white/15 hover:border-emerald-300/50 px-4 py-2 text-xs font-mono rounded disabled:opacity-40">{busy === "Batch suggest" ? "…" : "SUGGEST BATCHES"}</button>
      </div>
      {batches !== null && (
        <div className="mt-4 space-y-2">
          {batches.length === 0 && <div className="text-xs text-white/40">No batch opportunities right now.</div>}
          {batches.map((b) => (
            <div key={b.key} className="border border-white/10 rounded p-3 text-xs">
              <div className="flex justify-between mb-1"><span className="font-mono text-amber-300/80">{b.material_code} · {b.service}</span><span className="text-white/50">{b.jobs.length} jobs · {b.total_hours.toFixed(1)}h</span></div>
              <div className="text-white/60">{b.jobs.map((j: any) => j.order_code).join(", ")}</div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
