// TOREO AI Factory OS — Smart Factory Scheduler (Part 4.1)
// Greedy load-balanced scheduler across active machines.
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

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

const WORK_START_H = 8.5; // 08:30
const WORK_END_H = 16;    // 16:00
// Daily factory-wide maintenance window: 12:00 → 12:05. Every job planned
// through the scheduler skips past this window so no printer is scheduled
// during the routine daily service slot.
const DAILY_MAINT_START_MIN = 12 * 60;      // 12:00
const DAILY_MAINT_END_MIN = 12 * 60 + 5;    // 12:05

function skipDailyMaintenance(d: Date): Date {
  const mins = d.getHours() * 60 + d.getMinutes();
  if (mins >= DAILY_MAINT_START_MIN && mins < DAILY_MAINT_END_MIN) {
    const out = new Date(d);
    out.setHours(12, 5, 0, 0);
    return out;
  }
  return d;
}

function ceilToWorkingWindow(d: Date, allowOvernight: boolean): Date {
  let out = new Date(d);
  if (!allowOvernight) {
    const h = out.getHours() + out.getMinutes() / 60;
    if (h < WORK_START_H) {
      out.setHours(8, 30, 0, 0);
    } else if (h >= WORK_END_H) {
      out.setDate(out.getDate() + 1);
      out.setHours(8, 30, 0, 0);
    }
  }
  return skipDailyMaintenance(out);
}


// -------- Queue / listing --------

export const panelListQueue = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: jobs }, { data: machines }, { data: blocks }] = await Promise.all([
    supabaseAdmin
      .from("production_jobs" as any)
      .select("*, orders!inner(order_code, customer_name, service, priority, due_date, status), machines(name, kind)")
      .order("planned_start", { ascending: true, nullsFirst: false }),
    supabaseAdmin.from("machines" as any).select("*").eq("active", true).order("name"),
    supabaseAdmin.from("machine_calendar_blocks" as any).select("*").gte("ends_at", new Date().toISOString()),
  ]);
  return { jobs: jobs ?? [], machines: machines ?? [], blocks: blocks ?? [] };
});

// -------- Recompute schedule --------
// Greedy: sort candidates by priority score DESC, place each on the machine with
// the earliest available finish time. Respects existing blocks and running jobs.

export const panelRecomputeSchedule = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: machines }, { data: blocks }, { data: openJobs }] = await Promise.all([
    supabaseAdmin.from("machines" as any).select("*").eq("active", true).neq("status", "offline"),
    supabaseAdmin.from("machine_calendar_blocks" as any).select("*").gte("ends_at", new Date().toISOString()),
    supabaseAdmin
      .from("production_jobs" as any)
      .select("*, orders!inner(id, priority, due_date, quote_price, status, service, material)")
      .in("state", ["queued", "ready", "running", "paused"]),
  ]);

  const machineList = (machines ?? []) as any[];
  const blockList = (blocks ?? []) as any[];
  const jobs = (openJobs ?? []) as any[];

  // Running/paused jobs are pinned to their machine.
  const pinned = jobs.filter((j) => ["running", "paused"].includes(j.state));
  const movable = jobs.filter((j) => ["queued", "ready"].includes(j.state));

  // Priority score: due_date urgency + priority weight + price weight.
  const now = Date.now();
  const priorityWeight: Record<string, number> = { urgent: 40, high: 20, normal: 0, low: -10 };
  movable.forEach((j) => {
    const o = j.orders as any;
    const dueMs = o?.due_date ? new Date(o.due_date).getTime() : now + 14 * 864e5;
    const urgencyDays = Math.max(0, (dueMs - now) / 864e5);
    const urgencyScore = Math.max(0, 30 - urgencyDays); // sooner = higher
    const priScore = priorityWeight[o?.priority ?? "normal"] ?? 0;
    const priceScore = Math.min(20, Number(o?.quote_price ?? 0) / 50);
    j._score = urgencyScore + priScore + priceScore;
  });
  movable.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));

  // Per-machine cursor of earliest free time.
  const cursor = new Map<string, Date>();
  for (const m of machineList) {
    let start = new Date();
    // Advance past any pinned or blocking window on this machine.
    const pins = pinned.filter((j) => j.machine_id === m.id && j.planned_finish);
    for (const p of pins) {
      const pf = new Date(p.planned_finish);
      if (pf > start) start = pf;
    }
    const bs = blockList.filter((b) => b.machine_id === m.id);
    for (const b of bs) {
      const bs2 = new Date(b.starts_at);
      const be = new Date(b.ends_at);
      if (be > start && bs2 <= start) start = be;
    }
    cursor.set(m.id, start);
  }

  const updates: Array<{ id: string; machine_id: string | null; planned_start: string | null; planned_finish: string | null; queue_position: number | null; priority_score: number; state: "ready" }> = [];

  let pos = 1;
  for (const job of movable) {
    const hours = Number(job.estimated_hours ?? 4);
    const overnight = !!job.overnight_ok;

    // Pick machine with earliest possible finish for a compatible kind.
    let best: { id: string; start: Date; finish: Date } | null = null;
    for (const m of machineList) {
      // Compatibility: normalize kind + match by service family.
      const svc = (job.orders?.service ?? "").toLowerCase();
      const kind = (m.kind ?? "").toString().trim().toLowerCase();
      const is3d = ["printer", "fdm", "sla", "sls", "3d", "3d_printing", "resin"].some(k => kind.includes(k)) || kind === "stratza";
      const isCnc = kind.includes("cnc") || kind.includes("mill") || kind.includes("lathe");
      const isLaser = kind.includes("laser");
      const isWeld = kind.includes("weld") || kind.includes("mig") || kind.includes("tig");
      const compatible =
        !svc ||
        (svc.includes("3d") && is3d) ||
        (svc.includes("cnc") && isCnc) ||
        (svc.includes("laser") && isLaser) ||
        (svc.includes("weld") && isWeld);
      if (!compatible) continue;

      const c = cursor.get(m.id)!;
      const start = ceilToWorkingWindow(c, overnight);
      const finish = new Date(start.getTime() + hours * 3600_000);
      if (!best || finish < best.finish) best = { id: m.id, start, finish };
    }

    if (!best) {
      updates.push({ id: job.id, machine_id: null, planned_start: null, planned_finish: null, queue_position: pos++, priority_score: job._score ?? 0, state: "ready" });
      continue;
    }
    cursor.set(best.id, best.finish);
    updates.push({
      id: job.id,
      machine_id: best.id,
      planned_start: best.start.toISOString(),
      planned_finish: best.finish.toISOString(),
      queue_position: pos++,
      priority_score: Math.round((job._score ?? 0) * 100) / 100,
      state: "ready",
    });
  }

  // Persist updates.
  for (const u of updates) {
    await supabaseAdmin.from("production_jobs" as any).update(u).eq("id", u.id);
  }

  return { scheduled: updates.length, machines: machineList.length };
});

// -------- Create job from order (uses latest analysis for estimate) --------

export const panelCreateJobForOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string().min(1), overnight_ok: z.boolean().optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id, order_code, service, material").eq("order_code", data.order_code).single();
    if (!order) throw new Error("Order not found");
    const { data: existing } = await supabaseAdmin.from("production_jobs" as any).select("id").eq("order_id", order.id).limit(1);
    if (existing && existing.length) return { id: (existing[0] as any).id, existed: true };
    const { data: analyses } = await supabaseAdmin
      .from("project_analyses" as any)
      .select("id, estimated_print_hours, recommended_material")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const a = (analyses ?? [])[0] as any;
    const { data: row, error } = await supabaseAdmin
      .from("production_jobs" as any)
      .insert({
        order_id: order.id,
        analysis_id: a?.id ?? null,
        estimated_hours: a?.estimated_print_hours ?? 4,
        material_code: a?.recommended_material ?? order.material ?? null,
        overnight_ok: !!data.overnight_ok,
        state: "queued",
      })
      .select("*")
      .single();
    if (error) throw error;
    return { id: (row as any).id, existed: false };
  });

// -------- Update job (state / manual reorder / notes / machine) --------

export const panelUpdateJob = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z
          .object({
            state: z.enum(["queued", "ready", "running", "paused", "blocked", "done", "cancelled"]).optional(),
            machine_id: z.string().uuid().nullable().optional(),
            queue_position: z.number().int().optional(),
            notes: z.string().max(2000).optional(),
            overnight_ok: z.boolean().optional(),
            estimated_hours: z.number().nonnegative().optional(),
            risk: z.enum(["low", "medium", "high"]).optional(),
          })
          .partial(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { ...data.patch };
    if (patch.state === "running") patch.actual_start = new Date().toISOString();
    if (patch.state === "done" || patch.state === "cancelled") patch.actual_finish = new Date().toISOString();
    const { data: row, error } = await supabaseAdmin.from("production_jobs" as any).update(patch).eq("id", data.id).select("*").single();
    if (error) throw error;
    return row;
  });

export const panelDeleteJob = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("production_jobs" as any).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// -------- Maintenance blocks --------

export const panelAddMaintenance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        machine_id: z.string().uuid(),
        starts_at: z.string(),
        ends_at: z.string(),
        kind: z.string().max(40).default("maintenance"),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("machine_calendar_blocks" as any).insert(data as any).select("*").single();
    if (error) throw error;
    return row;
  });

export const panelDeleteMaintenance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminCookie();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("machine_calendar_blocks" as any).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// -------- Factory capacity summary --------

export const panelFactoryCapacity = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminCookie();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: machines }, { data: jobs }] = await Promise.all([
    supabaseAdmin.from("machines" as any).select("id, name, status, active"),
    supabaseAdmin.from("production_jobs" as any).select("estimated_hours, state, planned_start, planned_finish").in("state", ["queued", "ready", "running", "paused"]),
  ]);
  const active = (machines ?? []).filter((m: any) => m.active && m.status !== "offline").length;
  const backlogHours = (jobs ?? []).reduce((s: number, j: any) => s + Number(j.estimated_hours ?? 0), 0);
  const dailyCapacity = active * 7.5; // working hours
  return {
    active_machines: active,
    total_machines: (machines ?? []).length,
    backlog_hours: Math.round(backlogHours * 10) / 10,
    daily_capacity_hours: dailyCapacity,
    backlog_days: dailyCapacity > 0 ? Math.round((backlogHours / dailyCapacity) * 10) / 10 : null,
    open_jobs: (jobs ?? []).length,
  };
});
