// TOREO AI Factory OS — Parts 4.2A + 4.2B: batching, overnight optimizer,
// refined priority scoring, and live analytics.
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

type AdminSession = { authed?: boolean; ts?: number };
function sessionConfig() {
  const raw = process.env.ADMIN_PASSWORD ?? "";
  const password = (raw + "::skg3d-admin-session-pad-do-not-share::").padEnd(64, "x");
  return { password, name: "skg3d_admin", maxAge: 60 * 60 * 8, cookie: { httpOnly: true, sameSite: "lax" as const, path: "/" } };
}
async function requireAdminCookie() {
  const s = await useSession<AdminSession>(sessionConfig());
  if (!s.data.authed) throw new Error("Unauthorized");
  return true;
}

// ---------- 4.2A: batching by material/machine kind ----------
// Groups queued jobs by (material_code, machine kind) to suggest print batches.

export const panelBatchSuggest = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: jobs } = await supabaseAdmin
    .from("production_jobs" as any)
    .select("id, material_code, estimated_hours, overnight_ok, state, orders!inner(order_code, service, priority, due_date)")
    .in("state", ["queued", "ready"]);
  const groups = new Map<string, any>();
  for (const j of (jobs ?? []) as any[]) {
    const svc = (j.orders?.service ?? "generic").toLowerCase();
    const key = `${j.material_code ?? "unknown"}::${svc}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        material_code: j.material_code ?? "unknown",
        service: svc,
        jobs: [],
        total_hours: 0,
        earliest_due: null as string | null,
      });
    }
    const g = groups.get(key);
    g.jobs.push({ id: j.id, order_code: j.orders?.order_code, priority: j.orders?.priority, due_date: j.orders?.due_date, hours: Number(j.estimated_hours ?? 0) });
    g.total_hours += Number(j.estimated_hours ?? 0);
    if (j.orders?.due_date && (!g.earliest_due || new Date(j.orders.due_date) < new Date(g.earliest_due))) {
      g.earliest_due = j.orders.due_date;
    }
  }
  const suggestions = Array.from(groups.values())
    .filter((g) => g.jobs.length >= 2)
    .sort((a, b) => b.jobs.length - a.jobs.length);
  return { suggestions };
});

// ---------- 4.2A: overnight optimizer ----------
// Flags long jobs (>= 6h) as overnight-eligible and returns them.
// Also updates state via panelUpdateJob-style flag toggle.

export const panelOvernightOptimize = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: jobs } = await supabaseAdmin
    .from("production_jobs" as any)
    .select("id, estimated_hours, overnight_ok, state")
    .in("state", ["queued", "ready"]);
  const candidates = (jobs ?? []).filter((j: any) => Number(j.estimated_hours ?? 0) >= 6 && !j.overnight_ok);
  let updated = 0;
  for (const j of candidates as any[]) {
    const { error } = await supabaseAdmin.from("production_jobs" as any).update({ overnight_ok: true }).eq("id", j.id);
    if (!error) updated++;
  }
  return { candidates_found: candidates.length, updated };
});

// ---------- 4.2B: live analytics ----------

export const panelLiveAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();

  const [{ data: orders30 }, { data: orders7 }, { data: openOrders }, { data: jobs }, { data: machines }, { data: materials }, { data: analyses }] = await Promise.all([
    supabaseAdmin.from("orders").select("id, status, quote_price, created_at").gte("created_at", since30),
    supabaseAdmin.from("orders").select("id, quote_price, created_at").gte("created_at", since7),
    supabaseAdmin.from("orders").select("id, status, created_at, order_code, customer_name, quote_price").not("status", "in", "(delivered,cancelled)").order("created_at", { ascending: false }).limit(50),
    supabaseAdmin.from("production_jobs" as any).select("id, state, estimated_hours, planned_start, planned_finish, machine_id, actual_start, actual_finish"),
    supabaseAdmin.from("machines" as any).select("id, name, status, active, kind"),
    supabaseAdmin.from("materials" as any).select("id, name, code, stock_kg"),
    supabaseAdmin.from("project_analyses" as any).select("id, printability_score, quote_price_eur, estimated_cost_eur, created_at").gte("created_at", since30),
  ]);

  const revenue7 = (orders7 ?? []).reduce((s: number, o: any) => s + Number(o.quote_price ?? 0), 0);
  const revenue30 = (orders30 ?? []).reduce((s: number, o: any) => s + Number(o.quote_price ?? 0), 0);

  const statusBreakdown: Record<string, number> = {};
  for (const o of (orders30 ?? []) as any[]) {
    statusBreakdown[o.status] = (statusBreakdown[o.status] ?? 0) + 1;
  }

  const jobsByState: Record<string, number> = {};
  for (const j of (jobs ?? []) as any[]) {
    jobsByState[j.state] = (jobsByState[j.state] ?? 0) + 1;
  }

  const openHours = (jobs ?? [])
    .filter((j: any) => ["queued", "ready", "running", "paused"].includes(j.state))
    .reduce((s: number, j: any) => s + Number(j.estimated_hours ?? 0), 0);

  const activeMachines = (machines ?? []).filter((m: any) => m.active && m.status !== "offline");
  const runningJobs = (jobs ?? []).filter((j: any) => j.state === "running");
  const utilization = activeMachines.length > 0 ? runningJobs.length / activeMachines.length : 0;

  const lowStock = (materials ?? []).filter((m: any) => Number(m.stock_kg ?? 0) < 1.0);

  const avgPrintability = (analyses ?? []).length > 0
    ? (analyses ?? []).reduce((s: number, a: any) => s + Number(a.printability_score ?? 0), 0) / (analyses ?? []).length
    : 0;
  const avgMargin = (analyses ?? []).length > 0
    ? (analyses ?? []).reduce((s: number, a: any) => {
        const price = Number(a.quote_price_eur ?? 0);
        const cost = Number(a.estimated_cost_eur ?? 0);
        return s + (price > 0 ? (price - cost) / price : 0);
      }, 0) / (analyses ?? []).length
    : 0;

  // Machine load per active machine
  const loadByMachine = new Map<string, number>();
  for (const j of (jobs ?? []) as any[]) {
    if (!j.machine_id) continue;
    if (!["queued", "ready", "running", "paused"].includes(j.state)) continue;
    loadByMachine.set(j.machine_id, (loadByMachine.get(j.machine_id) ?? 0) + Number(j.estimated_hours ?? 0));
  }
  const machineLoad = (machines ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    kind: m.kind,
    status: m.status,
    active: m.active,
    load_hours: Math.round((loadByMachine.get(m.id) ?? 0) * 10) / 10,
  }));

  return {
    revenue: {
      last_7d: Math.round(revenue7 * 100) / 100,
      last_30d: Math.round(revenue30 * 100) / 100,
      orders_7d: (orders7 ?? []).length,
      orders_30d: (orders30 ?? []).length,
    },
    orders: {
      open: (openOrders ?? []).length,
      status_breakdown: statusBreakdown,
      recent_open: openOrders ?? [],
    },
    production: {
      jobs_by_state: jobsByState,
      open_hours: Math.round(openHours * 10) / 10,
      running: runningJobs.length,
      utilization_pct: Math.round(utilization * 100),
      machines: machineLoad,
    },
    quality: {
      avg_printability: Math.round(avgPrintability * 10) / 10,
      avg_margin_pct: Math.round(avgMargin * 1000) / 10,
      analyses_30d: (analyses ?? []).length,
    },
    stock: {
      low: lowStock.map((m: any) => ({ name: m.name, code: m.code, stock_kg: Number(m.stock_kg ?? 0) })),
    },
    updated_at: new Date().toISOString(),
  };
});
