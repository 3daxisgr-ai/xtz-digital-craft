import { STATUS_FLOW, STATUS_LABEL } from "@/lib/api/orders.functions";

export const VISIBLE_STATUSES = STATUS_FLOW.filter((s) => s !== "cancelled");

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "delivered"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : status === "shipped"
      ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
      : status === "production"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : status === "cancelled"
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : "bg-white/5 text-white/70 border-white/15";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] border ${color}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function StatusProgress({ status }: { status: string }) {
  const idx = VISIBLE_STATUSES.indexOf(status as any);
  const pct = idx < 0 ? 0 : ((idx + 1) / VISIBLE_STATUSES.length) * 100;
  return (
    <div className="space-y-3">
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40">
        {VISIBLE_STATUSES.map((s, i) => (
          <div
            key={s}
            className={`text-center truncate ${
              i <= idx ? "text-white/80" : ""
            }`}
            title={STATUS_LABEL[s]}
          >
            {STATUS_LABEL[s].split(" ")[0]}
          </div>
        ))}
      </div>
    </div>
  );
}
