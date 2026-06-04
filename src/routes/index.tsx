import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/components/xtz/i18n";
import { Navigation } from "@/components/xtz/Navigation";
import { IntroScene } from "@/components/xtz/IntroScene";
import { Concept } from "@/components/xtz/Concept";
import { Capabilities } from "@/components/xtz/Capabilities";
import { Chapter } from "@/components/xtz/Chapter";
import { PortfolioReel } from "@/components/xtz/PortfolioReel";
import { Process } from "@/components/xtz/Process";
import { GlobalNetwork } from "@/components/xtz/GlobalNetwork";
import { InquiryForm } from "@/components/xtz/InquiryForm";
import { Finale } from "@/components/xtz/Finale";
import { Footer } from "@/components/xtz/Footer";
import chapterLaser from "@/assets/chapter-laser.jpg";
import chapterPrint from "@/assets/chapter-print.jpg";
import chapterFab from "@/assets/chapter-fab.jpg";
import heroOffice from "@/assets/hero-office.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3D AXIS — From Concept to Reality" },
      { name: "description", content: "3D AXIS: design, prototype and manufacture under one roof. Fiber laser cutting, sheet metal, 3D printing and engineering." },
      { property: "og:title", content: "3D AXIS — From Concept to Reality" },
      { property: "og:description", content: "Design, prototype and manufacture under one roof." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "preload", as: "image", href: heroOffice, fetchpriority: "high" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  return (
    <main className="bg-black text-foreground">
      <Navigation />
      <IntroScene />
      <Concept />
      <Capabilities />
      <Chapter
        id="idea"
        number="01 /"
        kicker={t("ch.idea.k")}
        title={t("ch.idea.t")}
        description={t("ch.idea.d")}
        image={heroOffice}
        imageAlt="Engineering studio with brushed metal surfaces"
      />
      <Chapter
        id="design"
        number="02 /"
        kicker={t("ch.design.k")}
        title={t("ch.design.t")}
        description={t("ch.design.d")}
        image={chapterPrint}
        imageAlt="CAD detail of a precision component"
        align="right"
      />
      <Chapter
        id="prototype"
        number="03 /"
        kicker={t("ch.proto.k")}
        title={t("ch.proto.t")}
        description={t("ch.proto.d")}
        image={chapterFab}
        imageAlt="Precision-machined prototype on a workshop bench"
      />
      <Chapter
        id="manufacture"
        number="04 /"
        kicker={t("ch.mfg.k")}
        title={t("ch.mfg.t")}
        description={t("ch.mfg.d")}
        image={chapterLaser}
        imageAlt="Fiber laser cutting steel"
        align="right"
      />
      <PortfolioReel />
      <Process />
      <GlobalNetwork />
      <InquiryForm />
      <Finale />
      <Footer />
    </main>
  );
}
