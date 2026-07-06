import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { useI18n } from "@/components/xtz/i18n";
import { supabase } from "@/integrations/supabase/client";
import { submitForm } from "@/lib/api/submissions.functions";
import { runQuoteAnalysis, getPublicPrintingMaterials } from "@/lib/api/factory.functions";
import { AIAnalysisCard } from "@/components/factory/AIAnalysisCard";
const ModelViewer = lazy(() => import("@/components/factory/ModelViewer"));

export const Route = createFileRoute("/3d-printing-quote")({
  head: () => ({
    meta: [
      { title: "Instant 3D Printing Quote — Rapid Prototyping | TOREO" },
      { name: "description", content: "Upload your model, pick a material and purpose. TOREO prepares a preliminary quote automatically — final quote confirmed by our engineering team." },
      { name: "keywords", content: "3D printing services, 3D printing quote, rapid prototyping, custom parts, PLA ABS PETG TPU PC, Greece" },
      { property: "og:title", content: "Instant 3D Printing Quote — Rapid Prototyping | TOREO" },
      { property: "og:description", content: "Upload your model and describe what you need. Our engineering team handles the technical decisions." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.toreo.gr/3d-printing-quote" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Instant 3D Printing Quote | TOREO" },
      { name: "twitter:description", content: "Upload your model — our engineering team decides how to manufacture it." },
    ],
    links: [{ rel: "canonical", href: "https://www.toreo.gr/3d-printing-quote" }],
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

const ACCEPTED_EXT = [".stl", ".step", ".stp", ".3mf", ".obj"];

type ProductionMode = "prototype" | "durable" | "decorative";
type Timeline = "flexible" | "standard" | "urgent";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(4).max(40),
  notes: z.string().trim().max(2000).optional(),
});

function QuotePage() {
  const { lang } = useI18n();
  const isGR = lang === "GR";

  type MaterialStatus = "in_stock" | "low_stock" | "out_of_stock" | "disabled";
  const [materials, setMaterials] = useState<Array<{ code: string; name: string; family: string; in_stock: boolean; status: MaterialStatus }>>([]);

  const [materialCode, setMaterialCode] = useState<string>("PLA-BLK");
  const [purpose, setPurpose] = useState<ProductionMode>("prototype");
  const [timeline, setTimeline] = useState<Timeline>("standard");
  const [quantity, setQuantity] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [sent, setSent] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPublicPrintingMaterials()
      .then((rows) => {
        const list = rows as Array<{ code: string; name: string; family: string; in_stock: boolean; status: MaterialStatus }>;
        setMaterials(list);
        const selectable = list.filter((r) => r.status === "in_stock" || r.status === "low_stock");
        if (list.length && !selectable.find((r) => r.code === materialCode)) {
          const first = selectable.find((r) => r.status === "in_stock") ?? selectable[0];
          if (first) setMaterialCode(first.code);
        }
      })
      .catch((e) => console.error("materials load failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const selectedMaterial = useMemo(
    () => materials.find((m) => m.code === materialCode) ?? null,
    [materials, materialCode],
  );

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
    if (!file) {
      setError(isGR ? "Παρακαλώ ανεβάστε το αρχείο σας." : "Please upload your file.");
      return;
    }
    if (quantity < 1 || quantity > 999) {
      setError(isGR ? "Μη έγκυρη ποσότητα." : "Invalid quantity.");
      return;
    }
    if (selectedMaterial && (selectedMaterial.status === "out_of_stock" || selectedMaterial.status === "disabled")) {
      setError(isGR ? "Το επιλεγμένο υλικό δεν είναι διαθέσιμο." : "The selected material is not available.");
      return;
    }


    setSubmitting(true);
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `3dp/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("submission-files")
        .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;
      filePath = path;
      fileName = file.name;

      const materialLabel = selectedMaterial ? `${selectedMaterial.family} · ${selectedMaterial.name}` : materialCode;
      const res = await submitForm({
        data: {
          source: "3d-printing-quote",
          name: data.name,
          email: data.email,
          phone: data.phone,
          material: materialCode,
          quantity: String(quantity),
          service: "3d_printing",
          production_mode: purpose,
          timeline,
          message: data.notes,
          file_path: filePath,
          file_name: fileName,
          metadata: {
            material_label: materialLabel,
            production_mode: purpose,
            timeline,
            quantity,
          },
        },
      });
      const code = (res as { order_code?: string | null })?.order_code ?? null;
      setOrderCode(code);
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
    kicker: isGR ? "ΑΙΤΗΜΑ ΠΡΟΣΦΟΡΑΣ" : "Quote Request",
    title: isGR ? "Άμεση προσφορά για 3D εκτύπωση." : "Instant 3D printing quote.",
    intro: isGR
      ? "Ανεβάστε το μοντέλο σας και πείτε μας τι χρειάζεστε. Η μηχανική μας ομάδα θα αποφασίσει πώς θα κατασκευαστεί."
      : "Upload your model and tell us what you need. Our engineering team decides how to manufacture it.",
    upload: isGR ? "ΑΝΕΒΆΣΤΕ ΤΟ ΑΡΧΕΙΟ" : "Upload your file",
    accepted: isGR ? "Αποδεκτά" : "Accepted",
    selectFile: isGR ? "Επιλέξτε αρχείο" : "Select file",
    materialLabel: isGR ? "Υλικό" : "Material",
    purposeLabel: isGR ? "Σκοπός Χρήσης" : "Production Purpose",
    quantityLabel: isGR ? "Ποσότητα" : "Quantity",
    timelineLabel: isGR ? "Χρονοδιάγραμμα" : "Timeline",
    yourInfo: isGR ? "ΤΑ ΣΤΟΙΧΕΙΑ ΣΑΣ" : "Your information",
    name: isGR ? "Όνομα" : "Name",
    email: "Email",
    phone: isGR ? "Τηλέφωνο" : "Phone",
    notes: isGR ? "Σημειώσεις (προαιρετικά)" : "Notes (optional)",
    submit: isGR ? "Αποστολή αιτήματος" : "Submit request",
    sent: isGR
      ? "Ελήφθη. Η μηχανική ομάδα μας ετοιμάζει την προσφορά σας."
      : "Received. Our engineering team is preparing your quote.",
    inStock: isGR ? "Διαθέσιμο" : "In stock",
    lowStock: isGR ? "Χαμηλό απόθεμα" : "Low stock",
    oos: isGR ? "Εξαντλημένο" : "Out of stock",
    lowStockWarn: isGR
      ? "Περιορισμένη διαθεσιμότητα. Ο χρόνος παράδοσης ενδέχεται να επηρεαστεί."
      : "Limited availability. Delivery time may be affected.",
    oosWarn: isGR
      ? "Αυτό το υλικό δεν είναι διαθέσιμο αυτή τη στιγμή. Επιλέξτε άλλο υλικό ή επικοινωνήστε με την TOREO."
      : "This material is currently unavailable. Please choose another material or contact TOREO for a custom request.",
  };


  const purposes: Array<{ id: ProductionMode; title: string; blurb: string }> = [
    { id: "prototype", title: isGR ? "Πρωτότυπο" : "Prototype", blurb: isGR ? "Γρήγορο & οικονομικό. Για validation & fit test." : "Fast & economical. Concept validation & fit test." },
    { id: "durable", title: isGR ? "Λειτουργικό Εξάρτημα" : "Functional / Manufacturing Part", blurb: isGR ? "Για πραγματική χρήση. Προτεραιότητα στην αντοχή." : "For real-world use. Strength is the priority." },
    { id: "decorative", title: isGR ? "Διακοσμητικό / Παρουσίασης" : "Decorative / Display", blurb: isGR ? "Προτεραιότητα στην εμφάνιση & φινίρισμα." : "Priority on appearance & surface finish." },
  ];

  const timelines: Array<{ id: Timeline; title: string; blurb: string }> = [
    { id: "flexible", title: isGR ? "Ευέλικτο" : "Flexible", blurb: isGR ? "Χωρίς προθεσμία." : "No deadline." },
    { id: "standard", title: isGR ? "Κανονικό" : "Standard", blurb: isGR ? "Κανονική ουρά παραγωγής." : "Normal production queue." },
    { id: "urgent", title: isGR ? "Επείγον" : "Urgent", blurb: isGR ? "Υψηλή προτεραιότητα (ίσως προκύψει επιπλέον χρέωση)." : "Highest priority (a surcharge may apply)." },
  ];

  return (
    <main className="bg-black text-foreground min-h-screen">
      <Navigation />

      <section className="relative min-h-screen w-full inox-surface pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 80% 30%, oklch(0.45 0.2 245 / 0.5), transparent 60%)" }}
        />
        <span className="absolute top-24 right-6 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">XYZ</span>

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 md:px-12">
          <div className="flex items-center gap-4 mb-8">
            <span className="font-mono text-xs text-primary tracking-[0.3em]">3DP /</span>
            <span className="h-px w-16 bg-primary" />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">{L.kicker}</span>
          </div>
          <h1 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,6vw,5rem)] tracking-tighter mb-6 max-w-3xl">
            {L.title}
          </h1>
          <p className="text-foreground/60 max-w-2xl mb-12">{L.intro}</p>

          {sent ? (
            <div className="glass-panel grain p-8 md:p-12 max-w-2xl space-y-6">
              <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-primary">// 200 OK</div>
              <p className="font-display text-2xl md:text-3xl leading-tight">
                {isGR ? "Το αίτημα προσφοράς υποβλήθηκε επιτυχώς." : "Quote request submitted successfully."}
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
                      {isGR ? "Κατάσταση" : "Status"}
                    </div>
                    <div className="font-mono text-sm uppercase tracking-[0.2em] text-foreground/90">
                      {isGR ? "Σε αναθεώρηση από μηχανικό" : "Pending engineering review"}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/60">{L.sent}</p>
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
                        <AIAnalysisCard a={analysis} loading={analyzing && !analysis} customerView />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-foreground/70">{L.sent}</p>
              )}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
              {/* Left: file + choices */}
              <div className="glass-panel grain p-8 md:p-10 space-y-10">
                {/* Upload */}
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
                    <input type="file" accept={ACCEPTED_EXT.join(",")} className="hidden" onChange={onFileChange} />
                  </label>
                  {file && (
                    <div className="mt-3">
                      <Suspense fallback={<div className="h-[280px] rounded-lg bg-white/[0.02] border border-white/10" />}>
                        <ModelViewer file={file} height={280} />
                      </Suspense>
                    </div>
                  )}
                </div>

                {/* Material */}
                <div>
                  <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                    {L.materialLabel}
                  </div>
                  {materials.length === 0 ? (
                    <div className="font-mono text-xs text-muted-foreground">Loading materials…</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {materials.map((m) => {
                          const active = m.code === materialCode;
                          const isOOS = m.status === "out_of_stock";
                          const isLow = m.status === "low_stock";
                          const disabled = isOOS;
                          const dot = isOOS ? "bg-red-400" : isLow ? "bg-amber-400" : "bg-emerald-400";
                          const statusLabel = isOOS ? L.oos : isLow ? L.lowStock : L.inStock;
                          return (
                            <button
                              key={m.code}
                              type="button"
                              disabled={disabled}
                              aria-disabled={disabled}
                              onClick={() => !disabled && setMaterialCode(m.code)}
                              title={isOOS ? L.oosWarn : isLow ? L.lowStockWarn : undefined}
                              className={`relative p-3 border text-left transition-all ${
                                disabled
                                  ? "border-border/40 opacity-40 cursor-not-allowed bg-white/[0.01]"
                                  : active
                                    ? "border-primary bg-primary/10 text-primary blue-glow"
                                    : "border-border hover:border-foreground/40 text-foreground"
                              }`}
                            >
                              <div className="font-display text-lg font-bold">{m.family}</div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                                {m.name}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] opacity-80">
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
                                <span>{statusLabel}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {selectedMaterial?.status === "low_stock" && (
                        <div className="mt-3 border border-amber-400/30 bg-amber-400/5 text-amber-200 text-xs px-3 py-2 rounded">
                          {L.lowStockWarn}
                        </div>
                      )}
                      {selectedMaterial?.status === "out_of_stock" && (
                        <div className="mt-3 border border-red-400/30 bg-red-400/5 text-red-200 text-xs px-3 py-2 rounded">
                          {L.oosWarn}
                        </div>
                      )}
                    </>
                  )}
                </div>


                {/* Production Purpose */}
                <div>
                  <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                    {L.purposeLabel}
                  </div>
                  <div className="grid md:grid-cols-3 gap-2">
                    {purposes.map((p) => {
                      const active = purpose === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPurpose(p.id)}
                          className={`p-4 border text-left transition-all ${
                            active
                              ? "border-primary bg-primary/10 blue-glow"
                              : "border-border hover:border-foreground/40"
                          }`}
                        >
                          <div className={`font-display text-base font-semibold ${active ? "text-primary" : "text-foreground"}`}>{p.title}</div>
                          <div className="mt-1 text-xs text-foreground/60 leading-snug">{p.blurb}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity + Timeline */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                      {L.quantityLabel}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="px-3 py-2 border border-border font-mono hover:border-primary/60"
                        aria-label="decrease"
                      >−</button>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                        className="w-24 bg-transparent border border-border focus:border-primary text-center font-mono py-2 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                        className="px-3 py-2 border border-border font-mono hover:border-primary/60"
                        aria-label="increase"
                      >+</button>
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                      {L.timelineLabel}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {timelines.map((t) => {
                        const active = timeline === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTimeline(t.id)}
                            title={t.blurb}
                            className={`px-3 py-3 border text-center transition-all ${
                              active
                                ? "border-primary bg-primary/10 text-primary blue-glow"
                                : "border-border hover:border-foreground/40 text-foreground"
                            }`}
                          >
                            <div className="font-display text-sm font-semibold">{t.title}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-[11px] text-foreground/50 leading-snug">
                      {timelines.find((t) => t.id === timeline)?.blurb}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: your info */}
              <div className="glass-panel grain p-8 md:p-10 space-y-6">
                <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-primary/80">
                  {L.yourInfo}
                </div>
                <Input name="name" label={L.name} required />
                <Input name="email" label={L.email} type="email" required />
                <Input name="phone" label={L.phone} required />
                <div>
                  <Label htmlFor="quote-notes">{L.notes}</Label>
                  <textarea
                    id="quote-notes"
                    name="notes"
                    rows={4}
                    maxLength={2000}
                    className="mt-3 w-full bg-transparent border border-border focus:border-primary outline-none px-4 py-3 font-sans text-sm resize-y transition-colors"
                  />
                </div>

                <div className="border-t border-border pt-4 space-y-1.5 font-mono text-xs text-foreground/60">
                  <div>Material · <span className="text-foreground">{selectedMaterial ? `${selectedMaterial.family} — ${selectedMaterial.name}` : materialCode}</span></div>
                  <div>Purpose · <span className="text-foreground">{purposes.find((p) => p.id === purpose)?.title}</span></div>
                  <div>Quantity · <span className="text-foreground">{quantity}</span></div>
                  <div>Timeline · <span className="text-foreground">{timelines.find((t) => t.id === timeline)?.title}</span></div>
                  {file && <div>File · <span className="text-foreground truncate inline-block max-w-[200px] align-bottom">{file.name}</span></div>}
                </div>

                {error && <div className="font-mono text-xs text-destructive">// {error}</div>}

                <button
                  type="submit"
                  disabled={submitting || !file}
                  className="w-full px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition blue-glow disabled:opacity-50"
                >
                  {submitting ? "…" : `${L.submit} →`}
                </button>
                <p className="text-[11px] text-foreground/50 leading-relaxed">
                  {isGR
                    ? "Ένας μηχανικός θα σας απαντήσει εντός μίας εργάσιμης ημέρας. Δεν λαμβάνεται καμία χρέωση κατά την υποβολή."
                    : "An engineer will reply within one business day. No charge is made at submission."}
                </p>
              </div>
            </form>
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
