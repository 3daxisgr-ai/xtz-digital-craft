
# TOREO Blueprint Implementation Plan

A large change. I'll do it in 4 phases so each is reviewable. Existing pages (`/capabilities`, `/equipment`, `/company`, `/faq`, `/start-project`, `/3d-printing-quote`) stay untouched.

## Phase 1 — Bilingual routing (EN default, GR variants)

URL strategy: English at root (`/cnc-machining`), Greek mirrored under `/gr/...` (`/gr/cnc-machining`). Pros: no breaking change to existing URLs, clean canonical/hreflang per page, simple to implement, good for `toreo.gr` local SEO.

- Add a tiny `useLocale()` helper that derives `"en" | "gr"` from `pathname`.
- Each bilingual page exports two routes: one EN file, one GR file in `src/routes/gr.*`.
- Each route emits `<link rel="canonical">` + `<link rel="alternate" hreflang="en|el|x-default">` to point to its counterpart.
- Navigation gets an EN/GR language switcher (small text link, no design overhaul).

## Phase 2 — 3 SEO landing pages (×2 languages = 6 routes)

New routes:
- `/cnc-machining` + `/gr/cnc-machining`
- `/rapid-prototyping` + `/gr/rapid-prototyping`
- `/custom-metal-parts` + `/gr/custom-metal-parts`

Each page:
- Hero (H1 = primary keyword, e.g. "CNC Machining Services in Greece & Europe")
- "What it is" / problem solved
- Industries served (automotive, industrial, energy, defense, robotics)
- Process (CAD → Quote → Production → QC → Delivery)
- Materials/capabilities table
- "Why TOREO" trust block (reuses existing `WhyToreo` component — no visual change there)
- FAQ accordion (4–6 Q&A, schema.org FAQPage JSON-LD)
- Final CTA → `/start-project`
- Per-route `head()`: unique title, description, og:*, canonical, Service JSON-LD, BreadcrumbList JSON-LD

Visual style reuses existing `xtz/` components and tokens — no new design system.

## Phase 3 — Blog system (Lovable Cloud DB-backed)

DB: `blog_posts` table in `public` schema.
- Columns: `id uuid pk`, `slug text unique`, `locale text check ('en','gr')`, `title text`, `excerpt text`, `body_md text`, `cover_image_url text nullable`, `meta_title text`, `meta_description text`, `published boolean default false`, `published_at timestamptz`, `created_at`, `updated_at`.
- RLS: `SELECT` to `anon`+`authenticated` where `published = true`; full access to `service_role`.
- GRANTs included in the migration.
- Seed migration: 4 starter posts in EN + GR translations (the article ideas from the brief).

Routes:
- `/blog` + `/gr/blog` — index, lists published posts for that locale, loader uses publishable-key server client.
- `/blog/$slug` + `/gr/blog/$slug` — post detail, renders Markdown (add `react-markdown` + `remark-gfm`), Article JSON-LD, OG tags from cover image.
- Sitemap server route extended to fetch all published posts and emit one URL per post per locale.

No admin UI in this phase — content seeded via migrations. Adding a CMS UI later is a separate ask.

## Phase 4 — Home + conversion polish (minimal)

Goal: improve CTAs/conversion without redesigning. Per user constraints from earlier turns I will NOT change visible design — only:
- Add a small sticky "Request a Quote" CTA in the navigation (mobile-friendly), matching existing button styles.
- Add a "Quick Contact" form route at `/contact` + `/gr/contact` (name, email, phone, message, optional CAD file upload via existing `submission-files` bucket). Reuses existing `InquiryForm` styling.
- Internal links: home + landing pages cross-link to one another and to the blog.

If you want home-page structural changes (new section order, hero copy rewrite, swapping in CNC/Prototyping/Metal Parts as the 3 cards), that's a separate phase — I'll ask before touching the existing home layout.

## Phase 5 — SEO plumbing

- Update `/sitemap.xml` server route: add all new EN+GR pages + blog posts.
- Update `src/components/xtz/Navigation.tsx` minimally: add language switcher + (optionally) the 3 service links under a dropdown.
- Update footer with new service links + Greek links.
- Keep all existing per-route `head()` metadata; only add `hreflang` alternates.

## What I will NOT touch (per earlier instructions)

- No redesign of existing `/`, `/capabilities/*`, `/equipment`, `/company`, `/faq`, `/start-project`, `/3d-printing-quote` pages.
- No changes to colors, typography, components in `src/components/xtz/*` beyond adding bilingual text props and the nav language switcher.
- No removal of existing routes.

## Technical details (for the record)

- Markdown: `bun add react-markdown remark-gfm`
- DB: one migration for `blog_posts` + seed
- i18n: lightweight — no `react-i18next`, just per-route content. Each GR route file imports the EN component and passes Greek copy as props, OR has its own thin component. Choosing the latter for clarity and per-page SEO control.
- All new pages: SSR on (default), public, no auth gate.
- Canonical and og:url self-reference each route's full URL on `https://www.toreo.gr`.

## Confirmation needed before I start

1. **URL pattern OK?** `/gr/...` prefix for Greek, English at root. (Alternative: `/en/...` + `/gr/...` with redirect — breaks current URLs.)
2. **Blog without admin UI OK for now?** Posts seeded via migration; admin CMS can come later.
3. **Home page:** confirm I should leave the current home design alone and only add a sticky CTA + nav language switcher (no section rewrites).

Reply "go" plus answers to the 3 questions and I'll execute Phases 1–5 in sequence.
