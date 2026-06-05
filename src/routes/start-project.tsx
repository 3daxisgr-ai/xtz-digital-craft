import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { InquiryForm } from "@/components/xtz/InquiryForm";

export const Route = createFileRoute("/start-project")({
  head: () => ({
    meta: [
      { title: "Start a Project — 3D AXIS" },
      { name: "description", content: "Send us your project. Every inquiry is reviewed by an engineer and answered within one business day." },
      { property: "og:title", content: "Start a Project — 3D AXIS" },
      { property: "og:description", content: "Design, prototype and manufacture under one roof." },
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
