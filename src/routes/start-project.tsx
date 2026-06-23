import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { InquiryForm } from "@/components/xtz/InquiryForm";

export const Route = createFileRoute("/start-project")({
  head: () => ({
    meta: [
      { title: "Start a Project — Custom Parts & Prototype Manufacturing | TOREO" },
      { name: "description", content: "Send TOREO your custom parts manufacturing or prototype project. Every inquiry is reviewed by an engineer and answered within one business day — 3D printing, CNC machining and laser cutting in Greece." },
      { name: "keywords", content: "custom parts manufacturing, prototype manufacturing, engineering services, rapid prototyping Greece, CNC machining" },
      { property: "og:title", content: "Start a Project — Custom Parts & Prototype Manufacturing | TOREO" },
      { property: "og:description", content: "Send TOREO your project — every inquiry is reviewed by an engineer and answered within one business day." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/start-project" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Start a Project | TOREO" },
      { name: "twitter:description", content: "Send your custom parts or prototype project — engineer reviewed within one business day." },
    ],
    links: [
      { rel: "canonical", href: "https://www.toreo.gr/start-project" },
    ],
  }),
  component: StartProjectPage,
});

function StartProjectPage() {
  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <div className="pt-20">
        <InquiryForm />
      </div>
      <Footer />
    </main>
  );
}
