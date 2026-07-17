import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPublicReviews } from "@/lib/api/features.functions";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Customer Reviews — TOREO" },
      { name: "description", content: "Verified reviews from TOREO customers — 3D printing, fiber laser cutting, sheet metal and welding projects delivered across Greece and the EU." },
      { property: "og:title", content: "Customer Reviews — TOREO" },
      { property: "og:description", content: "Real feedback from real TOREO manufacturing projects." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.toreo.gr/reviews" }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const load = useServerFn(listPublicReviews);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { load().then(setRows).finally(() => setLoading(false)); }, []); // eslint-disable-line

  const avg = rows.length ? rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.length : 0;

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-16">
        <div className="font-mono text-[10px] tracking-[0.4em] text-white/40 uppercase">TOREO — Verified Reviews</div>
        <h1 className="text-4xl font-semibold tracking-tight mt-2">What our customers say</h1>
        {rows.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="text-3xl">{"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}</div>
            <div className="text-white/60 text-sm">{avg.toFixed(1)} · {rows.length} reviews</div>
          </div>
        )}
        {loading ? (
          <div className="text-white/40 text-sm mt-10">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-white/50 mt-10">No reviews yet. Be the first to leave one after your next order.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            {rows.map((r) => (
              <div key={r.id} className="border border-white/10 bg-white/[0.02] rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div className="text-amber-300">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                  <div className="text-[10px] font-mono text-white/40">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="mt-2 font-semibold text-sm">{r.customer_name ?? "Verified customer"}</div>
                {r.comment && <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{r.comment}</p>}
                {r.photo_url && <img src={r.photo_url} alt="Customer photo" className="mt-3 rounded-md max-h-64 object-cover" />}
              </div>
            ))}
          </div>
        )}
        <div className="mt-12">
          <Link to="/start-project" className="inline-block bg-white text-black rounded-md px-6 py-3 text-sm font-semibold uppercase tracking-wider">Upload CAD & Request a Quote</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
