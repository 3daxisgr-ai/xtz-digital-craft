import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { InquiryForm } from "@/components/xtz/InquiryForm";

export const Route = createFileRoute("/start-project")({
  head: () => ({
    meta: [
      { title: "Start a Project — TOREO" },
      { name: "description", content: "Send us your project. Every inquiry is reviewed by an engineer and answered within one business day." },
      { property: "og:title", content: "Start a Project — TOREO" },
      { property: "og:description", content: "Send TOREO your project — every inquiry is reviewed by an engineer and answered within one business day." },
      { property: "og:url", content: "https://www.toreo.gr/start-project" },
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
