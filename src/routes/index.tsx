import { createFileRoute } from "@tanstack/react-router";
import { I18nProvider, useI18n } from "@/components/xtz/i18n";
import { Navigation } from "@/components/xtz/Navigation";
import { IntroScene } from "@/components/xtz/IntroScene";
import { Chapter } from "@/components/xtz/Chapter";
import { PortfolioReel } from "@/components/xtz/PortfolioReel";
import { Process } from "@/components/xtz/Process";
import { InquiryForm } from "@/components/xtz/InquiryForm";
import { FAQ } from "@/components/xtz/FAQ";
import { Finale } from "@/components/xtz/Finale";
import chapterLaser from "@/assets/chapter-laser.jpg";
import chapterPrint from "@/assets/chapter-print.jpg";
import chapterFab from "@/assets/chapter-fab.jpg";
import heroOffice from "@/assets/hero-office.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3D AXIS — From Concept to Reality" },
      { name: "description", content: "3D AXIS. Engineering and manufacturing partner. Design, prototype, manufacture and deliver — precision laser cutting, metal fabrication, 3D printing and design services." },
      { property: "og:title", content: "3D AXIS — From Concept to Reality" },
      { property: "og:description", content: "Engineering and manufacturing partner. From idea to delivery, precision without compromise." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <I18nProvider>
      <Main />
    </I18nProvider>
  );
}

function Main() {
  const { t } = useI18n();
  return (
    <main className="bg-black text-foreground">
      <Navigation />
      <IntroScene />
      <Chapter
        id="idea"
        number="01 /"
        kicker={t("ch.idea.k")}
        title={t("ch.idea.t")}
        description={t("ch.idea.d")}
        image={heroOffice}
        imageAlt="Industrial design studio with brushed metal surfaces and blueprints"
      />
      <Chapter
        id="design"
        number="02 /"
        kicker={t("ch.design.k")}
        title={t("ch.design.t")}
        description={t("ch.design.d")}
        image={chapterPrint}
        imageAlt="Premium product detail — designed in digital, built in real materials"
        align="right"
      />
      <Chapter
        id="prototype"
        number="03 /"
        kicker={t("ch.proto.k")}
        title={t("ch.proto.t")}
        description={t("ch.proto.d")}
        image={chapterFab}
        imageAlt="Precision-machined component on a workshop bench — rapid prototype"
      />
      <Chapter
        id="manufacture"
        number="04 /"
        kicker={t("ch.mfg.k")}
        title={t("ch.mfg.t")}
        description={t("ch.mfg.d")}
        image={chapterLaser}
        imageAlt="Fiber laser cutting through steel with blue sparks"
        align="right"
      />
      <PortfolioReel />
      <Process />
      <InquiryForm />
      <FAQ />
      <Finale />
    </main>
  );
}
