import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListReviews, adminSetReviewApproval } from "@/lib/api/features.functions";

export const Route = createFileRoute("/admin_/reviews")({
  ssr: false,
  head: () => ({ meta: [{ title: "TOREO — Reviews" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ReviewsAdmin,
});

function ReviewsAdmin() {
  const load = useServerFn(adminListReviews);
  const setApp = useServerFn(adminSetReviewApproval);
  const [rows, setRows] = useState<any[]>([]);

  async function reload() { try { setRows(await load()); } catch (e) { console.error(e); } }
  useEffect(() => { reload(); }, []); // eslint-disable-line

  async function toggle(id: string, approved: boolean) {
    await setApp({ data: { id, approved } });
    await reload();
  }

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white p-6 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.4em] text-amber-300/80">REVIEWS</div>
          <h1 className="text-2xl font-semibold">Customer Reviews</h1>
        </div>
        <Link to="/admin" className="text-xs font-mono tracking-widest text-white/60 hover:text-white">← ADMIN</Link>
      </div>
      <div className="space-y-3">
        {rows.length === 0 && <div className="text-white/40 text-sm">No reviews yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="border border-white/10 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-amber-300 text-lg">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                <div className="text-xs text-white/50">{r.customer_name} · {r.orders?.order_code ?? "—"} · {new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-1 rounded-sm ${r.approved ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"}`}>
                  {r.approved ? "PUBLISHED" : "PENDING"}
                </span>
                <button onClick={() => toggle(r.id, !r.approved)}
                  className={`text-xs px-3 py-1.5 rounded-sm ${r.approved ? "border border-white/20" : "bg-emerald-500 text-black font-semibold"}`}>
                  {r.approved ? "Unpublish" : "Approve"}
                </button>
              </div>
            </div>
            {r.comment && <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
