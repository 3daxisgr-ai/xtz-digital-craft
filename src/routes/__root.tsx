import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/components/xtz/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TOREO — 3D Printing, Fiber Laser Cutting & Sheet Metal Fabrication" },
      { name: "description", content: "TOREO: 3D printing, fiber laser cutting, sheet metal bending, MIG/TIG welding, CAD design and prototyping in Thessaloniki, Greece." },
      { name: "author", content: "TOREO" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "theme-color", content: "#0d1220" },
      { property: "og:site_name", content: "TOREO" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "el_GR" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "TOREO — 3D Printing, Fiber Laser Cutting & Sheet Metal Fabrication" },
      { name: "twitter:title", content: "TOREO — 3D Printing, Fiber Laser Cutting & Sheet Metal Fabrication" },
      { property: "og:description", content: "TOREO: 3D printing, fiber laser cutting, sheet metal bending, MIG/TIG welding, CAD design and prototyping in Thessaloniki, Greece." },
      { name: "twitter:description", content: "TOREO: 3D printing, fiber laser cutting, sheet metal bending, MIG/TIG welding, CAD design and prototyping in Thessaloniki, Greece." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0136c2b7-3464-451f-939d-916490b21a9a" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0136c2b7-3464-451f-939d-916490b21a9a" },
      { name: "google-site-verification", content: "OnQ5wC9BJYXVX1HUQITKJU3E4JMb2FBGW3hIMHSo40E" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://www.toreo.gr/#organization",
              name: "TOREO",
              url: "https://www.toreo.gr",
              logo: "https://www.toreo.gr/favicon.ico",
              description: "3D printing, fiber laser cutting, sheet metal bending, MIG/TIG welding, CAD design and prototyping in Thessaloniki, Greece.",
              areaServed: ["GR", "EU"],
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+30 6970609960",
                contactType: "customer service",
                areaServed: ["GR", "EU"],
                availableLanguage: ["en", "el"],
              },
            },
            {
              "@type": "WebSite",
              "@id": "https://www.toreo.gr/#website",
              name: "TOREO",
              url: "https://www.toreo.gr",
              publisher: { "@id": "https://www.toreo.gr/#organization" },
              inLanguage: ["en", "el"],
            },
            {
              "@type": "LocalBusiness",
              "@id": "https://www.toreo.gr/#localbusiness",
              name: "TOREO",
              url: "https://www.toreo.gr",
              telephone: "+30 6970609960",
              image: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0136c2b7-3464-451f-939d-916490b21a9a",
              priceRange: "€€",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Thessaloniki",
                addressCountry: "GR",
              },
              areaServed: ["GR", "EU"],
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </I18nProvider>
    </QueryClientProvider>
  );
}
