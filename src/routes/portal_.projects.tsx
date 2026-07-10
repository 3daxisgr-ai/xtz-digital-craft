import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listMyOrders } from "@/lib/api/orders.functions";
import { archiveProject, renameProject, repeatOrder } from "@/lib/api/features.functions";
import { StatusBadge } from "@/components/portal/StatusProgress";

export const Route = createFileRoute("/portal_/projects")({
  ssr: false,
  head: () => ({ meta: [{ title: "Project Library — TOREO" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ProjectLibraryPage,
});

function ProjectLibraryPage() {
  const navigate = useNavigate();
  const listOrders = useServerFn(listMyOrders);
  const rename = useServerFn(renameProject);
  const archive = useServerFn(archiveProject);
  const repeat = useServerFn(repeatOrder);
  const [orders, setOrders] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { navigate({ to: "/auth" }); return; }
      const rows = await listOrders({} as any);
      setOrders(rows as any[]);
    })();
  }, []); // eslint-disable-line

  const visible = orders.filter((o) => showArchived ? true : !((o as any).archived));

  async function onRepeat(code: string) {
    setBusy(code);
    try {
      const r = await repeat({ data: { order_code: code } });
      navigate({ to: "/portal/$orderCode", params: { orderCode: r.order_code } });
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <header className="border-b border-white/10 px-4 md:px-8 py-4 sticky top-0 bg-[#070708]/90 backdrop-blur z-10 flex items-center justify-between">
        <Link to="/portal" className="font-mono text-[10px] tracking-[0.3em] text-white/60 hover:text-white uppercase">← Portal</Link>
        <div className="text-xs text-white/40">Project Library</div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">Your Files & History</div>
            <h1 className="text-3xl font-semibold mt-2">Project Library</h1>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/60">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        </div>

        <div className="space-y-3">
          {visible.length === 0 && <div className="text-white/40 text-sm">No projects yet.</div>}
          {visible.map((o) => (
            <div key={o.id} className="border border-white/10 bg-white/[0.02] rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-mono text-sm">{o.order_code}</div>
                  <div className="text-xs text-white/50">
                    {o.service ?? "—"} · {o.material ?? "—"} · {new Date(o.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {o.quote_price != null && <span className="font-mono text-sm">€{Number(o.quote_price).toFixed(2)}</span>}
                  <StatusBadge status={o.status} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/portal/$orderCode" params={{ orderCode: o.order_code }}
                  className="text-xs px-3 py-1.5 border border-white/20 hover:border-white/40 rounded-sm">Open</Link>
                <button disabled={busy === o.order_code} onClick={() => onRepeat(o.order_code)}
                  className="text-xs px-3 py-1.5 bg-white text-black rounded-sm font-semibold disabled:opacity-50">
                  {busy === o.order_code ? "Creating…" : "Repeat Order"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
