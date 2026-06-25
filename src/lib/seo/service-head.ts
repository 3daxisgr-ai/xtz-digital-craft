/**
 * Build a consistent head() object for service / landing pages, including
 * canonical, OG, Twitter, hreflang alternates, and Service + BreadcrumbList
 * + FAQPage JSON-LD.
 */

const BASE = "https://www.toreo.gr";

export interface ServiceHeadInput {
  /** Title shown in browser tab + SERP */
  title: string;
  /** SERP / OG description */
  description: string;
  /** Path of THIS page, e.g. "/cnc-machining" or "/gr/cnc-machining" */
  path: string;
  /** Path of the OTHER locale of the same content */
  altPath: string;
  /** Locale of THIS page */
  locale: "en" | "gr";
  /** Service name for schema.org Service entity */
  serviceName: string;
  /** Service description for schema.org */
  serviceDescription: string;
  /** Optional FAQ for FAQPage schema */
  faq?: { q: string; a: string }[];
  /** Optional breadcrumb trail. Defaults to [Home, <title>]. */
  breadcrumbs?: { name: string; path: string }[];
  /** Absolute or root-relative OG image. Defaults to site hero. */
  ogImage?: string;
}

export function buildServiceHead(input: ServiceHeadInput) {
  const url = `${BASE}${input.path}`;
  const altUrl = `${BASE}${input.altPath}`;
  const ogLocale = input.locale === "gr" ? "el_GR" : "en_US";
  const altOgLocale = input.locale === "gr" ? "en_US" : "el_GR";
  const ogImage =
    input.ogImage && input.ogImage.startsWith("http")
      ? input.ogImage
      : input.ogImage
        ? `${BASE}${input.ogImage}`
        : undefined;

  const crumbs =
    input.breadcrumbs ??
    [
      { name: input.locale === "gr" ? "Αρχική" : "Home", path: input.locale === "gr" ? "/gr" : "/" },
      { name: input.serviceName, path: input.path },
    ];

  const ldGraph: Record<string, unknown>[] = [
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: input.serviceName,
      description: input.serviceDescription,
      provider: { "@id": `${BASE}/#organization` },
      areaServed: ["GR", "EU"],
      url,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: `${BASE}${c.path}`,
      })),
    },
  ];

  if (input.faq && input.faq.length > 0) {
    ldGraph.push({
      "@type": "FAQPage",
      mainEntity: input.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  const meta: { name?: string; property?: string; content?: string; title?: string }[] = [
    { title: input.title },
    { name: "description", content: input.description },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:locale", content: ogLocale },
    { property: "og:locale:alternate", content: altOgLocale },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
  ];

  if (ogImage) {
    meta.push({ property: "og:image", content: ogImage });
    meta.push({ name: "twitter:image", content: ogImage });
  }

  return {
    meta,
    links: [
      { rel: "canonical", href: url },
      { rel: "alternate", hrefLang: input.locale === "gr" ? "el" : "en", href: url },
      { rel: "alternate", hrefLang: input.locale === "gr" ? "en" : "el", href: altUrl },
      { rel: "alternate", hrefLang: "x-default", href: input.locale === "en" ? url : altUrl },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": ldGraph,
        }),
      },
    ],
  };
}
