import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://www.toreo.gr";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const CAPABILITY_SLUGS = [
  "design-development",
  "fiber-laser-cutting",
  "sheet-metal-forming-welding",
  "3d-printing",
  "design-to-prototype",
  "global-manufacturing-network",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/cnc-machining", changefreq: "weekly", priority: "0.95" },
          { path: "/rapid-prototyping", changefreq: "weekly", priority: "0.95" },
          { path: "/custom-metal-parts", changefreq: "weekly", priority: "0.95" },
          { path: "/gr/cnc-machining", changefreq: "weekly", priority: "0.9" },
          { path: "/gr/rapid-prototyping", changefreq: "weekly", priority: "0.9" },
          { path: "/gr/custom-metal-parts", changefreq: "weekly", priority: "0.9" },
          { path: "/start", changefreq: "monthly", priority: "0.9" },
          { path: "/3d-printing-quote", changefreq: "monthly", priority: "0.9" },
          { path: "/company", changefreq: "monthly", priority: "0.8" },
          { path: "/equipment", changefreq: "monthly", priority: "0.7" },
          { path: "/faq", changefreq: "monthly", priority: "0.7" },
          { path: "/forum", changefreq: "weekly", priority: "0.6" },
          ...CAPABILITY_SLUGS.map((slug) => ({
            path: `/capabilities/${slug}`,
            changefreq: "monthly" as const,
            priority: "0.8",
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
