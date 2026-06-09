import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { InquiryForm } from "@/components/xtz/InquiryForm";

export const Route = createFileRoute("/start-project")({
  head: () => ({
    meta: [
      { title: "Start a Project — SKG3D" },
      { name: "description", content: "Send us your project. Every inquiry is reviewed by an engineer and answered within one business day." },
      { property: "og:title", content: "Start a Project — SKG3D" },
      { property: "og:description", content: "Design, prototype and manufacture under one roof." },
      { property: "og:url", content: "https://xtz-digital-craft.lovable.app/start-project" },
    ],
    links: [
      { rel: "canonical", href: "https://xtz-digital-craft.lovable.app/start-project" },
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
