import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { supabase } from "@/integrations/supabase/client";
import { submitForm } from "@/lib/api/submissions.functions";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request a Quote — TOREO" },
      { name: "description", content: "Start a project with TOREO — 3D printing, fiber laser cutting, sheet metal bending, welding, replacement parts and product design. Reviewed by our production team." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Request a Quote — TOREO" },
      { property: "og:description", content: "Send TOREO your project — every request is reviewed by our production team and answered within one business day." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.toreo.gr/request" }],
  }),
  component: RequestPage,
});

// ---------------- Types ----------------
type CategoryId = "3d" | "laser" | "bending" | "welding" | "replacement" | "design";

type UploadedFile = { file: File; id: string };

type StepId = "service" | "details" | "contact" | "review";

type ContactInfo = {
  full_name: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  preferred_contact: "email" | "phone" | "either";
  additional_notes: string;
};

// ---------------- Categories ----------------
const CATEGORIES: {
  id: CategoryId;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "3d",
    title: "3D Printing",
    description: "Upload your existing file and use the TOREO 3D Printing quotation system.",
    icon: "▲",
  },
  {
    id: "laser",
    title: "Fiber Laser Cutting",
    description: "Request laser-cut metal parts from drawings, CAD files or dimensions.",
    icon: "◆",
  },
  {
    id: "bending",
    title: "Sheet Metal Bending / Forming",
    description: "Request bent and formed sheet-metal parts.",
    icon: "⌐",
  },
  {
    id: "welding",
    title: "Welding / Complete Fabrication",
    description: "Frames, bases, structures or complete metal constructions.",
    icon: "✦",
  },
  {
    id: "replacement",
    title: "Replacement Part",
    description: "Recreate a damaged or unavailable part from photos, dimensions or the original.",
    icon: "◈",
  },
  {
    id: "design",
    title: "Product Design / I Only Have an Idea",
    description: "Start with an idea, sketch or reference and receive design and manufacturing support.",
    icon: "✧",
  },
];

const ACCEPTED = ".dxf,.dwg,.step,.stp,.stl,.3mf,.pdf,.jpg,.jpeg,.png,.zip";
const MAX_FILE_MB = 25;

// ---------------- Page ----------------
function RequestPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [step, setStep] = useState<StepId>("service");
  const [details, setDetails] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [contact, setContact] = useState<ContactInfo>({
    full_name: "",
    company: "",
    email: "",
    phone: "",
    location: "",
    preferred_contact: "either",
    additional_notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ orderCode: string | null } | null>(null);

  // Pre-select category from ?service= and pre-fill contact from session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("service");
    const map: Record<string, CategoryId> = {
      "3d": "3d", "3d-printing": "3d",
      laser: "laser", "fiber-laser-cutting": "laser",
      bending: "bending", "sheet-metal": "bending",
      welding: "welding",
      replacement: "replacement",
      design: "design",
    };
    if (q && map[q]) {
      if (map[q] === "3d") {
        window.location.replace("/3d-printing-quote");
        return;
      }
      setCategory(map[q]);
      setStep("details");
    }

    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as any;
      setContact((c) => ({
        ...c,
        full_name: c.full_name || meta.full_name || "",
        email: c.email || u.email || "",
        phone: c.phone || meta.phone || "",
        company: c.company || meta.company || "",
      }));
    })();
  }, []);

  const steps: StepId[] = ["service", "details", "contact", "review"];
  const currentStepIdx = steps.indexOf(step);

  function selectCategory(id: CategoryId) {
    if (id === "3d") {
      navigate({ to: "/3d-printing-quote" });
      return;
    }
    setCategory(id);
    setStep("details");
  }

  function goto(s: StepId) {
    setError(null);
    setStep(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateDetails(): string | null {
    if (!category) return "Please select a service.";
    const d = details;
    if (!d.project_name || String(d.project_name).trim().length < 2) return "Please enter a project name.";
    if (!d.delivery_date) return "Please select a required delivery date.";
    if (!d.quantity) return "Please enter the approximate quantity.";
    if (category === "laser") {
      if (!d.material) return "Please choose a material (use 'Not sure' if needed).";
      if (!d.material_thickness) return "Please enter material thickness (or 'Not sure').";
      if (!d.overall_dimensions) return "Please enter approximate overall dimensions.";
    }
    if (category === "bending") {
      if (!d.material) return "Please choose a material.";
      if (!d.material_thickness) return "Please enter material thickness (or 'Not sure').";
      if (!d.overall_dimensions) return "Please enter approximate overall dimensions.";
      if (!d.bend_count) return "Please enter the approximate number of bends.";
    }
    if (category === "welding") {
      if (!d.construction_type) return "Please choose a construction type.";
      if (!d.material) return "Please choose a material.";
      if (!d.overall_dimensions) return "Please enter approximate overall dimensions.";
    }
    if (category === "replacement") {
      if (!d.use_case) return "Please describe what the part is used for.";
      if (!d.overall_dimensions) return "Please enter approximate dimensions.";
      if (files.length === 0) return "Please upload at least one photo, drawing or file.";
    }
    if (category === "design") {
      if (!d.description || String(d.description).trim().length < 10) return "Please describe your idea (at least a couple of sentences).";
      if (!d.intended_use) return "Please describe the intended use.";
      if (!d.overall_dimensions) return "Please enter an approximate size.";
      if (!d.project_stage) return "Please choose your project stage.";
    }
    return null;
  }

  function validateContact(): string | null {
    const c = contact;
    if (!c.full_name.trim()) return "Please enter your full name.";
    if (!c.email.trim() || !/.+@.+\..+/.test(c.email)) return "Please enter a valid email.";
    if (!c.phone.trim()) return "Please enter a phone number.";
    return null;
  }

  async function onContinueDetails() {
    const err = validateDetails();
    if (err) { setError(err); return; }
    goto("contact");
  }
  async function onContinueContact() {
    const err = validateContact();
    if (err) { setError(err); return; }
    goto("review");
  }

  async function onSubmit() {
    if (!category) return;
    const eD = validateDetails();
    if (eD) { setError(eD); goto("details"); return; }
    const eC = validateContact();
    if (eC) { setError(eC); goto("contact"); return; }

    setSubmitting(true); setError(null);
    try {
      // Upload files
      const uploaded: { file_path: string; file_name: string }[] = [];
      for (const uf of files) {
        const ext = uf.file.name.split(".").pop() ?? "bin";
        const path = `inquiry/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("submission-files")
          .upload(path, uf.file, { upsert: false, contentType: uf.file.type || "application/octet-stream" });
        if (upErr) throw upErr;
        uploaded.push({ file_path: path, file_name: uf.file.name });
      }

      const flags = buildFlags(category, details, files);

      const serviceLabel = ({
        laser: "Fiber Laser Cutting",
        bending: "Sheet Metal Forming & Welding",
        welding: "Welding / Complete Fabrication",
        replacement: "Replacement Part",
        design: "Product Design / Idea",
      } as Record<string, string>)[category];

      // Primary submission (first file as attached file, all files metadata below)
      const primary = uploaded[0] ?? null;
      const res = await submitForm({
        data: {
          source: "inquiry",
          name: contact.full_name.split(" ")[0] || contact.full_name,
          surname: contact.full_name.split(" ").slice(1).join(" ") || null,
          email: contact.email,
          phone: contact.phone,
          company: contact.company || null,
          service: serviceLabel,
          material: (details.material as string) || null,
          dimensions: (details.overall_dimensions as string) || null,
          quantity: (details.quantity as string) || null,
          message: buildMessage(category, details, contact),
          file_path: primary?.file_path ?? null,
          file_name: primary?.file_name ?? null,
          metadata: {
            request_category: category,
            request_details: details,
            contact,
            files: uploaded,
            flags,
          },
        },
      });

      // If more than one file, attach the rest via a second lightweight write
      // by re-calling the storage-backed attach isn't exposed here — we rely on
      // the admin dashboard which can list all uploaded files from metadata.files.
      // The primary file already appears in the customer portal via order_files.

      setSent({ orderCode: (res as { order_code?: string | null })?.order_code ?? null });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />
      <section className="relative min-h-screen w-full inox-surface py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 80% 40%, oklch(0.45 0.2 245 / 0.4), transparent 60%)" }} />
        <div className="relative z-10 mx-auto max-w-[1100px] px-5 md:px-10">

          {sent ? (
            <SubmittedView orderCode={sent.orderCode} category={category} />
          ) : (
            <>
              <Header currentIdx={currentStepIdx} steps={steps} category={category} />

              {step === "service" && (
                <ServiceStep onSelect={selectCategory} selected={category} />
              )}

              {step === "details" && category && (
                <DetailsStep
                  category={category}
                  values={details}
                  onChange={(patch) => setDetails((v) => ({ ...v, ...patch }))}
                  files={files}
                  setFiles={setFiles}
                />
              )}

              {step === "contact" && (
                <ContactStep contact={contact} setContact={setContact} />
              )}

              {step === "review" && category && (
                <ReviewStep
                  category={category}
                  details={details}
                  contact={contact}
                  files={files}
                  onEdit={(s) => goto(s)}
                />
              )}

              {error && (
                <div className="mt-6 border border-red-400/40 bg-red-500/5 text-red-200 text-sm p-3 rounded-sm font-mono">
                  {error}
                </div>
              )}

              <NavBar
                step={step}
                onBack={() => {
                  if (step === "details") goto("service");
                  else if (step === "contact") goto("details");
                  else if (step === "review") goto("contact");
                }}
                onNext={() => {
                  if (step === "service") { if (!category) setError("Please select a service."); else goto("details"); }
                  else if (step === "details") onContinueDetails();
                  else if (step === "contact") onContinueContact();
                  else if (step === "review") onSubmit();
                }}
                submitting={submitting}
                canBack={step !== "service"}
                isFinal={step === "review"}
              />
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

// ---------------- Header + step indicator ----------------
function Header({ currentIdx, steps, category }: { currentIdx: number; steps: StepId[]; category: CategoryId | null }) {
  const labels: Record<StepId, string> = {
    service: "Service",
    details: "Project details",
    contact: "Contact",
    review: "Review",
  };
  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <span className="font-mono text-xs text-primary tracking-[0.3em]">— /</span>
        <span className="h-px w-16 bg-primary" />
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Request a Quote
        </span>
      </div>
      <h1 className="font-display font-bold leading-[0.95] text-[clamp(2rem,5vw,3.5rem)] tracking-tight mb-3">
        {category ? `Request — ${CATEGORIES.find(c=>c.id===category)?.title}` : "What do you want to build?"}
      </h1>
      <p className="text-foreground/60 mb-8 max-w-2xl text-sm md:text-base">
        Every request is reviewed by our production team. You will receive a professional quotation after the technical review.
      </p>

      <ol className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-xs font-mono uppercase tracking-[0.25em]">
        {steps.map((s, i) => {
          const active = i === currentIdx;
          const done = i < currentIdx;
          return (
            <li key={s} className="flex items-center gap-2">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${active ? "border-primary text-primary" : done ? "border-primary/60 text-primary/80 bg-primary/10" : "border-white/20 text-white/40"}`}>
                {i + 1}
              </span>
              <span className={active ? "text-white" : done ? "text-white/70" : "text-white/40"}>{labels[s]}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

// ---------------- Step: Service ----------------
function ServiceStep({ selected, onSelect }: { selected: CategoryId | null; onSelect: (id: CategoryId) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((c) => {
        const isSelected = selected === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={isSelected}
            className={`text-left glass-panel grain p-5 md:p-6 border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${isSelected ? "border-primary blue-glow" : "border-border hover:border-primary/60 hover:-translate-y-0.5"}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-primary text-2xl font-mono leading-none">{c.icon}</span>
              <div className="flex-1">
                <div className="font-display text-lg md:text-xl leading-tight tracking-tight">{c.title}</div>
                <p className="text-sm text-foreground/60 mt-2 leading-relaxed">{c.description}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {isSelected ? "Selected" : "Select"}
              </span>
              <span className="text-primary text-lg">→</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------- Step: Details (dynamic) ----------------
function DetailsStep({
  category, values, onChange, files, setFiles,
}: {
  category: CategoryId;
  values: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  files: UploadedFile[];
  setFiles: (f: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
}) {
  return (
    <div className="glass-panel grain p-5 md:p-8 space-y-8">
      <Common values={values} onChange={onChange} />
      {category === "laser" && <LaserFields values={values} onChange={onChange} />}
      {category === "bending" && <BendingFields values={values} onChange={onChange} />}
      {category === "welding" && <WeldingFields values={values} onChange={onChange} />}
      {category === "replacement" && <ReplacementFields values={values} onChange={onChange} />}
      {category === "design" && <DesignFields values={values} onChange={onChange} />}
      <FileArea files={files} setFiles={setFiles} />
      <NotesField values={values} onChange={onChange} />
    </div>
  );
}

function Common({ values, onChange }: any) {
  return (
    <Grid>
      <Text label="Project name *" name="project_name" values={values} onChange={onChange} placeholder="e.g. Enclosure v2" />
      <Text label="Required delivery date *" name="delivery_date" values={values} onChange={onChange} type="date" />
    </Grid>
  );
}

function LaserFields({ values, onChange }: any) {
  const materials = ["Mild steel", "Stainless steel", "Aluminium", "Other", "Not sure"];
  const finishes = ["Raw", "Deburred", "Brushed", "Painted", "Powder coated", "Other", "Not sure"];
  return (
    <>
      <Grid>
        <Select label="Material *" name="material" options={materials} values={values} onChange={onChange} />
        <Text label="Material thickness *" name="material_thickness" values={values} onChange={onChange} placeholder="e.g. 3 mm — or 'Not sure'" />
        <Text label="Quantity *" name="quantity" values={values} onChange={onChange} placeholder="e.g. 20" />
        <Text label="Overall dimensions *" name="overall_dimensions" values={values} onChange={onChange} placeholder="e.g. 500 × 300 mm" />
      </Grid>
      <Grid>
        <Text label="Number of different parts" name="parts_count" values={values} onChange={onChange} placeholder="e.g. 3" />
        <Text label="Max part length" name="max_part_length" values={values} onChange={onChange} placeholder="e.g. 1200 mm" />
        <Text label="Max part width" name="max_part_width" values={values} onChange={onChange} placeholder="e.g. 600 mm" />
        <Text label="Tolerances" name="tolerances" values={values} onChange={onChange} placeholder="e.g. standard / ±0.2 mm" />
      </Grid>
      <Grid>
        <Select label="Surface finish" name="surface_finish" options={finishes} values={values} onChange={onChange} />
        <Check label="Deburring required" name="deburring" values={values} onChange={onChange} />
        <Check label="I am not sure about the material or thickness" name="material_unsure" values={values} onChange={onChange} />
      </Grid>
    </>
  );
}

function BendingFields({ values, onChange }: any) {
  const materials = ["Mild steel", "Stainless steel", "Aluminium", "Other", "Not sure"];
  const finishes = ["Raw", "Deburred", "Brushed", "Painted", "Powder coated", "Other", "Not sure"];
  return (
    <>
      <Grid>
        <Select label="Material *" name="material" options={materials} values={values} onChange={onChange} />
        <Text label="Material thickness *" name="material_thickness" values={values} onChange={onChange} placeholder="e.g. 2 mm" />
        <Text label="Quantity *" name="quantity" values={values} onChange={onChange} />
        <Text label="Overall dimensions *" name="overall_dimensions" values={values} onChange={onChange} placeholder="e.g. 400 × 300 × 80 mm" />
        <Text label="Number of bends *" name="bend_count" values={values} onChange={onChange} placeholder="Exact or approximate" />
        <Text label="Bend angles" name="bend_angles" values={values} onChange={onChange} placeholder="e.g. 90°, 45°" />
        <Text label="Inside bend radius" name="bend_radius" values={values} onChange={onChange} placeholder="e.g. 2 mm" />
        <Text label="Tolerances" name="tolerances" values={values} onChange={onChange} placeholder="e.g. standard" />
      </Grid>
      <Grid>
        <Select label="Surface finish" name="surface_finish" options={finishes} values={values} onChange={onChange} />
      </Grid>
      <div className="grid gap-2">
        <Check label="Laser cutting is also required" name="needs_laser" values={values} onChange={onChange} />
        <Check label="I do not know the correct bend radius" name="bend_radius_unknown" values={values} onChange={onChange} />
        <Check label="I need help checking whether the part can be manufactured" name="needs_manufacturability" values={values} onChange={onChange} />
        <Check label="The dimensions are approximate" name="dimensions_approximate" values={values} onChange={onChange} />
        <Check label="I only have a sketch or photograph" name="sketch_only" values={values} onChange={onChange} />
        <Check label="I need TOREO to prepare the production drawing" name="needs_drawing" values={values} onChange={onChange} />
      </div>
    </>
  );
}

function WeldingFields({ values, onChange }: any) {
  const types = ["Frame", "Base", "Bracket", "Stand", "Enclosure", "Shelf", "Support structure", "Custom metal part", "Machine component", "Automotive component", "Other"];
  const materials = ["Mild steel", "Stainless steel", "Aluminium", "Other", "Not sure"];
  const processes = ["MIG", "TIG", "No preference / TOREO recommendation", "Not sure"];
  const environments = ["Indoor", "Outdoor", "Both", "Not sure"];
  return (
    <>
      <Grid>
        <Select label="Type of construction *" name="construction_type" options={types} values={values} onChange={onChange} />
        <Select label="Material *" name="material" options={materials} values={values} onChange={onChange} />
        <Text label="Material thickness" name="material_thickness" values={values} onChange={onChange} placeholder="e.g. 3 mm" />
        <Text label="Quantity *" name="quantity" values={values} onChange={onChange} />
        <Text label="Approximate overall dimensions *" name="overall_dimensions" values={values} onChange={onChange} placeholder="e.g. 1200 × 600 × 900 mm" />
        <Select label="Welding process" name="welding_process" options={processes} values={values} onChange={onChange} />
        <Text label="Expected load or use" name="expected_load" values={values} onChange={onChange} placeholder="e.g. 200 kg static" />
        <Select label="Indoor / outdoor use" name="environment" options={environments} values={values} onChange={onChange} />
        <Text label="Tolerances" name="tolerances" values={values} onChange={onChange} />
      </Grid>
      <div>
        <FieldLabel>Requested processes</FieldLabel>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Check label="Laser cutting required" name="proc_laser" values={values} onChange={onChange} />
          <Check label="Sheet-metal bending required" name="proc_bending" values={values} onChange={onChange} />
          <Check label="Welding required" name="proc_welding" values={values} onChange={onChange} />
          <Check label="Design required" name="proc_design" values={values} onChange={onChange} />
          <Check label="Assembly required" name="proc_assembly" values={values} onChange={onChange} />
          <Check label="Finishing required" name="proc_finishing" values={values} onChange={onChange} />
        </div>
      </div>
    </>
  );
}

function ReplacementFields({ values, onChange }: any) {
  return (
    <>
      <Grid>
        <Text label="What is the part used for? *" name="use_case" values={values} onChange={onChange} placeholder="e.g. bracket on a compressor" />
        <Text label="Approximate dimensions *" name="overall_dimensions" values={values} onChange={onChange} placeholder="e.g. 120 × 40 × 8 mm" />
        <Text label="Quantity *" name="quantity" values={values} onChange={onChange} />
        <Text label="Vehicle, machine or product model" name="vehicle_model" values={values} onChange={onChange} />
        <Text label="Original-part material" name="material" values={values} onChange={onChange} />
        <Text label="Where the part is installed" name="location_on_product" values={values} onChange={onChange} />
        <Text label="Expected load" name="expected_load" values={values} onChange={onChange} />
      </Grid>
      <div className="grid gap-2">
        <Check label="I can deliver the original part to TOREO" name="original_deliverable" values={values} onChange={onChange} />
        <Check label="I only have photographs" name="have_photos_only" values={values} onChange={onChange} />
        <Check label="I have a drawing with dimensions" name="have_drawing" values={values} onChange={onChange} />
        <Check label="I have a CAD file" name="have_cad" values={values} onChange={onChange} />
        <Check label="I need TOREO to design the part" name="needs_design" values={values} onChange={onChange} />
        <Check label="The original part is broken" name="original_broken" values={values} onChange={onChange} />
        <Check label="The original part is unavailable commercially" name="original_unavailable" values={values} onChange={onChange} />
        <Check label="The dimensions are approximate" name="dimensions_approximate" values={values} onChange={onChange} />
        <Check label="Exposure to heat" name="exposure_heat" values={values} onChange={onChange} />
        <Check label="Exposure to water" name="exposure_water" values={values} onChange={onChange} />
        <Check label="Exposure to chemicals" name="exposure_chemicals" values={values} onChange={onChange} />
        <Check label="Indoor / outdoor exposed" name="outdoor" values={values} onChange={onChange} />
        <Check label="Moving or rotating part" name="moving_part" values={values} onChange={onChange} />
      </div>
      <div className="border border-primary/30 bg-primary/5 rounded-sm p-3 text-xs text-foreground/70">
        Accurate dimensions or the original part may be required before production. TOREO may request additional measurements after reviewing the submission.
      </div>
    </>
  );
}

function DesignFields({ values, onChange }: any) {
  const stages = [
    "I only have an idea",
    "I have a hand sketch",
    "I have reference photos",
    "I have an incomplete CAD model",
    "I have a complete production-ready file",
  ];
  const interests = [
    "3D printing", "Fiber laser cutting", "Sheet-metal bending", "Welding", "Combination of processes", "Not sure / TOREO recommendation",
  ];
  return (
    <>
      <Grid>
        <Text label="Project title *" name="project_name" values={values} onChange={onChange} placeholder="e.g. Compact tool holder" />
        <Text label="Intended use *" name="intended_use" values={values} onChange={onChange} placeholder="e.g. Workshop tool storage" />
        <Text label="Approximate size *" name="overall_dimensions" values={values} onChange={onChange} placeholder="e.g. 300 × 200 × 100 mm" />
        <Text label="Quantity *" name="quantity" values={values} onChange={onChange} />
        <Text label="Target material" name="material" values={values} onChange={onChange} placeholder="e.g. aluminium" />
        <Text label="Expected load" name="expected_load" values={values} onChange={onChange} />
        <Text label="Target budget" name="target_budget" values={values} onChange={onChange} placeholder="e.g. €500 – €1500" />
        <Select label="Project stage *" name="project_stage" options={stages} values={values} onChange={onChange} />
        <Select label="Manufacturing interest" name="manufacturing_interest" options={interests} values={values} onChange={onChange} />
        <Text label="Similar existing product" name="similar_product" values={values} onChange={onChange} />
      </Grid>
      <div>
        <FieldLabel>Description of the idea *</FieldLabel>
        <textarea
          value={values.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={5}
          maxLength={2000}
          className="mt-2 w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm rounded-sm"
        />
      </div>
      <div className="grid gap-2">
        <Check label="Moving parts" name="has_moving_parts" values={values} onChange={onChange} />
        <Check label="Outdoor use" name="outdoor" values={values} onChange={onChange} />
      </div>
      <div className="border border-primary/30 bg-primary/5 rounded-sm p-3 text-xs text-foreground/70">
        Design and engineering work may be quoted separately before production. Manufacturing cannot begin until the design and technical requirements are approved.
      </div>
    </>
  );
}

function NotesField({ values, onChange }: any) {
  return (
    <div>
      <FieldLabel>Additional notes</FieldLabel>
      <textarea
        value={values.additional_notes ?? ""}
        onChange={(e) => onChange({ additional_notes: e.target.value })}
        rows={4}
        maxLength={2000}
        placeholder="Anything else our team should know."
        className="mt-2 w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm rounded-sm"
      />
    </div>
  );
}

// ---------------- Step: Contact ----------------
function ContactStep({ contact, setContact }: { contact: ContactInfo; setContact: (c: ContactInfo | ((p: ContactInfo) => ContactInfo)) => void }) {
  const upd = (patch: Partial<ContactInfo>) => setContact((c) => ({ ...c, ...patch }));
  return (
    <div className="glass-panel grain p-5 md:p-8 space-y-6">
      <Grid>
        <TextCtl label="Full name *" v={contact.full_name} onChange={(v) => upd({ full_name: v })} autoComplete="name" />
        <TextCtl label="Company" v={contact.company} onChange={(v) => upd({ company: v })} autoComplete="organization" />
        <TextCtl label="Email *" type="email" v={contact.email} onChange={(v) => upd({ email: v })} autoComplete="email" />
        <TextCtl label="Phone *" type="tel" v={contact.phone} onChange={(v) => upd({ phone: v })} autoComplete="tel" />
        <TextCtl label="Delivery location" v={contact.location} onChange={(v) => upd({ location: v })} placeholder="City / country" />
        <div>
          <FieldLabel>Preferred contact method</FieldLabel>
          <select
            value={contact.preferred_contact}
            onChange={(e) => upd({ preferred_contact: e.target.value as any })}
            className="mt-2 w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm rounded-sm"
          >
            <option value="either" className="bg-background">Either</option>
            <option value="email" className="bg-background">Email</option>
            <option value="phone" className="bg-background">Phone</option>
          </select>
        </div>
      </Grid>
      <div>
        <FieldLabel>Additional comments</FieldLabel>
        <textarea
          value={contact.additional_notes}
          onChange={(e) => upd({ additional_notes: e.target.value })}
          rows={3}
          maxLength={1000}
          className="mt-2 w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm rounded-sm"
        />
      </div>
    </div>
  );
}

// ---------------- Step: Review ----------------
function ReviewStep({ category, details, contact, files, onEdit }: { category: CategoryId; details: Record<string, any>; contact: ContactInfo; files: UploadedFile[]; onEdit: (s: StepId) => void }) {
  const cat = CATEGORIES.find((c) => c.id === category);
  const detailPairs = Object.entries(details).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== false);
  return (
    <div className="glass-panel grain p-5 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Selected service</div>
          <div className="text-lg font-display mt-1">{cat?.title}</div>
        </div>
        <button onClick={() => onEdit("service")} className="text-xs font-mono uppercase tracking-widest text-primary hover:underline">Change</button>
      </div>

      <ReviewGrid title="Project Details" onEdit={() => onEdit("details")} pairs={detailPairs} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Uploaded files ({files.length})</div>
          <button onClick={() => onEdit("details")} className="text-xs font-mono uppercase tracking-widest text-primary hover:underline">Edit</button>
        </div>
        {files.length === 0 ? (
          <div className="text-xs text-foreground/50">No files uploaded.</div>
        ) : (
          <ul className="text-xs text-foreground/80 space-y-1">
            {files.map((f) => (
              <li key={f.id} className="font-mono break-all">
                {f.file.name} <span className="text-foreground/40">· {(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReviewGrid title="Contact & Delivery" onEdit={() => onEdit("contact")} pairs={Object.entries(contact).filter(([, v]) => v !== "" && v !== undefined && v !== null)} />

      <div className="border border-primary/30 bg-primary/5 rounded-sm p-4 text-sm text-foreground/80">
        Your request will be reviewed by TOREO. You will receive a professional quotation after the technical review.
      </div>
    </div>
  );
}

function ReviewGrid({ title, onEdit, pairs }: { title: string; onEdit: () => void; pairs: [string, any][] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{title}</div>
        <button onClick={onEdit} className="text-xs font-mono uppercase tracking-widest text-primary hover:underline">Edit</button>
      </div>
      <dl className="text-sm grid gap-2 md:grid-cols-2">
        {pairs.length === 0 ? (
          <div className="text-xs text-foreground/50">—</div>
        ) : pairs.map(([k, v]) => (
          <div key={k} className="flex gap-3 border-b border-border/60 py-1.5">
            <dt className="text-foreground/50 text-xs min-w-[9rem]">{k.replace(/_/g, " ")}</dt>
            <dd className="text-foreground/90 text-sm break-words">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---------------- Submitted view ----------------
function SubmittedView({ orderCode, category }: { orderCode: string | null; category: CategoryId | null }) {
  const cat = CATEGORIES.find((c) => c.id === category);
  return (
    <div className="glass-panel grain p-6 md:p-10 max-w-2xl mx-auto space-y-6 text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-primary">// Received</div>
      <h2 className="font-display text-2xl md:text-3xl leading-tight">Your request has been received successfully.</h2>
      <p className="text-sm text-foreground/60">
        The TOREO team will review the technical information and contact you with the next steps.
      </p>
      {orderCode && (
        <div className="space-y-2 border-t border-border pt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Your Request ID</div>
          <div className="font-mono text-2xl md:text-3xl tracking-[0.15em] text-primary">{orderCode}</div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/70">
            {cat?.title ?? "Project Inquiry"}
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderCode && (
          <Link
            to="/track"
            search={{ code: orderCode } as never}
            className="inline-block font-mono text-xs uppercase tracking-[0.3em] bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:bg-primary/90 transition"
          >
            Track your request →
          </Link>
        )}
        <Link to="/portal" className="inline-block font-mono text-xs uppercase tracking-[0.3em] border border-border hover:border-primary text-foreground/80 px-6 py-3 rounded-sm">
          Customer portal
        </Link>
      </div>
    </div>
  );
}

// ---------------- Navigation bar ----------------
function NavBar({ step, onBack, onNext, submitting, canBack, isFinal }: { step: StepId; onBack: () => void; onNext: () => void; submitting: boolean; canBack: boolean; isFinal: boolean }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4 flex-wrap sticky bottom-4 z-20">
      <button
        type="button"
        onClick={onBack}
        disabled={!canBack || submitting}
        className="font-mono text-xs uppercase tracking-[0.3em] border border-border px-4 py-3 rounded-sm text-foreground/70 hover:text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={submitting}
        className="font-mono text-xs uppercase tracking-[0.3em] bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:bg-primary/90 transition disabled:opacity-50"
      >
        {submitting ? "Submitting…" : isFinal ? "Submit Request →" : "Continue →"}
      </button>
    </div>
  );
}

// ---------------- File upload ----------------
function FileArea({ files, setFiles }: { files: UploadedFile[]; setFiles: (f: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void }) {
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function add(list: FileList | null) {
    if (!list) return;
    setErr(null);
    const next: UploadedFile[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setErr(`${f.name} exceeds ${MAX_FILE_MB} MB.`);
        continue;
      }
      const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
      if (!ACCEPTED.split(",").includes(ext)) {
        setErr(`${f.name}: format not supported. Allowed: ${ACCEPTED}`);
        continue;
      }
      next.push({ file: f, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
    }
    if (next.length) setFiles((p) => [...p, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <FieldLabel>Files / drawings / photos</FieldLabel>
      <label className="mt-2 flex items-center justify-between gap-3 border border-dashed border-border hover:border-primary/60 px-4 py-3 cursor-pointer rounded-sm">
        <span className="font-mono text-xs text-muted-foreground">
          {ACCEPTED} · max {MAX_FILE_MB} MB each
        </span>
        <span className="font-mono text-[11px] tracking-[0.3em] text-primary">ADD FILES</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => add(e.target.files)}
        />
      </label>
      {err && <div className="mt-2 text-xs text-red-300 font-mono">{err}</div>}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {files.map((uf) => (
            <li key={uf.id} className="flex items-center justify-between gap-3 border border-border px-3 py-2 rounded-sm">
              <span className="font-mono text-xs text-foreground/80 break-all">
                {uf.file.name} <span className="text-foreground/40">· {(uf.file.size / 1024 / 1024).toFixed(2)} MB</span>
              </span>
              <button
                type="button"
                onClick={() => setFiles((p) => p.filter((x) => x.id !== uf.id))}
                className="text-xs font-mono uppercase tracking-widest text-red-300 hover:text-red-200"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------- Small inputs ----------------
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{children}</div>;
}
function Text({ label, name, values, onChange, placeholder, type = "text" }: any) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        name={name}
        type={type}
        value={values[name] ?? ""}
        onChange={(e) => onChange({ [name]: e.target.value })}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm rounded-sm"
      />
    </div>
  );
}
function TextCtl({ label, v, onChange, type = "text", placeholder, autoComplete }: any) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-2 w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm rounded-sm"
      />
    </div>
  );
}
function Select({ label, name, options, values, onChange }: any) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={values[name] ?? ""}
        onChange={(e) => onChange({ [name]: e.target.value })}
        className="mt-2 w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm rounded-sm"
      >
        <option value="" className="bg-background">— Select —</option>
        {options.map((o: string) => <option key={o} value={o} className="bg-background">{o}</option>)}
      </select>
    </div>
  );
}
function Check({ label, name, values, onChange }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={Boolean(values[name])}
        onChange={(e) => onChange({ [name]: e.target.checked })}
        className="peer sr-only"
      />
      <span className="h-4 w-4 border border-border peer-checked:bg-primary peer-checked:border-primary transition-colors flex-shrink-0 rounded-[2px]" />
      <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
    </label>
  );
}

// ---------------- Helpers ----------------
function buildFlags(category: CategoryId, d: Record<string, any>, files: UploadedFile[]): string[] {
  const f: string[] = [];
  if (d.material_unsure || d.material === "Not sure") f.push("material_review");
  if (d.dimensions_approximate) f.push("dimensions_approximate");
  if (d.needs_drawing || d.needs_design) f.push("design_required");
  if (d.needs_manufacturability) f.push("technical_review");
  if (d.sketch_only) f.push("sketch_only");
  if (d.bend_radius_unknown) f.push("bend_radius_unknown");
  if (category === "welding") {
    if (d.proc_laser) f.push("laser_cutting");
    if (d.proc_bending) f.push("bending");
    if (d.proc_welding) f.push("welding");
    if (d.proc_design) f.push("design_required");
    if (d.proc_assembly) f.push("assembly");
    if (d.proc_finishing) f.push("finishing");
  }
  if (category === "bending" && d.needs_laser) f.push("laser_cutting");
  if (category === "replacement") {
    if (d.needs_design) f.push("design_required");
    if (d.original_deliverable) f.push("original_deliverable");
    else if (d.have_photos_only) f.push("photos_only");
  }
  if (category === "design") f.push("design_required");
  if (files.length === 0 && category !== "design") f.push("no_files");
  return Array.from(new Set(f));
}

function buildMessage(category: CategoryId, d: Record<string, any>, c: ContactInfo): string {
  const parts: string[] = [];
  parts.push(`[${category.toUpperCase()}] ${d.project_name ?? ""}`.trim());
  if (d.description) parts.push(d.description);
  if (d.additional_notes) parts.push(`Notes: ${d.additional_notes}`);
  if (c.additional_notes) parts.push(`Customer comment: ${c.additional_notes}`);
  if (d.delivery_date) parts.push(`Delivery required by: ${d.delivery_date}`);
  return parts.filter(Boolean).join("\n\n").slice(0, 3800);
}

// keep zod import used
void z;
