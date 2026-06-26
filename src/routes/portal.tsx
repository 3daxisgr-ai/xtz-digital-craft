import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listMyOrders, meIsAdmin } from "@/lib/api/orders.functions";
import { StatusBadge } from "@/components/portal/StatusProgress";

export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customer Portal — TOREO" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const navigate = useNavigate();
  const list = useServerFn(listMyOrders);
  const checkAdmin = useServerFn(meIsAdmin);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [email, setEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setEmail(data.session.user.email ?? "");
      try {
        const [rows, a] = await Promise.all([list({} as any), checkAdmin({} as any)]);
        setOrders(rows as any[]);
        setIsAdmin(a.admin);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, list, checkAdmin]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <header className="border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 bg-[#070708]/90 backdrop-blur z-10">
        <Link to="/" className="font-mono text-[10px] tracking-[0.3em] text-white/60 hover:text-white uppercase">
          ← TOREO
        </Link>
        <div className="flex items-center gap-4 text-xs">
          {isAdmin && (
            <Link to="/admin" className="text-amber-300 hover:text-amber-200 uppercase tracking-wider font-mono">
              Admin
            </Link>
          )}
          <span className="text-white/40 hidden md:inline">{email}</span>
          <button onClick={signOut} className="text-white/60 hover:text-white">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">Customer Portal</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Your orders</h1>
          </div>
          <Link
            to="/start"
            className="bg-white text-black hover:bg-white/90 rounded-md px-5 py-2.5 text-sm font-semibold tracking-wide uppercase font-mono"
          >
            New Project
          </Link>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="text-white/40 text-sm">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="border border-white/10 rounded-lg p-10 text-center bg-white/[0.02]">
              <div className="text-white/60">No orders yet.</div>
              <Link
                to="/start"
                className="mt-4 inline-block text-sm underline hover:no-underline"
              >
                Submit your first quote request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  to="/portal/$orderCode"
                  params={{ orderCode: o.order_code ?? "" }}
                  className="block border border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04] rounded-lg p-4 md:p-5 transition"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-mono text-sm font-semibold tracking-wider">
                        {o.order_code}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {o.service ?? "—"} · {o.material ?? "—"} ·{" "}
                        {new Date(o.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {o.quote_price != null && (
                        <span className="font-mono text-sm">€{Number(o.quote_price).toFixed(2)}</span>
                      )}
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
