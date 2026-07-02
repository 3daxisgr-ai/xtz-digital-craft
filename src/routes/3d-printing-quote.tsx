import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { z } from "zod";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { useI18n } from "@/components/xtz/i18n";
import { supabase } from "@/integrations/supabase/client";
import { submitForm } from "@/lib/api/submissions.functions";
import { runQuoteAnalysis } from "@/lib/api/factory.functions";
import { AIAnalysisCard } from "@/components/factory/AIAnalysisCard";
const ModelViewer = lazy(() => import("@/components/factory/ModelViewer"));


export const Route = createFileRoute("/3d-printing-quote")({
  head: () => ({
    meta: [
      { title: "Instant 3D Printing Services Quote — Rapid Prototyping | TOREO" },
      { name: "description", content: "Get an instant 3D printing services quote for rapid prototyping and custom parts manufacturing — pick your material, weight and print time for a price estimate from TOREO in Greece." },
      { name: "keywords", content: "3D printing services, 3D printing quote, rapid prototyping, custom parts manufacturing, PLA ABS PETG TPU PC, Greece" },
      { property: "og:title", content: "Instant 3D Printing Quote — Rapid Prototyping | TOREO" },
      { property: "og:description", content: "Configure material, weight and print time for an instant 3D printing services estimate from TOREO." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/3d-printing-quote" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Instant 3D Printing Quote | TOREO" },
      { name: "twitter:description", content: "Configure your part and get an instant 3D printing estimate from TOREO." },
    ],
    links: [
      { rel: "canonical", href: "https://www.toreo.gr/3d-printing-quote" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "3D Printing Services",
          serviceType: "3D Printing / Rapid Prototyping",
          provider: { "@type": "Organization", name: "TOREO", url: "https://www.toreo.gr" },
          areaServed: ["GR", "EU"],
          url: "https://www.toreo.gr/3d-printing-quote",
          offers: { "@type": "Offer", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
        }),
      },
    ],
  }),
  component: QuotePage,
});

type Material = {
  id: "PLA" | "ABS" | "PC" | "PETG" | "TPU";
  available: boolean;
  pricePerKg: number;
};

const MATERIALS: Material[] = [
  { id: "PLA", available: true, pricePerKg: 25 },
  { id: "ABS", available: true, pricePerKg: 30 },
  { id: "PETG", available: false, pricePerKg: 35 },
  { id: "TPU", available: false, pricePerKg: 45 },
  { id: "PC", available: false, pricePerKg: 70 },
];

// Machine wear: 1.00€ every 3 hours of print time.
const MACHINE_WEAR_PER_3H = 1.0;
const ELECTRICITY_PER_HOUR = 0.15;

const ACCEPTED_EXT = [".stl", ".step", ".stp", ".3mf", ".obj"];

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(4).max(40),
  notes: z.string().trim().max(2000).optional(),
});

function QuotePage() {
  const { t, lang } = useI18n();
  const isGR = lang === "GR";

  const [material, setMaterial] = useState<Material>(MATERIALS[0]);
  const [weight, setWeight] = useState(100);
  const [hours, setHours] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [sent, setSent] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const { materialCost, machineWearCost, electricityCost, estimatedPrice } = useMemo(() => {
    const mc = (weight / 1000) * material.pricePerKg;
    const mwc = (hours / 3) * MACHINE_WEAR_PER_3H;
    const ec = hours * ELECTRICITY_PER_HOUR;
    return { materialCost: mc, machineWearCost: mwc, electricityCost: ec, estimatedPrice: mc + mwc + ec };
  }, [weight, hours, material]);

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      notes: String(fd.get("notes") || ""),
    };
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `3dp/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("submission-files")
          .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;
        filePath = path;
        fileName = file.name;
      }

      const res = await submitForm({
        data: {
          source: "3d-printing-quote",
          name: data.name,
          email: data.email,
          phone: data.phone,
          material: material.id,
          weight_g: weight,
          print_hours: hours,
          estimated_price: Number(estimatedPrice.toFixed(2)),
          message: data.notes,
          file_path: filePath,
          file_name: fileName,
          metadata: {
            materialCost: Number(materialCost.toFixed(2)),
            machineWearCost: Number(machineWearCost.toFixed(2)),
            electricityCost: Number(electricityCost.toFixed(2)),
          },
        },
      });
      const code = (res as { order_code?: string | null })?.order_code ?? null;
      setOrderCode(code);
      setSubmittedEmail(data.email);
      setSent(true);
      if (code) {
        setAnalyzing(true);
        runQuoteAnalysis({ data: { order_code: code, email: data.email } })
          .then((a) => setAnalysis(a))
          .catch((e) => console.error("auto analysis failed", e))
          .finally(() => setAnalyzing(false));
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return setFile(null);
    const ok = ACCEPTED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      setError(isGR ? "Μη υποστηριζόμενος τύπος αρχείου." : "Unsupported file type.");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(f);
  };

  const L = {
    kicker: isGR ? "ΥΠΟΛΟΓΙΣΤΗΣ ΠΡΟΣΦΟΡΑΣ" : "Quote Calculator",
    title: isGR ? "Άμεση προσφορά για 3D εκτύπωση." : "Instant 3D printing quote.",
    intro: isGR
      ? "Επιλέξτε υλικό, βάρος και χρόνο εκτύπωσης για άμεσο εκτιμώμενο κόστος."
      : "Pick a material, weight and print time to get an instant estimate.",
    materialLabel: isGR ? "Υλικό" : "Material",
    available: isGR ? "ΔΙΑΘΕΣΙΜΟ" : "Available",
    oos: isGR ? "Εξαντλημένο" : "Out of Stock",
    weight: isGR ? "ΒΑΡΟΣ" : "Weight",
    printTime: isGR ? "ΧΡΟΝΟΣ ΕΚΤΥΠΩΣΗΣ" : "Print Time",
    grams: "g",
    hours: isGR ? "ώρες" : "hours",
    summary: isGR ? "Σύνοψη" : "Summary",
    materialCost: isGR ? "Κόστος υλικού" : "Material cost",
    machineWearCost: isGR ? "Φθορά μηχανής" : "Machine wear cost",
    electricityCost: isGR ? "Κόστος ρεύματος" : "Electricity cost",
    estimatedTotal: isGR ? "Εκτιμώμενο Σύνολο" : "Estimated Total",
    disclaimer: isGR
      ? "Μόνο εκτιμώμενη τιμή. Η τελική τιμή μπορεί να διαφέρει ανάλογα με τη γεωμετρία του μοντέλου, τα υλικά υποστήριξης, τις ρυθμίσεις εκτύπωσης και τις απαιτήσεις φινιρίσματος."
      : "Estimated price only. Final pricing may vary depending on model geometry, support material, print settings and post-processing requirements.",
    upload: isGR ? "ΑΝΕΒΆΣΤΕ ΤΟ ΑΡΧΕΙΟ ΣΑΣ" : "Upload your file",
    accepted: isGR ? "Αποδεκτά" : "Accepted",
    selectFile: isGR ? "Επιλέξτε αρχείο" : "Select file",
    yourInfo: isGR ? "ΤΑ ΣΤΟΙΧΕΙΑ ΣΑΣ" : "Your information",
    name: isGR ? "ΟΝΟΜΑ *" : "Name",
    email: "Email",
    phone: isGR ? "ΤΗΛΕΦΩΝΟ *" : "Phone",
    notes: isGR ? "ΣΗΜΕΙΩΣΕΙΣ" : "Notes",
    submit: isGR ? "Αίτημα Προσφοράς" : "Request Quote",
    sent: isGR
      ? "Ελήφθη. Μηχανικός θα απαντήσει εντός μίας εργάσιμης."
      : "Got it. An engineer will reply within one business day.",
    perKg: isGR ? "/ κιλό" : "/ kg",
  };

  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />

      <section className="relative min-h-screen w-full inox-surface pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 80% 30%, oklch(0.45 0.2 245 / 0.5), transparent 60%)" }}
        />
        <span className="absolute top-24 right-6 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">XYZ</span>

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">3DP /</span>
            <span className="h-px w-16 bg-primary" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">{isGR ? "ΥΠΟΛΟΓΙΣΤΗΣ ΠΡΟΣΦΟΡΑΣ" : L.kicker}</span>
          </div>
          <h1 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,6vw,5rem)] tracking-tighter mb-6 max-w-3xl">
            {L.title}
          </h1>
          <p className="text-foreground/60 max-w-xl mb-12">{L.intro}</p>

          {sent ? (
            <div className="glass-panel grain p-8 md:p-12 max-w-2xl space-y-6">
              <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-primary">// 200 OK</div>
              <p className="font-display text-2xl md:text-3xl leading-tight">
                {isGR ? "Το αίτημα προσφοράς υποβλήθηκε επιτυχώς." : "Quote Request Submitted Successfully"}
              </p>
              {orderCode ? (
                <>
                  <div className="border-t border-primary/20 pt-6">
                    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/50 mb-2">
                      {isGR ? "Κωδικός Παραγγελίας" : "Your Order ID"}
                    </div>
                    <div className="font-mono text-2xl md:text-3xl tracking-[0.15em] text-primary">{orderCode}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/50 mb-2">
                      {isGR ? "Τρέχουσα Κατάσταση" : "Current Status"}
                    </div>
                    <div className="font-mono text-sm uppercase tracking-[0.2em] text-foreground/90">
                      {isGR ? "Αναμονή Προσφοράς" : "Waiting for Quote"}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/60">{L.sent}</p>
                  <p className="text-sm text-foreground/60">
                    {isGR
                      ? "Παρακαλούμε φυλάξτε αυτόν τον κωδικό. Μπορείτε να τον χρησιμοποιήσετε για να παρακολουθήσετε το αίτημά σας."
                      : "Please keep this Order ID. You can use it to track your request or contact our team."}
                  </p>
                  <a
                    href={`/track?code=${encodeURIComponent(orderCode)}`}
                    className="inline-block font-mono text-xs uppercase tracking-[0.3em] bg-primary text-primary-foreground px-6 py-3 rounded hover:bg-primary/90 transition"
                  >
                    {isGR ? "Παρακολούθηση παραγγελίας →" : "Track your order →"}
                  </a>

                  {(file || analyzing || analysis) && (
                    <div className="grid md:grid-cols-2 gap-4 pt-6 border-t border-primary/10">
                      {file && (
                        <Suspense fallback={<div className="h-[280px] rounded-lg bg-white/[0.02] border border-white/10" />}>
                          <ModelViewer file={file} height={280} />
                        </Suspense>
                      )}
                      <div className={file ? "" : "md:col-span-2"}>
                        <AIAnalysisCard a={analysis} loading={analyzing && !analysis} />
                      </div>
                    </div>
                  )}
                  {submittedEmail && null}
                </>
              ) : (
                <p className="text-sm text-foreground/70">{L.sent}</p>
              )}
            </div>

          ) : (
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
              {/* Configurator */}
              <div className="glass-panel grain p-8 md:p-12 space-y-10">
                {/* Materials */}
                <div>
                  <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                    {L.materialLabel}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {MATERIALS.map((m) => {
                      const active = material.id === m.id;
                      const disabled = !m.available;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && setMaterial(m)}
                          className={`relative p-4 border text-left transition-all ${
                            disabled
                              ? "border-border/40 opacity-40 cursor-not-allowed bg-white/[0.01]"
                              : active
                              ? "border-primary bg-primary/10 text-primary blue-glow"
                              : "border-border hover:border-foreground/40 text-foreground"
                          }`}
                        >
                          <div className="font-display text-2xl font-bold mb-2">{m.id}</div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            {m.available ? L.available : L.oos}
                          </div>
                          {m.available && (
                            <div className={`font-mono text-xs mt-1 ${active ? "text-primary" : "text-foreground/70"}`}>
                              {m.pricePerKg}€ {L.perKg}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weight slider */}
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground">
                      {L.weight}
                    </span>
                    <span className="font-mono text-primary text-lg">{weight} {L.grams}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    step={10}
                    value={weight}
                    onChange={(e) => setWeight(+e.target.value)}
                    aria-label={`${L.weight} ${weight} ${L.grams}`}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1">
                    <span>0g</span>
                    <span>1000g</span>
                  </div>
                </div>

                {/* Print time slider */}
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground">
                      {L.printTime}
                    </span>
                    <span className="font-mono text-primary text-lg">{hours} {L.hours}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={hours}
                    onChange={(e) => setHours(+e.target.value)}
                    aria-label={`${L.printTime} ${hours} ${L.hours}`}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1">
                    <span>0h</span>
                    <span>100h</span>
                  </div>
                </div>

                {/* File upload */}
                <div>
                  <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                    {L.upload}
                  </div>
                  <label className="flex items-center justify-between gap-3 border border-dashed border-border hover:border-primary/60 px-4 py-3 cursor-pointer transition-colors">
                    <span className="font-mono text-xs text-muted-foreground truncate">
                      {file ? file.name : `${L.accepted}: ${ACCEPTED_EXT.join(" · ")}`}
                    </span>
                    <span className="font-mono text-[14px] tracking-[0.3em] text-primary">
                      {L.selectFile.toUpperCase()}
                    </span>
                    <input
                      type="file"
                      accept={ACCEPTED_EXT.join(",")}
                      className="hidden"
                      onChange={onFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Live summary */}
              <div className="relative">
                <div className="glass-panel grain p-8 md:p-10 h-full flex flex-col">
                  <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-muted-foreground">
                    {L.summary}
                  </div>

                  <dl className="space-y-3 mb-6 font-mono text-sm">
                    <Row k={L.materialLabel} v={material.id} />
                    <Row k={L.weight} v={`${weight} g`} />
                    <Row k={L.printTime} v={`${hours} ${L.hours}`} />
                  </dl>

                  <div className="border-t border-border pt-4 space-y-2 font-mono text-sm mb-6">
                    <Row k={L.materialCost} v={`€${materialCost.toFixed(2)}`} />
                    <Row k={L.machineWearCost} v={`€${machineWearCost.toFixed(2)}`} />
                    <Row k={L.electricityCost} v={`€${electricityCost.toFixed(2)}`} />
                  </div>

                  <div className="pt-2">
                    <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                      {L.estimatedTotal}
                    </div>
                    <div className="font-display text-5xl font-bold text-primary text-glow">
                      €{estimatedPrice.toFixed(2)}
                    </div>
                  </div>

                  <p className="mt-6 text-xs text-foreground/55 leading-relaxed border-t border-border/50 pt-4">
                    {L.disclaimer}
                  </p>
                </div>
              </div>

              {/* Customer info form spans full width */}
              <form onSubmit={onSubmit} className="lg:col-span-2 glass-panel grain p-8 md:p-12 grid lg:grid-cols-2 gap-x-10 gap-y-6">
                <div className="lg:col-span-2 font-mono text-[14px] uppercase tracking-[0.4em] text-primary/80 mb-2">
                  {L.yourInfo}
                </div>
                <Input name="name" label={L.name} required />
                <Input name="email" label={L.email} type="email" required />
                <Input name="phone" label={L.phone} required />
                <div className="lg:col-span-2">
                  <Label htmlFor="quote-notes">{L.notes}</Label>
                  <textarea
                    id="quote-notes"
                    name="notes"
                    rows={4}
                    maxLength={2000}
                    className="mt-3 w-full bg-transparent border border-border focus:border-primary outline-none px-4 py-3 font-sans text-sm resize-y transition-colors"
                  />
                </div>

                {/* Hidden quote snapshot fields */}
                <input type="hidden" name="material" value={material.id} />
                <input type="hidden" name="weight_g" value={weight} />
                <input type="hidden" name="hours" value={hours} />
                <input type="hidden" name="estimated_price" value={estimatedPrice.toFixed(2)} />
                <input type="hidden" name="filename" value={file?.name ?? ""} />

                {error && (
                  <div className="lg:col-span-2 font-mono text-xs text-destructive">// {error}</div>
                )}

                <div className="lg:col-span-2 pt-4 border-t border-border flex items-center justify-between gap-4 flex-wrap">
                  <span className="font-mono text-[12px] uppercase tracking-[0.3em] text-muted-foreground">
                    {material.id} · {weight}g · {hours}{isGR ? "ώ" : "h"} · €{estimatedPrice.toFixed(2)}
                    {file ? ` · ${file.name}` : ""}
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition blue-glow disabled:opacity-60"
                  >
                    {submitting ? "…" : `${L.submit} →`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground block"
    >
      {children}
    </label>
  );
}

function Input({ name, label, required, type = "text" }: { name: string; label: string; required?: boolean; type?: string }) {
  const id = `quote-${name}`;
  return (
    <div>
      <Label htmlFor={id}>{label}{required && <span className="text-primary"> *</span>}</Label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        maxLength={255}
        className="mt-3 w-full bg-transparent border-b border-border focus:border-primary outline-none px-1 py-2 font-sans text-base transition-colors"
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-foreground text-right">{v}</dd>
    </div>
  );
}
