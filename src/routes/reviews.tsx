import { createFileRoute, Link } from "@tanstack/react-router";
import { listPublicReviews } from "@/lib/api/features.functions";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";

const PAGE_URL = "https://www.toreo.gr/reviews";

export const Route = createFileRoute("/reviews")({
  loader: async () => {
    try {
      const rows = (await listPublicReviews()) as any[];
      return { rows: rows ?? [] };
    } catch {
      return { rows: [] as any[] };
    }
  },
  head: ({ loaderData }) => {
    const rows = loaderData?.rows ?? [];
    const count = rows.length;
    const avg = count ? rows.reduce((s: number, r: any) => s + (r.rating || 0), 0) / count : 0;

    const graph: any[] = [
      {
        "@type": "WebPage",
        "@id": `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: "Customer Reviews — TOREO",
        description:
          "Verified reviews from TOREO customers — 3D printing, fiber laser cutting, sheet metal and welding projects.",
      },
    ];

    if (count > 0) {
      graph.push({
        "@type": "Organization",
        "@id": "https://www.toreo.gr/#organization",
        name: "TOREO",
        url: "https://www.toreo.gr",
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: avg.toFixed(1),
          reviewCount: count,
          bestRating: "5",
          worstRating: "1",
        },
        review: rows.slice(0, 10).map((r: any) => ({
          "@type": "Review",
          datePublished: new Date(r.created_at).toISOString().slice(0, 10),
          reviewBody: r.comment ?? undefined,
          author: { "@type": "Person", name: r.customer_name ?? "Verified customer" },
          reviewRating: {
            "@type": "Rating",
            ratingValue: String(r.rating ?? 5),
            bestRating: "5",
            worstRating: "1",
          },
        })),
      });
    }

    return {
      meta: [
        { title: "Customer Reviews — TOREO" },
        {
          name: "description",
          content:
            "Verified reviews from TOREO customers — 3D printing, fiber laser cutting, sheet metal and welding projects delivered across Greece and the EU.",
        },
        { property: "og:title", content: "Customer Reviews — TOREO" },
        { property: "og:description", content: "Real feedback from real TOREO manufacturing projects." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PAGE_URL },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Customer Reviews — TOREO" },
        { name: "twitter:description", content: "Real feedback from real TOREO manufacturing projects." },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
        },
      ],
    };
  },
  errorComponent: () => (
    <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Reviews are temporarily unavailable</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-white/60 underline">
          Back to home
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center">
      <p className="text-white/60">Page not found.</p>
    </div>
  ),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { rows } = Route.useLoaderData();
  const avg = rows.length ? rows.reduce((s: number, r: any) => s + (r.rating || 0), 0) / rows.length : 0;

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
        {rows.length === 0 ? (
          <div className="text-white/50 mt-10">No reviews yet. Be the first to leave one after your next order.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            {rows.map((r: any) => (
              <div key={r.id} className="border border-white/10 bg-white/[0.02] rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div className="text-amber-300">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                  <div className="text-[10px] font-mono text-white/40">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="mt-2 font-semibold text-sm">{r.customer_name ?? "Verified customer"}</div>
                {r.comment && <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{r.comment}</p>}
                {r.photo_url && <img src={r.photo_url} alt="Customer project photo" loading="lazy" className="mt-3 rounded-md max-h-64 object-cover" />}
              </div>
            ))}
          </div>
        )}
        <div className="mt-12">
          <Link to="/start-project" className="inline-block bg-white text-black rounded-md px-6 py-3 text-sm font-semibold uppercase tracking-wider">Upload CAD &amp; Request a Quote</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
