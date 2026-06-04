
# Phase 1 — Structure, UX & Performance Refinement

Keeping the existing visual identity, palette, hero image, and the horizontal-scroll capabilities system. Refinement only — no redesign.

## 1. Homepage hero (`IntroScene.tsx`)

- Remove the oversized `3D AXIS` wordmark (logo-engrave block + sheen + metallic baseline) from the hero.
- Keep the hero background image, ambient blue, sparks, laser beam, vignette, scroll hint.
- Promote `FROM CONCEPT TO REALITY` to the dominant hero element:
  - Display font, `clamp(3rem, 11vw, 11rem)`, tight tracking, leading 0.9
  - Subtle electric-blue glow via existing `--primary` token (drop-shadow + soft radial halo)
  - Keep the small `XYZ — DESIGN · PROTOTYPE · MANUFACTURE · DELIVER` mono line beneath it
- Adjust the scroll-pin timeline classes so the new headline (replaces `.logo-engrave`) is the element being scaled/faded out.

## 2. Copy simplification

Rewrite EN + GR strings in `src/components/xtz/i18n.tsx` and any hardcoded copy in:
- `Concept.tsx`, `Capabilities.tsx`, `Chapter.tsx` callers (in `routes/index.tsx`), `Process.tsx`, `GlobalNetwork.tsx`, `InquiryForm.tsx`, `Finale.tsx`, `Footer.tsx`

Voice rules:
- Short sentences, plain language, no philosophy/jargon
- Three answers, always visible quickly: what we do · how we do it · how to start

## 3. Capabilities section (horizontal scroll)

Keep the current horizontal-scroll system as-is structurally. Performance pass only:
- Add `will-change: transform`, `translate3d` on the scrolled track, `contain: paint`
- Throttle ScrollTrigger via `gsap.ticker.lagSmoothing` + `ScrollTrigger.config({ ignoreMobileResize: true })`
- Lazy-load card images (`loading="lazy" decoding="async"`) and add explicit `width`/`height`
- Disable heaviest animations under `prefers-reduced-motion` and `<768px`
- Replace any per-frame state updates with `requestAnimationFrame`-batched reads

## 4. Capabilities list

Replace card data in `Capabilities.tsx` with:

```text
01 Design & Development
02 Fiber Laser Cutting
03 Sheet Metal Forming & Welding
04 3D Printing
05 Design → Prototype
06 Global Manufacturing Network
```

Remove the old "Functional Prototypes / Scalable Manufacturing" cards and the duplicate Services list + 3D Printing emphasis block (folded into the new six items). Keep card aesthetic.

## 5. Capabilities interaction → dedicated pages

Each capability becomes a `<Link>` to its own route. No modals, no popups.

New routes:

```text
src/routes/capabilities.index.tsx                      (overview grid, same six items)
src/routes/capabilities.design-development.tsx
src/routes/capabilities.fiber-laser-cutting.tsx
src/routes/capabilities.sheet-metal.tsx
src/routes/capabilities.3d-printing.tsx
src/routes/capabilities.design-to-prototype.tsx
src/routes/capabilities.global-network.tsx
```

Each page: hero (title + kicker + short summary), what we do, materials/process, how to start CTA → `/#inquiry`. Reuses the same tokens, Navigation, Footer. Per-route `head()` with unique title + description + og:title/description.

## 6. Remove forum

Search the project for any "forum" reference and remove (routes, components, nav links, i18n keys). If none exist, note it and move on.

## 7. FAQ → dedicated page

- New route: `src/routes/faq.tsx` using the existing `FAQ` component, restructured around: 3D Printing, Laser Cutting, Materials, Lead Times, Prototyping, Production, Pricing Process, File Requirements.
- Remove `<FAQ />` from `routes/index.tsx`.
- Add an FAQ entry to the Navigation links.

## 8. Performance

- `loading="lazy" decoding="async"` + explicit dimensions on all non-hero images (`Chapter`, `PortfolioReel`, capability pages).
- Convert hero image to a preloaded asset via per-route `head().links` (`rel=preload as=image fetchpriority=high`).
- Guard GSAP timelines with `prefers-reduced-motion` (skip ScrollTrigger scrubs, run a single fade).
- Add `content-visibility: auto` + `contain-intrinsic-size` on long below-the-fold sections (Process, GlobalNetwork, FAQ block when used inline).
- Remove unused asset imports.
- Verify no per-scroll React `setState` in hot paths (Navigation already uses passive listener; keep).

## 9. Branding

No palette change. Keep XYZ kicker, electric-blue accent, mono labels, brushed-metal/glass-panel utilities.

---

## Technical notes

- Routing additions register automatically via the TanStack Router Vite plugin; do not hand-edit `routeTree.gen.ts`.
- Capability page filenames use dot-separated convention: `capabilities.fiber-laser-cutting.tsx` → `/capabilities/fiber-laser-cutting`. The leading numeric slug `3d-printing` is fine as a URL segment but the route file must start with a letter — use `capabilities.three-d-printing.tsx` mapping to `/capabilities/three-d-printing`, or keep `capabilities.3d-printing.tsx` (TanStack accepts it; verify after generation).
- New `<Link>` usage: `import { Link } from "@tanstack/react-router"` with `to="/capabilities/fiber-laser-cutting"` — never interpolated strings.
- i18n: keep `useI18n` provider; new pages are wrapped the same way the index page is, or i18n is lifted into `__root.tsx` so every route shares it. I'll lift it to `__root.tsx` to avoid duplicating the provider on every page.
- FAQ content is rewritten in both EN and GR.

## Out of scope (Phase 1)

- No new color tokens, no design system rewrite.
- No backend / Lovable Cloud changes.
- No new third-party libraries.
