import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminLogin,
  adminLogout,
  adminCheck,
} from "@/lib/api/admin.functions";
import {
  panelStats,
  panelListOrders,
  panelGetOrder,
  panelUpdateOrder,
  panelCreateOrder,
  panelDeleteOrder,
  panelAddEvent,
  panelDeleteEvent,
  panelAddComment,
  panelDeleteComment,
  panelUploadFile,
  panelDeleteFile,
  panelSignFile,
  panelListCustomers,
  panelGetCustomer,
  panelListLogs,
  panelGlobalSearch,
  panelSendCustomerUpdate,
  panelCompleteProduction,
  panelAssignPrinter,
  panelMoveJobInQueue,
  panelGetOrderJob,
  panelFactoryDashboard,
} from "@/lib/api/panel.functions";
import { STATUS_FLOW, STATUS_LABEL } from "@/lib/api/orders.functions";
import { panelListAnalyses, panelAnalyzeFile, panelApplyOverride, panelListMachines } from "@/lib/api/factory.functions";
import { AIAnalysisCard } from "@/components/factory/AIAnalysisCard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "TOREO — Admin Console" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminApp,
});

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const COURIERS = ["ACS", "ELTA Courier", "Geniki Taxydromiki", "Speedex", "DHL", "UPS", "FedEx", "TNT"];

type Section =
  | "dashboard" | "orders" | "quotes" | "customers" | "tracking" | "uploads"
  | "notifications" | "settings" | "users" | "logs";

// ============= ROOT =============
function AdminApp() {
  const check = useServerFn(adminCheck);
  const login = useServerFn(adminLogin);
  const logout = useServerFn(adminLogout);
  const [phase, setPhase] = useState<"check" | "login" | "ready">("check");
  const [section, setSection] = useState<Section>("dashboard");
  const [openOrderCode, setOpenOrderCode] = useState<string | null>(null);
  const [openCustomerEmail, setOpenCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await check();
        setPhase(r.authed ? "ready" : "login");
      } catch {
        setPhase("login");
      }
    })();
  }, []); // eslint-disable-line

  if (phase === "check") {
    return <div className="min-h-screen bg-[#0a0d12] text-white/40 text-xs font-mono flex items-center justify-center">VERIFYING SESSION…</div>;
  }
  if (phase === "login") return <LoginGate onSuccess={() => setPhase("ready")} login={login} />;

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white flex">
      <Sidebar
        active={section}
        onNav={(s) => { setSection(s); setOpenOrderCode(null); setOpenCustomerEmail(null); }}
        onLogout={async () => { await logout(); setPhase("login"); }}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar onJumpOrder={(c) => { setSection("orders"); setOpenOrderCode(c); }} />
        <div className="flex-1 overflow-y-auto">
          {section === "dashboard" && <Dashboard onOpenOrder={(c) => { setSection("orders"); setOpenOrderCode(c); }} />}
          {section === "orders" && (
            openOrderCode
              ? <OrderDetail code={openOrderCode} onBack={() => setOpenOrderCode(null)} />
              : <OrdersList onOpen={setOpenOrderCode} />
          )}
          {section === "quotes" && <OrdersList onOpen={setOpenOrderCode} preset="quote_received" title="QUOTES" />}
          {section === "customers" && (
            openCustomerEmail
              ? <CustomerDetail email={openCustomerEmail} onBack={() => setOpenCustomerEmail(null)} onOpenOrder={(c) => { setSection("orders"); setOpenOrderCode(c); }} />
              : <CustomersList onOpen={setOpenCustomerEmail} />
          )}
          {section === "tracking" && <TrackingList onOpen={(c) => { setOpenOrderCode(c); setSection("orders"); }} />}
          {section === "uploads" && <UploadsList onOpenOrder={(c) => { setSection("orders"); setOpenOrderCode(c); }} />}
          {section === "notifications" && <NotificationsPanel />}
          {section === "settings" && <SettingsPanel />}
          {section === "users" && <UsersPanel />}
          {section === "logs" && <LogsPanel />}
        </div>
      </main>
    </div>
  );
}

// ============= LOGIN =============
function LoginGate({ onSuccess, login }: { onSuccess: () => void; login: ReturnType<typeof useServerFn<typeof adminLogin>> }) {
  const [user, setUser] = useState("admin");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (user.trim().toLowerCase() !== "admin") { setErr("Invalid credentials"); setBusy(false); return; }
      const r = await login({ data: { password: pw } });
      if (r.ok) onSuccess();
      else setErr("Invalid credentials");
    } catch {
      setErr("Login failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center font-mono text-[10px] tracking-[0.4em] text-white/40 hover:text-white/70 mb-10">← TOREO</Link>
        <div className="border border-white/10 bg-[#0f131a] rounded-sm p-8">
          <div className="font-mono text-[10px] tracking-[0.4em] text-amber-300/80 mb-2">ADMIN CONSOLE</div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Restricted access</h1>
          <p className="text-xs text-white/40 mb-6">Authorized personnel only. All actions are logged.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <Labeled label="Username">
              <input value={user} onChange={(e) => setUser(e.target.value)} autoFocus autoComplete="username"
                className="w-full bg-black/50 border border-white/10 rounded-sm px-3 py-2.5 text-sm focus:border-amber-300/60 outline-none" />
            </Labeled>
            <Labeled label="Password">
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password"
                className="w-full bg-black/50 border border-white/10 rounded-sm px-3 py-2.5 text-sm focus:border-amber-300/60 outline-none" />
            </Labeled>
            {err && <div className="text-xs text-red-400 font-mono">{err}</div>}
            <button disabled={busy || !pw} className="w-full bg-amber-300 text-black rounded-sm py-2.5 text-xs font-mono tracking-[0.3em] font-semibold disabled:opacity-40">
              {busy ? "AUTHENTICATING…" : "SIGN IN"}
            </button>
          </form>
        </div>
        <div className="text-center text-[10px] font-mono text-white/30 mt-6">SESSION EXPIRES AFTER 8 HOURS OF INACTIVITY</div>
      </div>
    </div>
  );
}

// ============= SIDEBAR =============
const NAV: { id: Section; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "quotes", label: "Quotes" },
  { id: "customers", label: "Customers" },
  { id: "tracking", label: "Tracking" },
  { id: "uploads", label: "Uploads" },
  { id: "notifications", label: "Notifications" },
  { id: "settings", label: "Settings" },
  { id: "users", label: "Admin Users" },
  { id: "logs", label: "Logs" },
];

function Sidebar({ active, onNav, onLogout }: { active: Section; onNav: (s: Section) => void; onLogout: () => void }) {
  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-white/10 bg-[#0c1016] sticky top-0 h-screen">
      <div className="px-5 py-5 border-b border-white/10">
        <Link to="/" className="font-mono text-[10px] tracking-[0.4em] text-white/60 hover:text-white">← TOREO</Link>
        <div className="mt-2 font-mono text-[10px] tracking-[0.4em] text-amber-300/80">ADMIN CONSOLE</div>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => onNav(n.id)}
            className={`w-full text-left px-5 py-2.5 text-xs font-mono tracking-[0.2em] uppercase transition border-l-2 ${
              active === n.id ? "border-amber-300 bg-white/[0.04] text-white" : "border-transparent text-white/50 hover:text-white hover:bg-white/[0.02]"
            }`}>
            {n.label}
          </button>
        ))}
      </nav>
      <button onClick={onLogout} className="m-3 border border-white/10 hover:border-red-400/40 hover:text-red-300 rounded-sm py-2 text-[10px] font-mono tracking-[0.3em] text-white/60">
        LOGOUT
      </button>
    </aside>
  );
}

function TopBar({ onJumpOrder }: { onJumpOrder: (code: string) => void }) {
  const search = useServerFn(panelGlobalSearch);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setRes(null); return; }
    const t = setTimeout(async () => {
      try { setRes(await search({ data: { q } })); setOpen(true); } catch { setRes(null); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  return (
    <div className="sticky top-0 z-20 bg-[#0a0d12]/95 backdrop-blur border-b border-white/10 px-4 lg:px-8 py-3 flex items-center gap-4">
      <div className="lg:hidden font-mono text-[10px] tracking-[0.3em] text-amber-300/80">TOREO · ADMIN</div>
      <div className="flex-1 max-w-xl relative">
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => res && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search orders, customers, tracking…"
          className="w-full bg-black/40 border border-white/10 focus:border-white/30 outline-none rounded-sm px-3 py-2 text-sm" />
        {open && res && (
          <div className="absolute left-0 right-0 mt-1 bg-[#0f131a] border border-white/10 rounded-sm shadow-2xl max-h-96 overflow-y-auto z-30">
            {res.orders.length === 0 && res.quotes.length === 0 && <div className="px-3 py-3 text-xs text-white/40">No matches.</div>}
            {res.orders.map((o: any) => (
              <button key={o.order_code} onMouseDown={() => { onJumpOrder(o.order_code); setQ(""); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-white/[0.04] border-b border-white/5 flex items-center justify-between gap-3">
                <span className="font-mono text-sm">{o.order_code}</span>
                <span className="text-xs text-white/60 truncate">{o.customer_name} · {o.customer_email}</span>
                <StatusPill status={o.status} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="hidden md:block text-[10px] font-mono tracking-[0.3em] text-white/40">{new Date().toLocaleDateString("en-GB")}</div>
    </div>
  );
}

// ============= DASHBOARD =============
function Dashboard({ onOpenOrder }: { onOpenOrder: (c: string) => void }) {
  const stats = useServerFn(panelStats);
  const [d, setD] = useState<any | null>(null);
  useEffect(() => { stats().then(setD).catch(() => setD(null)); }, []); // eslint-disable-line

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <PageHeader kicker="OVERVIEW" title="Dashboard" subtitle="Real-time operational summary" />
      {!d ? <Skeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi label="Total Quotes" value={d.total} accent="amber" />
            <Kpi label="Pending" value={d.pending} />
            <Kpi label="In Production" value={d.inProduction} accent="sky" />
            <Kpi label="Shipped" value={d.shipped} />
            <Kpi label="Delivered" value={d.delivered} accent="emerald" />
            <Kpi label="Customers" value={d.customers} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Kpi label="Revenue (booked)" value={`€${Number(d.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent="amber" wide />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card title="Recent Orders" className="lg:col-span-2">
              <div className="divide-y divide-white/5">
                {d.recent.length === 0 && <div className="text-xs text-white/40 py-4">No orders yet.</div>}
                {d.recent.map((o: any) => (
                  <button key={o.id} onClick={() => onOpenOrder(o.order_code)}
                    className="w-full text-left grid grid-cols-[110px_1fr_auto_auto] items-center gap-3 py-3 hover:bg-white/[0.03] px-2 -mx-2">
                    <span className="font-mono text-sm">{o.order_code}</span>
                    <span className="truncate text-sm">{o.customer_name} <span className="text-white/40">· {o.customer_email}</span></span>
                    <PriorityPill p={o.priority} />
                    <StatusPill status={o.status} />
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Recent Activity">
              <ul className="space-y-2 text-xs">
                {d.activity.length === 0 && <li className="text-white/40">No activity logged.</li>}
                {d.activity.map((a: any) => (
                  <li key={a.id} className="flex items-start gap-3 border-b border-white/5 pb-2">
                    <span className="font-mono text-amber-300/70 text-[10px] mt-0.5">{new Date(a.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="flex-1"><b className="text-white/80">{a.action}</b>{a.target_id && <span className="text-white/40"> · {a.target_id}</span>}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ============= ORDERS LIST =============
function OrdersList({ onOpen, preset, title }: { onOpen: (c: string) => void; preset?: string; title?: string }) {
  const list = useServerFn(panelListOrders);
  const create = useServerFn(panelCreateOrder);
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ q: string; status: string; priority: string; courier: string; sort: "created_at" | "updated_at" | "due_date" | "priority"; dir: "asc" | "desc" }>({ q: "", status: preset ?? "all", priority: "all", courier: "all", sort: "created_at", dir: "desc" });
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setRows(await list({ data: filter as any }) as any); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [filter.status, filter.priority, filter.courier, filter.sort, filter.dir]); // eslint-disable-line
  useEffect(() => { const t = setTimeout(refresh, 250); return () => clearTimeout(t); }, [filter.q]); // eslint-disable-line

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader kicker="ORDERS" title={title ?? "All Orders"} subtitle={`${rows.length} records`}
        right={<button onClick={() => setShowNew(true)} className="bg-amber-300 text-black rounded-sm px-4 py-2 text-[10px] font-mono tracking-[0.3em] font-semibold">+ NEW ORDER</button>} />

      <div className="flex flex-wrap gap-2 items-center">
        <input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="Search…" className="bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-sm w-64" />
        <Select value={filter.status} onChange={(v) => setFilter({ ...filter, status: v })} options={[{ value: "all", label: "All statuses" }, ...STATUS_FLOW.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
        <Select value={filter.priority} onChange={(v) => setFilter({ ...filter, priority: v })} options={[{ value: "all", label: "All priorities" }, ...PRIORITIES.map((p) => ({ value: p, label: p }))]} />
        <Select value={filter.courier} onChange={(v) => setFilter({ ...filter, courier: v })} options={[{ value: "all", label: "All couriers" }, ...COURIERS.map((c) => ({ value: c, label: c }))]} />
        <div className="flex-1" />
        <Select value={filter.sort} onChange={(v) => setFilter({ ...filter, sort: v as any })} options={[
          { value: "created_at", label: "Sort: Created" }, { value: "updated_at", label: "Sort: Updated" },
          { value: "due_date", label: "Sort: Due date" }, { value: "priority", label: "Sort: Priority" }]} />
        <button onClick={() => setFilter({ ...filter, dir: filter.dir === "asc" ? "desc" : "asc" })}
          className="border border-white/10 rounded-sm px-3 py-2 text-xs font-mono">{filter.dir.toUpperCase()}</button>
      </div>

      <div className="border border-white/10 rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-white/[0.03] text-[10px] font-mono tracking-[0.2em] text-white/40">
            <tr>
              <Th>Order</Th><Th>Customer</Th><Th>Company</Th><Th>Service</Th>
              <Th>Status</Th><Th>Priority</Th><Th>Price</Th><Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-white/40">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-white/40">No orders.</td></tr>}
            {rows.map((o) => (
              <tr key={o.id} onClick={() => onOpen(o.order_code)} className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer">
                <Td><span className="font-mono">{o.order_code}</span></Td>
                <Td><div>{o.customer_name}</div><div className="text-[10px] text-white/40">{o.customer_email}</div></Td>
                <Td className="text-white/70">{o.company ?? "—"}</Td>
                <Td className="text-white/70">{o.service ?? "—"}</Td>
                <Td><StatusPill status={o.status} /></Td>
                <Td><PriorityPill p={o.priority} /></Td>
                <Td className="font-mono">{o.quote_price ? `€${Number(o.quote_price).toFixed(2)}` : "—"}</Td>
                <Td className="text-[11px] font-mono text-white/50">{new Date(o.created_at).toLocaleDateString("en-GB")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && <NewOrderModal create={create} onClose={() => setShowNew(false)} onCreated={(code: string) => { setShowNew(false); onOpen(code); }} />}
    </div>
  );
}

function NewOrderModal({ create, onClose, onCreated }: any) {
  const [f, setF] = useState({ customer_name: "", customer_email: "", customer_phone: "", company: "", service: "", material: "", message: "", quote_price: "", priority: "normal" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const payload: any = { ...f };
      if (payload.quote_price) payload.quote_price = Number(payload.quote_price); else delete payload.quote_price;
      for (const k of ["customer_phone", "company", "service", "material", "message"]) if (!payload[k]) delete payload[k];
      const row = await create({ data: payload });
      onCreated(row.order_code);
    } catch (e: any) { setErr(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose} title="New order">
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Customer name *"><input className={inp} value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} /></Labeled>
        <Labeled label="Email *"><input className={inp} value={f.customer_email} onChange={(e) => setF({ ...f, customer_email: e.target.value })} /></Labeled>
        <Labeled label="Phone"><input className={inp} value={f.customer_phone} onChange={(e) => setF({ ...f, customer_phone: e.target.value })} /></Labeled>
        <Labeled label="Company"><input className={inp} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Labeled>
        <Labeled label="Service"><input className={inp} value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} /></Labeled>
        <Labeled label="Material"><input className={inp} value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} /></Labeled>
        <Labeled label="Quote price (€)"><input className={inp} value={f.quote_price} onChange={(e) => setF({ ...f, quote_price: e.target.value })} /></Labeled>
        <Labeled label="Priority">
          <select className={inp} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Labeled>
        <div className="col-span-2"><Labeled label="Message / notes"><textarea rows={3} className={inp} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Labeled></div>
      </div>
      {err && <div className="text-xs text-red-400 mt-3">{err}</div>}
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-xs font-mono tracking-[0.2em] text-white/60">CANCEL</button>
        <button disabled={busy || !f.customer_name || !f.customer_email} onClick={submit} className="bg-amber-300 text-black px-4 py-2 text-xs font-mono tracking-[0.2em] font-semibold rounded-sm disabled:opacity-40">CREATE</button>
      </div>
    </Modal>
  );
}

// ============= ORDER DETAIL =============
const ORDER_TABS = ["customer", "ai", "files", "updates", "tracking", "images", "comments", "status"] as const;
type OrderTab = typeof ORDER_TABS[number];

function OrderDetail({ code, onBack }: { code: string; onBack: () => void }) {
  const get = useServerFn(panelGetOrder);
  const update = useServerFn(panelUpdateOrder);
  const del = useServerFn(panelDeleteOrder);
  const [d, setD] = useState<any | null>(null);
  const [tab, setTab] = useState<OrderTab>("customer");
  const [savedToast, setSavedToast] = useState(false);

  async function refresh() { const r = await get({ data: { order_code: code } }); setD(r); }
  useEffect(() => { refresh(); }, [code]); // eslint-disable-line

  async function patch(p: Record<string, unknown>) {
    if (!d) return;
    try {
      await update({ data: { order_code: code, patch: p as any } });
      setSavedToast(true); setTimeout(() => setSavedToast(false), 1500);
      await refresh();
    } catch (e) { console.error(e); }
  }
  async function deleteOrder() {
    if (!confirm(`Delete ${code}? This removes files, events, messages, and the order itself.`)) return;
    await del({ data: { order_code: code } }); onBack();
  }

  if (!d) return <div className="p-10 text-xs text-white/40 font-mono">LOADING ORDER…</div>;
  const o = d.order;

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button onClick={onBack} className="text-[10px] font-mono tracking-[0.3em] text-white/40 hover:text-white">← ALL ORDERS</button>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-3xl font-semibold font-mono tracking-tight">{o.order_code}</h1>
            <StatusPill status={o.status} />
            <PriorityPill p={o.priority} />
          </div>
          <div className="text-xs text-white/50 mt-1">{o.customer_name} · {o.customer_email}</div>
        </div>
        <div className="flex items-center gap-2">
          {savedToast && <span className="text-[10px] font-mono tracking-[0.3em] text-emerald-300">SAVED ✓</span>}
          <button onClick={deleteOrder} className="border border-red-400/30 hover:border-red-400 text-red-300 rounded-sm px-3 py-2 text-[10px] font-mono tracking-[0.3em]">DELETE</button>
        </div>
      </div>

      <QuickActions o={o} code={code} onChanged={refresh} setTab={setTab} />

      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {ORDER_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-[10px] font-mono tracking-[0.3em] uppercase border-b-2 -mb-px ${tab === t ? "border-amber-300 text-white" : "border-transparent text-white/40 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "customer" && <TabCustomer o={o} patch={patch} />}
      {tab === "ai" && <TabAI code={code} orderMeta={o} />}
      {tab === "files" && <TabFiles d={d} code={code} refresh={refresh} />}
      {tab === "updates" && <TabUpdates d={d} code={code} refresh={refresh} />}
      {tab === "tracking" && <TabTracking o={o} patch={patch} />}
      {tab === "images" && <TabImages d={d} code={code} refresh={refresh} />}
      {tab === "comments" && <TabComments d={d} code={code} refresh={refresh} />}
      {tab === "status" && <TabStatus o={o} patch={patch} />}
    </div>
  );
}

// ============= QUICK ACTIONS =============
function QuickActions({ o, code, onChanged, setTab }: { o: any; code: string; onChanged: () => void; setTab: (t: OrderTab) => void }) {
  const analyze = useServerFn(panelAnalyzeFile);
  const update = useServerFn(panelUpdateOrder);
  const complete = useServerFn(panelCompleteProduction);
  const sendUpdate = useServerFn(panelSendCustomerUpdate);
  const assign = useServerFn(panelAssignPrinter);
  const move = useServerFn(panelMoveJobInQueue);
  const listMachines = useServerFn(panelListMachines);
  const getJob = useServerFn(panelGetOrderJob);
  const upload = useServerFn(panelUploadFile);

  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "priority" | "status" | "assign" | "message" | "tracking">(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [jobInfo, setJobInfo] = useState<any>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const meta = (o?.metadata ?? {}) as any;
  const mode: "prototype" | "durable" | "decorative" =
    meta.production_mode === "durable" || meta.production_mode === "functional" ? "durable" :
    meta.production_mode === "decorative" || meta.production_mode === "display" ? "decorative" : "prototype";

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2000); }

  async function openAssign() {
    setModal("assign");
    try {
      const [m, j] = await Promise.all([listMachines(), getJob({ data: { order_code: code } })]);
      setMachines((m as any[]).filter((x) => x.active !== false));
      setJobInfo(j);
    } catch {}
  }

  async function doAssign(mid: string | null) {
    setBusy("assign");
    try {
      await assign({ data: { order_code: code, machine_id: mid } });
      flash(mid ? "Printer assigned ✓" : "Printer cleared");
      setModal(null); onChanged();
    } catch (e: any) { flash(e.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  async function doMove(direction: "up" | "down" | "top" | "bottom") {
    setBusy("move");
    try {
      await move({ data: { order_code: code, direction } });
      flash(`Moved ${direction} ✓`);
      const j = await getJob({ data: { order_code: code } });
      setJobInfo(j);
    } catch (e: any) { flash(e.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  async function runAI() {
    setBusy("ai");
    try {
      await analyze({ data: { order_code: code, service: "3d_printing", production_mode: mode } });
      flash("Analysis complete ✓"); onChanged(); setTab("ai");
    } catch (e: any) { flash(e.message ?? "AI failed"); }
    finally { setBusy(null); }
  }

  async function setPriority(p: string) {
    setBusy("priority");
    try { await update({ data: { order_code: code, patch: { priority: p as any } } }); flash("Priority updated ✓"); setModal(null); onChanged(); }
    catch (e: any) { flash(e.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  async function setStatus(s: string) {
    setBusy("status");
    try { await update({ data: { order_code: code, patch: { status: s } } }); flash("Status updated ✓ (customer notified)"); setModal(null); onChanged(); }
    catch (e: any) { flash(e.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  async function doComplete() {
    if (!confirm("Advance this order to the next production stage and notify the customer?")) return;
    setBusy("complete");
    try {
      const r: any = await complete({ data: { order_code: code } });
      flash(r?.unchanged ? "Already past production" : `Advanced → ${STATUS_LABEL[r.status] ?? r.status} ✓`);
      onChanged();
    } catch (e: any) { flash(e.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setBusy("photos");
    try {
      for (const file of Array.from(e.target.files)) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = ""; for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        await upload({ data: { order_code: code, file_name: file.name, file_base64: btoa(bin), file_type: file.type, visibility: "customer", folder: "progress" } });
      }
      e.target.value = ""; flash("Photos uploaded ✓"); onChanged();
    } catch (e: any) { flash(e.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  function openPrintable(kind: "quote" | "invoice") {
    const url = `/admin/print/${kind}/${encodeURIComponent(code)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const btn = "px-3 py-2 text-[10px] font-mono tracking-[0.25em] uppercase border rounded-sm transition-colors disabled:opacity-40";
  const btnPri = `${btn} border-amber-300/40 hover:border-amber-300 text-amber-200`;
  const btnDef = `${btn} border-white/10 hover:border-white/40 text-white/80`;
  const btnOk = `${btn} border-emerald-400/40 hover:border-emerald-400 text-emerald-200`;
  const btnBlue = `${btn} border-sky-400/40 hover:border-sky-400 text-sky-200`;

  return (
    <div className="border border-white/10 rounded-sm bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">Quick Actions</div>
        {toast && <span className="text-[10px] font-mono tracking-[0.25em] text-emerald-300">{toast}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btnPri} disabled={busy === "ai"} onClick={runAI}>{busy === "ai" ? "RUNNING…" : "▶ RUN AI AGAIN"}</button>
        <button className={btnDef} onClick={openAssign}>🖨 ASSIGN PRINTER</button>
        <button className={btnDef} onClick={() => setModal("priority")}>⚑ CHANGE PRIORITY</button>
        <button className={btnDef} onClick={openAssign}>≡ MOVE IN QUEUE</button>
        <button className={btnDef} onClick={() => setModal("status")}>◐ CHANGE STATUS</button>
        <input ref={photoRef} type="file" hidden multiple accept="image/*" onChange={onPhotos} />
        <button className={btnDef} disabled={busy === "photos"} onClick={() => photoRef.current?.click()}>{busy === "photos" ? "UPLOADING…" : "📷 UPLOAD PHOTOS"}</button>
        <button className={btnBlue} onClick={() => setModal("message")}>✉ SEND CUSTOMER UPDATE</button>
        <button className={btnDef} onClick={() => openPrintable("quote")}>📄 QUOTE PDF</button>
        <button className={btnDef} onClick={() => openPrintable("invoice")}>💳 INVOICE</button>
        <button className={btnOk} disabled={busy === "complete"} onClick={doComplete}>✓ COMPLETE PRODUCTION</button>
        <button className={btnBlue} onClick={() => setModal("tracking")}>📦 ADD TRACKING</button>
      </div>

      {modal === "priority" && (
        <Modal onClose={() => setModal(null)} title="Change priority">
          <div className="flex gap-2 flex-wrap">
            {PRIORITIES.map((p) => (
              <button key={p} onClick={() => setPriority(p)} disabled={busy === "priority"}
                className={`${btn} ${o.priority === p ? "border-amber-300 text-amber-300 bg-amber-300/10" : "border-white/10 text-white/70 hover:border-white/40"}`}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === "status" && (
        <Modal onClose={() => setModal(null)} title="Change status (notifies customer)">
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s) => (
              <button key={s} onClick={() => setStatus(s)} disabled={busy === "status"}
                className={`${btn} ${o.status === s ? "border-amber-300 text-amber-300 bg-amber-300/10" : "border-white/10 text-white/70 hover:border-white/40"}`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === "assign" && (
        <Modal onClose={() => setModal(null)} title="Assign printer / move in queue">
          <div className="space-y-4">
            <div className="border border-white/10 rounded-sm p-3 bg-white/[0.02]">
              <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 mb-1">Current job</div>
              {jobInfo === null && <div className="text-xs text-white/60">No production job yet — assign a printer to create one.</div>}
              {jobInfo && (
                <div className="text-xs text-white/80 space-y-0.5">
                  <div>State: <span className="font-mono uppercase">{jobInfo.job?.state}</span></div>
                  <div>Machine: {jobInfo.machine?.name ?? <span className="text-white/40">— unassigned —</span>}</div>
                  <div>Queue position: {jobInfo.job?.queue_position ?? "—"}</div>
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 mb-2">Machines</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {machines.length === 0 && <div className="text-xs text-white/40">Loading machines…</div>}
                {machines.map((m: any) => {
                  const active = jobInfo?.job?.machine_id === m.id;
                  return (
                    <button key={m.id} onClick={() => doAssign(m.id)} disabled={busy === "assign"}
                      className={`text-left px-3 py-2 border rounded-sm ${active ? "border-amber-300 bg-amber-300/10" : "border-white/10 hover:border-white/40"}`}>
                      <div className="text-sm">{m.name}</div>
                      <div className="text-[10px] font-mono text-white/40 uppercase">{m.kind} · {m.status}</div>
                    </button>
                  );
                })}
                <button onClick={() => doAssign(null)} disabled={busy === "assign"}
                  className={`text-left px-3 py-2 border border-white/10 hover:border-red-400/40 rounded-sm text-red-300/80 text-xs`}>
                  ✕ Unassign
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 mb-2">Move in queue</div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => doMove("top")} disabled={busy === "move"} className={btnDef}>⇈ TOP</button>
                <button onClick={() => doMove("up")} disabled={busy === "move"} className={btnDef}>↑ UP</button>
                <button onClick={() => doMove("down")} disabled={busy === "move"} className={btnDef}>↓ DOWN</button>
                <button onClick={() => doMove("bottom")} disabled={busy === "move"} className={btnDef}>⇊ BOTTOM</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {modal === "message" && <SendUpdateModal code={code} defaultTo={o.customer_email} onClose={() => setModal(null)} onSent={() => { flash("Update sent ✓"); onChanged(); }} sendFn={sendUpdate} />}
      {modal === "tracking" && <TrackingModal o={o} code={code} onClose={() => setModal(null)} onSaved={() => { flash("Tracking saved ✓"); onChanged(); setModal(null); }} updateFn={update} />}
    </div>
  );
}

function SendUpdateModal({ code, defaultTo, onClose, onSent, sendFn }: any) {
  const [subject, setSubject] = useState(`Update on your order ${code}`);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit() {
    if (!subject.trim() || !body.trim()) return;
    setBusy(true); setErr(null);
    try { await sendFn({ data: { order_code: code, subject: subject.trim(), body: body.trim() } }); onSent(); onClose(); }
    catch (e: any) { setErr(e.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title="Send customer update">
      <div className="space-y-3">
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">To: {defaultTo}</div>
        <Labeled label="Subject"><input className={inp} value={subject} onChange={(e) => setSubject(e.target.value)} /></Labeled>
        <Labeled label="Message"><textarea rows={6} className={inp} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a professional update. Do not mention internal AI or engineering settings." /></Labeled>
        {err && <div className="text-xs text-red-400">{err}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-mono tracking-widest text-white/60">CANCEL</button>
          <button onClick={submit} disabled={busy || !subject.trim() || !body.trim()} className="bg-amber-300 text-black px-4 py-2 text-xs font-mono tracking-widest font-semibold rounded-sm disabled:opacity-40">
            {busy ? "SENDING…" : "SEND"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TrackingModal({ o, code, onClose, onSaved, updateFn }: any) {
  const [f, setF] = useState({ courier: o.courier ?? "", tracking_number: o.tracking_number ?? "", tracking_url: o.tracking_url ?? "", estimated_delivery: o.estimated_delivery ?? "" });
  const [busy, setBusy] = useState(false);
  const [markShipped, setMarkShipped] = useState(true);
  async function save() {
    setBusy(true);
    try {
      const patch: any = {
        courier: f.courier || null,
        tracking_number: f.tracking_number || null,
        tracking_url: f.tracking_url || null,
        estimated_delivery: f.estimated_delivery || null,
      };
      if (markShipped) patch.status = "shipped";
      await updateFn({ data: { order_code: code, patch } });
      onSaved();
    } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title="Add tracking information">
      <div className="grid md:grid-cols-2 gap-3">
        <Labeled label="Courier">
          <select className={inp} value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })}>
            <option value="">— Not assigned —</option>
            {COURIERS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Labeled>
        <Labeled label="Tracking number"><input className={inp} value={f.tracking_number} onChange={(e) => setF({ ...f, tracking_number: e.target.value })} /></Labeled>
        <Labeled label="Tracking URL"><input className={inp} value={f.tracking_url} onChange={(e) => setF({ ...f, tracking_url: e.target.value })} placeholder="https://…" /></Labeled>
        <Labeled label="Estimated delivery"><input type="date" className={inp} value={f.estimated_delivery} onChange={(e) => setF({ ...f, estimated_delivery: e.target.value })} /></Labeled>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-white/70">
        <input type="checkbox" checked={markShipped} onChange={(e) => setMarkShipped(e.target.checked)} />
        Mark order as SHIPPED and notify customer
      </label>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-xs font-mono tracking-widest text-white/60">CANCEL</button>
        <button onClick={save} disabled={busy} className="bg-amber-300 text-black px-4 py-2 text-xs font-mono tracking-widest font-semibold rounded-sm disabled:opacity-40">
          {busy ? "SAVING…" : "SAVE"}
        </button>
      </div>
    </Modal>
  );
}



function TabAI({ code, orderMeta }: { code: string; orderMeta: any }) {
  const list = useServerFn(panelListAnalyses);
  const analyze = useServerFn(panelAnalyzeFile);
  const override = useServerFn(panelApplyOverride);
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("");

  const meta = (orderMeta?.metadata ?? {}) as any;
  const mode: "prototype" | "durable" | "decorative" =
    meta.production_mode === "durable" || meta.production_mode === "functional" ? "durable" :
    meta.production_mode === "decorative" || meta.production_mode === "display" ? "decorative" : "prototype";

  async function refresh() {
    try { const r = await list({ data: { order_code: code } }); setRows(r as any[]); }
    catch (e: any) { setErr(e.message ?? "Failed to load analyses"); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [code]);

  async function run() {
    setBusy(true); setErr(null);
    try {
      await analyze({ data: { order_code: code, service: "3d_printing", production_mode: mode } });
      await refresh();
    } catch (e: any) { setErr(e.message ?? "Analysis failed"); }
    finally { setBusy(false); }
  }
  async function saveOverride(id: string) {
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) return;
    setBusy(true);
    try { await override({ data: { id, patch: { quote_price_eur: n, note: "Admin override from order detail" } } }); setPrice(""); await refresh(); }
    catch (e: any) { setErr(e.message ?? "Override failed"); }
    finally { setBusy(false); }
  }

  const latest = rows?.[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">AI Manufacturing Analysis</div>
          <div className="text-xs text-white/60 mt-1">Purpose: <span className="text-white capitalize">{mode}</span> · Timeline: <span className="text-white capitalize">{meta.timeline ?? "standard"}</span> · Qty: <span className="text-white">{orderMeta?.quantity ?? 1}</span></div>
        </div>
        <button onClick={run} disabled={busy} className="bg-amber-300 text-black rounded-sm px-4 py-2 text-[10px] font-mono tracking-[0.3em] font-semibold disabled:opacity-40">
          {busy ? "ANALYZING…" : latest ? "RE-RUN ANALYSIS" : "RUN AI ANALYSIS"}
        </button>
      </div>
      {err && <div className="text-xs text-red-300 border border-red-400/30 rounded p-2">{err}</div>}
      {!rows && <div className="text-xs text-white/40">Loading…</div>}
      {rows && rows.length === 0 && (
        <div className="text-xs text-white/50 border border-white/10 rounded p-4">
          No analysis yet. Click <span className="text-amber-300">Run AI Analysis</span> to generate one from the latest uploaded file.
        </div>
      )}
      {latest && (
        <>
          <AIAnalysisCard a={latest} adminView />
          <div className="border border-amber-300/20 rounded p-4 bg-amber-300/[0.02]">
            <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-300/80 mb-2">Admin Price Override</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">€</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(latest.quote_price_eur ?? "")} className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm w-32 outline-none focus:border-amber-300/60" />
              <button onClick={() => saveOverride(latest.id)} disabled={busy || !price} className="border border-amber-300/40 hover:border-amber-300 text-amber-200 rounded px-3 py-1.5 text-[10px] font-mono tracking-[0.3em] disabled:opacity-40">SAVE</button>
              <span className="text-[10px] text-white/40 ml-2">Overrides sync to the order quote_price.</span>
            </div>
          </div>
        </>
      )}
      {rows && rows.length > 1 && (
        <details className="border border-white/10 rounded p-3">
          <summary className="text-xs text-white/60 cursor-pointer">Previous analyses ({rows.length - 1})</summary>
          <div className="mt-3 space-y-3">
            {rows.slice(1).map((a) => (
              <div key={a.id} className="text-xs text-white/50 border-t border-white/5 pt-2">
                <span className="font-mono">{new Date(a.created_at).toLocaleString()}</span> · €{Number(a.quote_price_eur ?? 0).toFixed(2)} · {a.recommended_material}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TabCustomer({ o, patch }: { o: any; patch: (p: any) => void }) {
  const [f, setF] = useState({
    customer_name: o.customer_name ?? "", customer_email: o.customer_email ?? "", customer_phone: o.customer_phone ?? "",
    company: o.company ?? "", service: o.service ?? "", material: o.material ?? "", message: o.message ?? "",
    internal_notes: o.internal_notes ?? "", quote_price: o.quote_price ?? "", due_date: o.due_date ?? "",
  });
  return (
    <Card title="Customer Information">
      <div className="grid md:grid-cols-2 gap-3">
        <Labeled label="Name"><input className={inp} value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} /></Labeled>
        <Labeled label="Email"><input className={inp} value={f.customer_email} onChange={(e) => setF({ ...f, customer_email: e.target.value })} /></Labeled>
        <Labeled label="Phone"><input className={inp} value={f.customer_phone} onChange={(e) => setF({ ...f, customer_phone: e.target.value })} /></Labeled>
        <Labeled label="Company"><input className={inp} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Labeled>
        <Labeled label="Service"><input className={inp} value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} /></Labeled>
        <Labeled label="Material"><input className={inp} value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} /></Labeled>
        <Labeled label="Quote price (€)"><input className={inp} value={f.quote_price} onChange={(e) => setF({ ...f, quote_price: e.target.value })} /></Labeled>
        <Labeled label="Due date"><input type="date" className={inp} value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Labeled>
      </div>
      <div className="mt-3 grid md:grid-cols-2 gap-3">
        <Labeled label="Customer message / notes"><textarea rows={4} className={inp} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Labeled>
        <Labeled label="Internal notes (admin only)"><textarea rows={4} className={inp + " border-amber-300/20 focus:border-amber-300/60"} value={f.internal_notes} onChange={(e) => setF({ ...f, internal_notes: e.target.value })} /></Labeled>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={() => {
          const p: any = { ...f };
          p.quote_price = p.quote_price === "" ? null : Number(p.quote_price);
          if (!p.due_date) p.due_date = null;
          for (const k of ["customer_phone", "company", "service", "material", "message", "internal_notes"])
            if (p[k] === "") p[k] = null;
          patch(p);
        }} className="bg-amber-300 text-black rounded-sm px-4 py-2 text-[10px] font-mono tracking-[0.3em] font-semibold">SAVE CHANGES</button>
      </div>
    </Card>
  );
}

function TabFiles({ d, code, refresh }: any) {
  const upload = useServerFn(panelUploadFile);
  const delF = useServerFn(panelDeleteFile);
  const sign = useServerFn(panelSignFile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [vis, setVis] = useState<"customer" | "admin">("customer");
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = ""; for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      await upload({ data: { order_code: code, file_name: file.name, file_base64: btoa(bin), file_type: file.type || file.name.split(".").pop(), visibility: vis, folder: folder || undefined } });
      e.target.value = ""; await refresh();
    } finally { setBusy(false); }
  }
  async function download(path: string) { const { url } = await sign({ data: { path } }); if (url) window.open(url, "_blank"); }
  async function remove(id: string) { if (!confirm("Delete file?")) return; await delF({ data: { id, order_code: code } }); refresh(); }

  const grouped: Record<string, any[]> = {};
  for (const f of d.files) {
    const parts = f.file_path.split("/");
    const k = parts.length > 2 ? parts[1] : "(root)";
    (grouped[k] ||= []).push(f);
  }

  return (
    <Card title="Files & CAD" right={<span className="text-[10px] font-mono text-white/40">{d.files.length} FILES</span>}>
      <div className="flex flex-wrap gap-2 items-center border border-white/10 rounded-sm p-3 mb-4 bg-white/[0.02]">
        <Select value={vis} onChange={(v) => setVis(v as any)} options={[{ value: "customer", label: "Visible to customer" }, { value: "admin", label: "Internal only" }]} />
        <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder (optional)" className={inp + " w-48"} />
        <input ref={fileRef} type="file" hidden onChange={onPick} />
        <button disabled={busy} onClick={() => fileRef.current?.click()} className="bg-amber-300 text-black rounded-sm px-4 py-2 text-[10px] font-mono tracking-[0.3em] font-semibold disabled:opacity-40">{busy ? "UPLOADING…" : "+ UPLOAD"}</button>
      </div>
      {Object.keys(grouped).length === 0 && <div className="text-xs text-white/40">No files.</div>}
      {Object.entries(grouped).map(([folder, files]) => (
        <div key={folder} className="mb-4">
          <div className="text-[10px] font-mono tracking-[0.3em] text-white/40 mb-2">{folder.toUpperCase()}</div>
          <ul className="divide-y divide-white/5 border border-white/10 rounded-sm">
            {files.map((f: any) => (
              <li key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{f.file_name}
                    {f.visibility === "admin" && <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-amber-300">INTERNAL</span>}
                  </div>
                  <div className="text-[10px] text-white/40 font-mono">{(f.size_bytes / 1024).toFixed(1)} KB · {new Date(f.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => download(f.file_path)} className="text-xs text-sky-300 hover:underline">Open</button>
                  <button onClick={() => remove(f.id)} className="text-xs text-red-300 hover:underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}

function TabUpdates({ d, code, refresh }: any) {
  const addEv = useServerFn(panelAddEvent);
  const delEv = useServerFn(panelDeleteEvent);
  const [f, setF] = useState({ title: "", description: "", visibility: "customer" as "customer" | "admin", color_tag: "", occurred_at: "", event_type: "update" });

  const events = (d.events as any[]).slice().sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

  async function add() {
    if (!f.title.trim()) return;
    await addEv({ data: { order_code: code, ...f, occurred_at: f.occurred_at || undefined, color_tag: f.color_tag || null, description: f.description || null } as any });
    setF({ title: "", description: "", visibility: "customer", color_tag: "", occurred_at: "", event_type: "update" });
    refresh();
  }

  return (
    <Card title="Production Updates" right={<span className="text-[10px] font-mono text-white/40">CUSTOMER PORTAL SYNCS IN REAL-TIME</span>}>
      <div className="border border-white/10 rounded-sm p-4 mb-5 bg-white/[0.02] space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Labeled label="Title *"><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. CNC milling complete" /></Labeled>
          <Labeled label="Type">
            <select className={inp} value={f.event_type} onChange={(e) => setF({ ...f, event_type: e.target.value })}>
              {["update", "milestone", "production", "quality", "shipping", "note"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Labeled>
        </div>
        <Labeled label="Description"><textarea rows={3} className={inp} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Labeled>
        <div className="grid md:grid-cols-4 gap-3">
          <Labeled label="Date/time"><input type="datetime-local" className={inp} value={f.occurred_at} onChange={(e) => setF({ ...f, occurred_at: e.target.value })} /></Labeled>
          <Labeled label="Visibility">
            <select className={inp} value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value as any })}>
              <option value="customer">Visible to customer</option>
              <option value="admin">Internal only</option>
            </select>
          </Labeled>
          <Labeled label="Color tag">
            <select className={inp} value={f.color_tag} onChange={(e) => setF({ ...f, color_tag: e.target.value })}>
              <option value="">—</option>
              {["emerald", "sky", "amber", "rose", "violet", "slate"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Labeled>
          <div className="flex items-end">
            <button onClick={add} disabled={!f.title.trim()} className="w-full bg-amber-300 text-black rounded-sm py-2 text-[10px] font-mono tracking-[0.3em] font-semibold disabled:opacity-40">+ ADD UPDATE</button>
          </div>
        </div>
      </div>

      <ol className="space-y-3 relative pl-5 border-l border-white/10">
        {events.length === 0 && <li className="text-xs text-white/40">No updates yet.</li>}
        {events.map((ev: any) => {
          const c = ev.color_tag || (ev.visibility === "admin" ? "amber" : "emerald");
          return (
            <li key={ev.id} className="relative">
              <span className={`absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 bg-${c}-400 ring-${c}-400/20`} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{ev.title}
                    {ev.visibility === "admin" && <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-amber-300">INTERNAL</span>}
                  </div>
                  {ev.description && <div className="text-xs text-white/60 mt-0.5 whitespace-pre-wrap">{ev.description}</div>}
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mt-1">{new Date(ev.created_at).toLocaleString()} · {ev.event_type}</div>
                </div>
                <button onClick={async () => { if (confirm("Delete update?")) { await delEv({ data: { id: ev.id, order_code: code } }); refresh(); } }}
                  className="text-[10px] text-red-300/70 hover:text-red-300 font-mono">DELETE</button>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function TabTracking({ o, patch }: { o: any; patch: (p: any) => void }) {
  const [f, setF] = useState({
    courier: o.courier ?? "", tracking_number: o.tracking_number ?? "", tracking_url: o.tracking_url ?? "",
    estimated_delivery: o.estimated_delivery ?? "",
  });
  return (
    <Card title="Shipment Tracking">
      <div className="grid md:grid-cols-2 gap-3">
        <Labeled label="Courier">
          <select className={inp} value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })}>
            <option value="">— Not assigned —</option>
            {COURIERS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Labeled>
        <Labeled label="Tracking number"><input className={inp} value={f.tracking_number} onChange={(e) => setF({ ...f, tracking_number: e.target.value })} /></Labeled>
        <Labeled label="Tracking URL"><input className={inp} value={f.tracking_url} onChange={(e) => setF({ ...f, tracking_url: e.target.value })} placeholder="https://…" /></Labeled>
        <Labeled label="Estimated delivery"><input type="date" className={inp} value={f.estimated_delivery} onChange={(e) => setF({ ...f, estimated_delivery: e.target.value })} /></Labeled>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <button onClick={() => patch({ status: "shipped", courier: f.courier || null, tracking_number: f.tracking_number || null, tracking_url: f.tracking_url || null, estimated_delivery: f.estimated_delivery || null })}
            className="border border-sky-400/30 hover:border-sky-400 text-sky-300 rounded-sm px-3 py-2 text-[10px] font-mono tracking-[0.3em]">MARK DISPATCHED</button>
          <button onClick={() => patch({ status: "delivered" })}
            className="border border-emerald-400/30 hover:border-emerald-400 text-emerald-300 rounded-sm px-3 py-2 text-[10px] font-mono tracking-[0.3em]">MARK DELIVERED</button>
          <button onClick={() => patch({ courier: null, tracking_number: null, tracking_url: null, estimated_delivery: null })}
            className="border border-white/10 hover:border-white/30 text-white/60 rounded-sm px-3 py-2 text-[10px] font-mono tracking-[0.3em]">CLEAR</button>
        </div>
        <button onClick={() => patch({ courier: f.courier || null, tracking_number: f.tracking_number || null, tracking_url: f.tracking_url || null, estimated_delivery: f.estimated_delivery || null })}
          className="bg-amber-300 text-black rounded-sm px-4 py-2 text-[10px] font-mono tracking-[0.3em] font-semibold">SAVE</button>
      </div>
    </Card>
  );
}

function TabImages({ d, code, refresh }: any) {
  const upload = useServerFn(panelUploadFile);
  const sign = useServerFn(panelSignFile);
  const delF = useServerFn(panelDeleteFile);
  const ref = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const images = (d.files as any[]).filter((f) => /\.(png|jpe?g|webp|gif|heic)$/i.test(f.file_name) || f.file_type?.startsWith("image/"));

  useEffect(() => {
    (async () => {
      const need = images.filter((i) => !urls[i.file_path]);
      for (const i of need) {
        try { const { url } = await sign({ data: { path: i.file_path } }); if (url) setUrls((u) => ({ ...u, [i.file_path]: url })); } catch {}
      }
    })();
  }, [images.length]); // eslint-disable-line

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setBusy(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const buf = await file.arrayBuffer(); const bytes = new Uint8Array(buf);
        let bin = ""; for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        await upload({ data: { order_code: code, file_name: file.name, file_base64: btoa(bin), file_type: file.type, visibility: "customer", folder: "progress" } });
      }
      e.target.value = ""; await refresh();
    } finally { setBusy(false); }
  }

  return (
    <Card title="Progress Images" right={<span className="text-[10px] font-mono text-white/40">VISIBLE TO CUSTOMER</span>}>
      <div className="border border-white/10 rounded-sm p-3 mb-4 bg-white/[0.02] flex items-center gap-3">
        <input ref={ref} type="file" hidden multiple accept="image/*" onChange={onPick} />
        <button disabled={busy} onClick={() => ref.current?.click()} className="bg-amber-300 text-black rounded-sm px-4 py-2 text-[10px] font-mono tracking-[0.3em] font-semibold disabled:opacity-40">{busy ? "UPLOADING…" : "+ ADD IMAGES"}</button>
        <span className="text-[10px] font-mono text-white/40">Manufacturing · Machining · 3D Printing · QC · Packaging · Shipping</span>
      </div>
      {images.length === 0 && <div className="text-xs text-white/40">No images uploaded yet.</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {images.map((img: any) => (
          <div key={img.id} className="border border-white/10 rounded-sm overflow-hidden bg-black/40 group relative">
            {urls[img.file_path]
              ? <img src={urls[img.file_path]} alt={img.file_name} className="w-full aspect-square object-cover" />
              : <div className="w-full aspect-square animate-pulse bg-white/5" />}
            <div className="px-2 py-1.5 text-[10px] font-mono text-white/60 truncate">{img.file_name}</div>
            <button onClick={async () => { if (confirm("Delete image?")) { await delF({ data: { id: img.id, order_code: code } }); refresh(); } }}
              className="absolute top-1 right-1 bg-black/80 text-red-300 text-[10px] font-mono px-2 py-0.5 rounded opacity-0 group-hover:opacity-100">DEL</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TabComments({ d, code, refresh }: any) {
  const add = useServerFn(panelAddComment);
  const del = useServerFn(panelDeleteComment);
  const [body, setBody] = useState("");
  const [vis, setVis] = useState<"customer" | "admin">("customer");

  const items: Array<{ id: string; kind: "message" | "event"; body: string; visibility: string; from: string; created_at: string }> = [
    ...d.messages.map((m: any) => ({ id: m.id, kind: "message" as const, body: m.body, visibility: "customer", from: m.from_role, created_at: m.created_at })),
    ...(d.events as any[]).filter((e) => e.event_type === "note").map((e: any) => ({ id: e.id, kind: "event" as const, body: e.description ?? e.title, visibility: e.visibility, from: e.actor, created_at: e.created_at })),
  ].sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

  async function submit() {
    if (!body.trim()) return;
    await add({ data: { order_code: code, body: body.trim(), visibility: vis } });
    setBody(""); refresh();
  }

  return (
    <Card title="Comments">
      <div className="border border-white/10 rounded-sm p-4 mb-4 bg-white/[0.02]">
        <textarea rows={3} className={inp} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment…" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <Select value={vis} onChange={(v) => setVis(v as any)} options={[{ value: "customer", label: "Visible to customer" }, { value: "admin", label: "Internal only" }]} />
          <button onClick={submit} disabled={!body.trim()} className="bg-amber-300 text-black rounded-sm px-4 py-2 text-[10px] font-mono tracking-[0.3em] font-semibold disabled:opacity-40">+ ADD COMMENT</button>
        </div>
      </div>
      <ul className="space-y-2">
        {items.length === 0 && <li className="text-xs text-white/40">No comments yet.</li>}
        {items.map((i) => (
          <li key={i.id} className={`border rounded-sm px-4 py-3 ${i.visibility === "admin" ? "border-amber-300/30 bg-amber-300/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
            <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-white/40 mb-1">
              <span>{i.from?.toUpperCase()} · {i.visibility === "admin" ? "INTERNAL" : "VISIBLE TO CUSTOMER"}</span>
              <span>{new Date(i.created_at).toLocaleString()}
                <button onClick={async () => { if (confirm("Delete comment?")) { await del({ data: { id: i.id, kind: i.kind, order_code: code } }); refresh(); } }}
                  className="ml-3 text-red-300/60 hover:text-red-300">DELETE</button>
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{i.body}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TabStatus({ o, patch }: { o: any; patch: (p: any) => void }) {
  return (
    <Card title="Status Management" right={<span className="text-[10px] font-mono text-white/40">CUSTOMER PORTAL UPDATES IN REAL-TIME</span>}>
      <div className="grid md:grid-cols-2 gap-4">
        <Labeled label="Order status">
          <select className={inp} value={o.status} onChange={(e) => patch({ status: e.target.value })}>
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Labeled>
        <Labeled label="Priority">
          <select className={inp} value={o.priority ?? "normal"} onChange={(e) => patch({ priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Labeled>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FLOW.map((s) => (
          <button key={s} onClick={() => patch({ status: s })}
            className={`text-[10px] font-mono tracking-[0.2em] uppercase border rounded-sm px-3 py-1.5 ${o.status === s ? "border-amber-300 text-amber-300 bg-amber-300/10" : "border-white/10 hover:border-white/40 text-white/60"}`}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ============= CUSTOMERS =============
function CustomersList({ onOpen }: { onOpen: (email: string) => void }) {
  const list = useServerFn(panelListCustomers);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(async () => setRows((await list({ data: { q } })) as any), 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader kicker="CUSTOMERS" title="All Customers" subtitle={`${rows.length} unique customers`} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, company…" className={inp + " max-w-md"} />
      <div className="border border-white/10 rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-white/[0.03] text-[10px] font-mono tracking-[0.2em] text-white/40">
            <tr><Th>Name</Th><Th>Email</Th><Th>Company</Th><Th>Orders</Th><Th>Spend</Th><Th>Last order</Th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.email} onClick={() => onOpen(c.email)} className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer">
                <Td>{c.name ?? "—"}</Td>
                <Td className="font-mono text-xs">{c.email}</Td>
                <Td className="text-white/70">{c.company ?? "—"}</Td>
                <Td className="font-mono">{c.orders}</Td>
                <Td className="font-mono">€{c.spend.toFixed(0)}</Td>
                <Td className="text-[11px] font-mono text-white/50">{new Date(c.last).toLocaleDateString("en-GB")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerDetail({ email, onBack, onOpenOrder }: { email: string; onBack: () => void; onOpenOrder: (c: string) => void }) {
  const get = useServerFn(panelGetCustomer);
  const [d, setD] = useState<any | null>(null);
  useEffect(() => { get({ data: { email } }).then(setD); }, [email]); // eslint-disable-line
  if (!d) return <div className="p-10 text-xs text-white/40 font-mono">LOADING…</div>;
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <button onClick={onBack} className="text-[10px] font-mono tracking-[0.3em] text-white/40 hover:text-white">← ALL CUSTOMERS</button>
      <PageHeader kicker="CUSTOMER" title={email} subtitle={`${d.orders.length} orders on file`} />
      <Card title="All orders">
        <ul className="divide-y divide-white/5">
          {d.orders.map((o: any) => (
            <li key={o.id}>
              <button onClick={() => onOpenOrder(o.order_code)} className="w-full grid grid-cols-[110px_1fr_auto_auto] items-center gap-3 py-3 hover:bg-white/[0.03] px-2 -mx-2 text-left">
                <span className="font-mono text-sm">{o.order_code}</span>
                <span className="truncate text-sm text-white/70">{o.service ?? "—"}</span>
                <StatusPill status={o.status} />
                <span className="font-mono text-xs text-white/60">{o.quote_price ? `€${Number(o.quote_price).toFixed(0)}` : "—"}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ============= TRACKING (cross-order) =============
function TrackingList({ onOpen }: { onOpen: (c: string) => any }) {
  const list = useServerFn(panelListOrders);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { list({ data: { status: "shipped" } as any }).then((r) => setRows(r as any)); }, []); // eslint-disable-line
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader kicker="LOGISTICS" title="Active Shipments" subtitle={`${rows.length} in transit`} />
      <div className="border border-white/10 rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-white/[0.03] text-[10px] font-mono tracking-[0.2em] text-white/40">
            <tr><Th>Order</Th><Th>Customer</Th><Th>Courier</Th><Th>Tracking</Th><Th>Created</Th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-white/40">No active shipments.</td></tr>}
            {rows.map((o) => (
              <tr key={o.id} onClick={() => onOpen(o.order_code)} className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer">
                <Td className="font-mono">{o.order_code}</Td>
                <Td>{o.customer_name}</Td>
                <Td>{o.courier ?? "—"}</Td>
                <Td className="font-mono text-xs">{o.tracking_number ?? "—"}</Td>
                <Td className="text-[11px] font-mono text-white/50">{new Date(o.created_at).toLocaleDateString("en-GB")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============= UPLOADS =============
function UploadsList({ onOpenOrder }: { onOpenOrder: (c: string) => void }) {
  const list = useServerFn(panelListOrders);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { list({ data: {} as any }).then((r) => setRows(r as any)); }, []); // eslint-disable-line
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader kicker="FILE MANAGEMENT" title="Uploads" subtitle="Open an order to view, upload or organise files." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((o) => (
          <button key={o.id} onClick={() => onOpenOrder(o.order_code)} className="text-left border border-white/10 hover:border-white/30 rounded-sm p-4 bg-white/[0.02]">
            <div className="font-mono text-sm">{o.order_code}</div>
            <div className="text-xs text-white/60 truncate">{o.customer_name}</div>
            <div className="text-[10px] font-mono text-white/40 mt-1">Open to manage files →</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============= NOTIFICATIONS =============
function NotificationsPanel() {
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader kicker="ALERTS" title="Notifications" subtitle="Live admin notifications" />
      <Card title="Notification rules">
        <ul className="text-sm space-y-2 text-white/70">
          <li>• New quote received → Discord + email (INFO@TOREO.GR)</li>
          <li>• Customer uploads files → email</li>
          <li>• Customer sends message → email</li>
          <li>• Payment received → email + status auto-advance</li>
          <li>• Order approved → email</li>
        </ul>
        <div className="mt-4 text-[10px] font-mono text-white/40">Webhook: DISCORD_WEBHOOK_URL · Email: INFO@TOREO.GR</div>
      </Card>
    </div>
  );
}

// ============= SETTINGS =============
function SettingsPanel() {
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader kicker="CONFIGURATION" title="Settings" subtitle="Company, email and integrations" />
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Company Information">
          <Row k="Legal name" v="TOREO" />
          <Row k="Email" v="INFO@TOREO.GR" />
          <Row k="Phone" v="+30 231 504 6000" />
          <Row k="Address" v="Thessaloniki, Greece" />
          <Row k="Business hours" v="Mon–Fri · 09:00 – 18:00 EET" />
        </Card>
        <Card title="Email (SMTP / Resend)">
          <Row k="Provider" v="Resend via Lovable gateway" />
          <Row k="From" v="TOREO Notifications" />
          <Row k="Reply-to" v="INFO@TOREO.GR" />
          <Row k="Status" v={<span className="text-emerald-300">CONFIGURED</span>} />
        </Card>
        <Card title="Courier Integrations">
          {COURIERS.map((c) => <Row key={c} k={c} v="Manual entry" />)}
        </Card>
        <Card title="Default Order Status">
          <Row k="New submission" v={STATUS_LABEL.quote_received} />
          <Row k="Manual order" v={STATUS_LABEL.quote_received} />
        </Card>
      </div>
      <div className="text-[10px] font-mono text-white/40">Branding (logo, theme) is managed in the design system.</div>
    </div>
  );
}

// ============= USERS =============
function UsersPanel() {
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader kicker="ACCESS CONTROL" title="Admin Users" subtitle="Role-based permissions" />
      <Card title="Active session">
        <Row k="Username" v="admin" />
        <Row k="Role" v="Super Admin" />
        <Row k="Session expires" v="After 8 hours inactivity" />
      </Card>
      <Card title="Roles & permissions">
        <table className="w-full text-sm">
          <thead className="text-[10px] font-mono tracking-[0.2em] text-white/40">
            <tr><Th>Role</Th><Th>Orders</Th><Th>Customers</Th><Th>Settings</Th><Th>Logs</Th></tr>
          </thead>
          <tbody>
            {[
              ["Super Admin", "Full", "Full", "Full", "Full"],
              ["Manager", "Full", "Full", "View", "View"],
              ["Production", "Edit status/files", "View", "—", "—"],
              ["Sales", "Quote/edit", "Full", "—", "—"],
              ["Viewer", "View", "View", "—", "—"],
            ].map((r) => (
              <tr key={r[0]} className="border-t border-white/5"><Td>{r[0]}</Td><Td>{r[1]}</Td><Td>{r[2]}</Td><Td>{r[3]}</Td><Td>{r[4]}</Td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="text-[10px] font-mono text-white/40">Additional admins are provisioned via secure credentials by the Super Admin.</div>
    </div>
  );
}

// ============= LOGS =============
function LogsPanel() {
  const list = useServerFn(panelListLogs);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(async () => setRows((await list({ data: { q, limit: 300 } })) as any), 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader kicker="AUDIT" title="Activity Logs" subtitle={`${rows.length} most-recent admin actions`} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action or target…" className={inp + " max-w-md"} />
      <div className="border border-white/10 rounded-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-white/[0.03] text-[10px] font-mono tracking-[0.2em] text-white/40">
            <tr><Th>User</Th><Th>Action</Th><Th>Target</Th><Th>IP</Th><Th>Date / Time</Th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-white/40">No log entries.</td></tr>}
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <Td className="font-mono">{l.actor}</Td>
                <Td><span className="font-mono text-xs text-amber-300/80">{l.action}</span></Td>
                <Td className="font-mono text-xs">{l.target_id ?? "—"}</Td>
                <Td className="font-mono text-xs text-white/50">{l.ip ?? "—"}</Td>
                <Td className="text-[11px] font-mono text-white/50">{new Date(l.created_at).toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============= PRIMITIVES =============
const inp = "w-full bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-sm placeholder:text-white/30 focus:border-white/40 outline-none";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-xs">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Th({ children }: any) { return <th className="px-4 py-2.5 text-left font-normal">{children}</th>; }
function Td({ children, className = "" }: any) { return <td className={`px-4 py-2.5 ${className}`}>{children}</td>; }

function PageHeader({ kicker, title, subtitle, right }: { kicker: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-3 border-b border-white/10 pb-4">
      <div>
        <div className="text-[10px] font-mono tracking-[0.4em] text-amber-300/70">{kicker}</div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">{title}</h1>
        {subtitle && <div className="text-xs text-white/50 mt-1">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
function Card({ title, right, className = "", children }: { title?: string; right?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`border border-white/10 rounded-sm bg-[#0f131a] p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/50 uppercase">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
function Kpi({ label, value, accent, wide }: { label: string; value: any; accent?: "amber" | "emerald" | "sky"; wide?: boolean }) {
  const color = accent === "amber" ? "text-amber-300" : accent === "emerald" ? "text-emerald-300" : accent === "sky" ? "text-sky-300" : "text-white";
  return (
    <div className={`border border-white/10 rounded-sm bg-[#0f131a] p-4 ${wide ? "md:col-span-1" : ""}`}>
      <div className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">{label}</div>
      <div className={`mt-1.5 text-3xl font-semibold font-mono ${color}`}>{value}</div>
    </div>
  );
}
function StatusPill({ status }: { status: string }) {
  const c: Record<string, string> = {
    quote_received: "bg-white/10 text-white",
    engineering_review: "bg-sky-500/15 text-sky-200",
    quote_sent: "bg-violet-500/15 text-violet-200",
    awaiting_approval: "bg-amber-500/15 text-amber-200",
    payment_received: "bg-emerald-500/15 text-emerald-200",
    production: "bg-sky-500/15 text-sky-200",
    quality_inspection: "bg-amber-500/15 text-amber-200",
    ready_for_shipping: "bg-amber-500/15 text-amber-200",
    shipped: "bg-sky-500/15 text-sky-200",
    delivered: "bg-emerald-500/15 text-emerald-200",
    cancelled: "bg-red-500/15 text-red-200",
  };
  return <span className={`text-[10px] font-mono tracking-[0.2em] uppercase rounded-sm px-2 py-0.5 ${c[status] ?? "bg-white/10 text-white"}`}>{STATUS_LABEL[status] ?? status}</span>;
}
function PriorityPill({ p }: { p?: string }) {
  if (!p || p === "normal") return <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/40">NORMAL</span>;
  const c = p === "urgent" ? "bg-red-500/15 text-red-200" : p === "high" ? "bg-amber-500/15 text-amber-200" : "bg-white/5 text-white/60";
  return <span className={`text-[10px] font-mono tracking-[0.2em] uppercase rounded-sm px-2 py-0.5 ${c}`}>{p}</span>;
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm"><span className="text-white/50 text-xs">{k}</span><span className="font-mono text-xs">{v}</span></div>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f131a] border border-white/10 rounded-sm max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
function Skeleton() { return <div className="h-40 animate-pulse bg-white/[0.03] rounded-sm" />; }
