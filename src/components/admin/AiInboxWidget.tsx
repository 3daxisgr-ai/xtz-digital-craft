// Dashboard panel: request/AI/email counters + duplicate review queue.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiInboxStats, aiListDuplicates, aiResolveDuplicate } from "@/lib/api/ai-email.functions";

const box = "border border-white/10 bg-[#0f131a] rounded-sm";
const label = "text-[10px] font-mono tracking-[0.3em] uppercase text-white/40";

export function AiInboxWidget() {
  const statsFn = useServerFn(aiInboxStats);
  const listFn = useServerFn(aiListDuplicates);
  const resolveFn = useServerFn(aiResolveDuplicate);

  const [stats, setStats] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const [s, l] = await Promise.all([statsFn(), listFn()]);
      setStats(s); setRows(l.rows);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  const cells: [string, number, string][] = stats
    ? [
        ["New requests", stats.newRequests, "text-white"],
        ["Possible duplicates", stats.possibleDuplicates, "text-amber-300"],
        ["Blocked duplicates", stats.skippedDuplicates, "text-white/70"],
        ["In engineering", stats.readyForQuote, "text-sky-300"],
        ["Waiting customer", stats.waitingCustomer, "text-fuchsia-300"],
        ["Failed emails", stats.failedEmails, stats.failedEmails ? "text-red-400" : "text-white/70"],
      ]
    : [];

  return (
    <div className={`${box} p-5 space-y-4`}>
      <div className="flex items-center justify-between">
        <div className={label}>Requests · AI · Email</div>
        {stats?.ai && (
          <div className="text-[10px] font-mono text-white/30">
            {stats.ai.enabled ? stats.ai.model : "AI DISABLED"} · {stats.ai.today} TODAY / {stats.ai.month} MONTH
          </div>
        )}
      </div>
      {err && <div className="text-xs text-red-400 font-mono">{err}</div>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cells.map(([k, v, tone]) => (
          <div key={k} className="border border-white/10 rounded-sm px-3 py-3">
            <div className={`text-2xl font-semibold ${tone}`}>{v}</div>
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/35 mt-1">{k}</div>
          </div>
        ))}
      </div>

      <div>
        <div className={`${label} mb-2`}>Duplicate review queue</div>
        {rows.length === 0 ? (
          <div className="text-xs text-white/30">No flagged requests.</div>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 12).map((r) => (
              <div key={r.id} className="border border-white/10 rounded-sm px-3 py-2 text-xs flex flex-wrap gap-2 items-center">
                <span className="font-mono text-amber-300/90 uppercase text-[10px]">{r.duplicate_class}</span>
                <span className="text-white/40 font-mono text-[10px]">{Math.round((r.duplicate_confidence ?? 0) * 100) / 1 > 1 ? r.duplicate_confidence : Math.round((r.duplicate_confidence ?? 0) * 100)}%</span>
                <span className="text-white/80">{r.sender_email}</span>
                <span className="text-white/40 truncate max-w-[18rem]">{r.subject_raw ?? "—"}</span>
                {r.matched_order_code && <span className="font-mono text-[10px] text-sky-300">→ {r.matched_order_code}</span>}
                <span className="text-white/25 font-mono text-[10px]">{r.review_state}</span>
                {r.review_state === "pending" && (
                  <span className="ml-auto flex gap-2">
                    {(["keep_new", "confirm_duplicate", "ignore"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={async () => { await resolveFn({ data: { id: r.id, action: a } }); load(); }}
                        className="border border-white/15 hover:border-white/40 rounded-sm px-2 py-1 text-[10px] font-mono tracking-[0.2em] uppercase"
                      >
                        {a === "keep_new" ? "Keep" : a === "confirm_duplicate" ? "Duplicate" : "Ignore"}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
