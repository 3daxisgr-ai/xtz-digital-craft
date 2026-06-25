import { Link } from "@tanstack/react-router";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";

export interface FAQItem {
  q: string;
  a: string;
}

export interface ProcessStep {
  step: string;
  title: string;
  body: string;
}

export interface ServicePageProps {
  /** Locale code used for the lang attribute hint and CTA copy */
  locale: "en" | "gr";
  /** Eyebrow / kicker text above the H1 */
  kicker: string;
  /** Page H1 — should contain the primary keyword */
  h1: string;
  /** Short paragraph immediately under the H1 */
  heroSub: string;
  /** "Request quote" CTA label */
  ctaLabel: string;
  /** Where the CTA links (typically /start-project) */
  ctaTo: string;
  /** Intro section heading */
  introTitle: string;
  /** Intro section body — one to three paragraphs */
  introBody: string[];
  /** Industries served */
  industries: { title: string; body: string }[];
  industriesTitle: string;
  /** End-to-end process */
  process: ProcessStep[];
  processTitle: string;
  /** Capabilities / materials list */
  materialsTitle: string;
  materials: { label: string; value: string }[];
  /** Why TOREO reasons */
  whyTitle: string;
  why: { title: string; body: string }[];
  /** FAQ items */
  faqTitle: string;
  faq: FAQItem[];
  /** Final CTA block */
  finalTitle: string;
  finalBody: string;
}

/**
 * Shared layout for SEO-optimized service landing pages.
 * Reuses existing visual tokens (background, fonts, primary colour) and the
 * existing Navigation + Footer so the page feels native to the rest of the
 * site without introducing a new design system.
 */
export function ServicePage(props: ServicePageProps) {
  return (
    <main className="text-foreground" style={{ backgroundColor: "#0d1220" }}>
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 md:pt-44 pb-20 md:pb-28 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, oklch(0.55 0.22 245 / 0.28), transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[1200px] px-6 md:px-12">
          <div className="font-mono text-[12px] uppercase tracking-[0.5em] text-primary/80 mb-5">
            {props.kicker}
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] text-foreground max-w-4xl">
            {props.h1}
          </h1>
          <p className="mt-6 max-w-2xl font-display text-lg md:text-xl text-foreground/75 leading-relaxed">
            {props.heroSub}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to={props.ctaTo}
              className="inline-flex items-center justify-center font-mono text-[12px] uppercase tracking-[0.3em] border border-primary px-6 py-4 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {props.ctaLabel}
            </Link>
            <Link
              to="/equipment"
              className="inline-flex items-center justify-center font-mono text-[12px] uppercase tracking-[0.3em] border border-border/60 px-6 py-4 text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
            >
              {props.locale === "gr" ? "Εξοπλισμός" : "View Equipment"}
            </Link>
          </div>
        </div>
      </section>

      {/* Intro */}
      <Section>
        <Kicker>01</Kicker>
        <H2>{props.introTitle}</H2>
        <div className="mt-6 space-y-5 max-w-3xl">
          {props.introBody.map((p, i) => (
            <p key={i} className="font-display text-base md:text-lg text-foreground/75 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </Section>

      {/* Industries */}
      <Section variant="alt">
        <Kicker>02</Kicker>
        <H2>{props.industriesTitle}</H2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/40">
          {props.industries.map((ind) => (
            <div
              key={ind.title}
              className="p-7 md:p-8"
              style={{ backgroundColor: "#0d1220" }}
            >
              <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                {ind.title}
              </h3>
              <p className="mt-3 font-display text-sm md:text-base text-foreground/70 leading-relaxed">
                {ind.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Process */}
      <Section>
        <Kicker>03</Kicker>
        <H2>{props.processTitle}</H2>
        <ol className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {props.process.map((p) => (
            <li
              key={p.step}
              className="border border-border/40 p-6 hover:border-primary/50 transition-colors"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary/80">
                {p.step}
              </div>
              <h3 className="mt-3 font-display text-lg md:text-xl font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-2 font-display text-sm text-foreground/70 leading-relaxed">
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Materials / capabilities */}
      <Section variant="alt">
        <Kicker>04</Kicker>
        <H2>{props.materialsTitle}</H2>
        <dl className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {props.materials.map((m) => (
            <div key={m.label} className="border-l-2 border-primary/60 pl-5 py-1">
              <dt className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {m.label}
              </dt>
              <dd className="mt-1 font-display text-base md:text-lg text-foreground/90">
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Why TOREO */}
      <Section>
        <Kicker>05</Kicker>
        <H2>{props.whyTitle}</H2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {props.why.map((w) => (
            <div key={w.title}>
              <h3 className="font-display text-lg md:text-xl font-semibold text-primary">
                {w.title}
              </h3>
              <p className="mt-3 font-display text-sm text-foreground/70 leading-relaxed">
                {w.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="alt">
        <Kicker>06</Kicker>
        <H2>{props.faqTitle}</H2>
        <div className="mt-10 divide-y divide-border/40 border-y border-border/40 max-w-4xl">
          {props.faq.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="cursor-pointer font-display text-lg md:text-xl font-medium text-foreground list-none flex items-start justify-between gap-6">
                <span>{f.q}</span>
                <span
                  aria-hidden
                  className="font-mono text-primary text-xl leading-none mt-1 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 font-display text-base text-foreground/75 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <section className="relative py-20 md:py-28">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, oklch(0.55 0.22 245 / 0.22), transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[1000px] px-6 md:px-12 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
            {props.finalTitle}
          </h2>
          <p className="mt-5 font-display text-base md:text-lg text-foreground/75 max-w-2xl mx-auto leading-relaxed">
            {props.finalBody}
          </p>
          <div className="mt-10">
            <Link
              to={props.ctaTo}
              className="inline-flex items-center justify-center font-mono text-[12px] uppercase tracking-[0.3em] border border-primary px-8 py-5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {props.ctaLabel}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Section({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "alt";
}) {
  return (
    <section
      className="py-16 md:py-24"
      style={{ backgroundColor: variant === "alt" ? "#0a0f1c" : "#0d1220" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-12">{children}</div>
    </section>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[12px] uppercase tracking-[0.5em] text-primary/80 mb-4">
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground max-w-3xl">
      {children}
    </h2>
  );
}
