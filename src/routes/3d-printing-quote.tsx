import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Navigation } from "@/components/xtz/Navigation";
import { Footer } from "@/components/xtz/Footer";
import { useI18n } from "@/components/xtz/i18n";

export const Route = createFileRoute("/3d-printing-quote")({
  head: () => ({
    meta: [
      { title: "3D Printing Quote — SKG3D" },
      { name: "description", content: "Instant 3D printing quote. Pick your material, weight and print time — get an estimated price in seconds." },
      { property: "og:title", content: "3D Printing Quote — SKG3D" },
      { property: "og:description", content: "Configure material, weight and print time to get an instant 3D printing estimate." },
      { property: "og:url", content: "https://xtz-digital-craft.lovable.app/3d-printing-quote" },
    ],
    links: [
      { rel: "canonical", href: "https://xtz-digital-craft.lovable.app/3d-printing-quote" },
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
  const [error, setError] = useState<string | null>(null);

  const { materialCost, machineWearCost, electricityCost, estimatedPrice } = useMemo(() => {
    const mc = (weight / 1000) * material.pricePerKg;
    const mwc = (hours / 3) * MACHINE_WEAR_PER_3H;
    const ec = hours * ELECTRICITY_PER_HOUR;
    return { materialCost: mc, machineWearCost: mwc, electricityCost: ec, estimatedPrice: mc + mwc + ec };
  }, [weight, hours, material]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
    // The file (if any) is captured in `file` state and would be attached
    // to the inquiry payload by a backend handler.
    setSent(true);
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
    kicker: isGR ? "Υπολογιστής Προσφοράς" : "Quote Calculator",
    title: isGR ? "Άμεση προσφορά για 3D εκτύπωση." : "Instant 3D printing quote.",
    intro: isGR
      ? "Επιλέξτε υλικό, βάρος και χρόνο εκτύπωσης για άμεσο εκτιμώμενο κόστος."
      : "Pick a material, weight and print time to get an instant estimate.",
    materialLabel: isGR ? "Υλικό" : "Material",
    available: isGR ? "Διαθέσιμο" : "Available",
    oos: isGR ? "Εξαντλημένο" : "Out of Stock",
    weight: isGR ? "Βάρος" : "Weight",
    printTime: isGR ? "Χρόνος Εκτύπωσης" : "Print Time",
    grams: "g",
    hours: isGR ? "ώρες" : "hours",
    summary: isGR ? "Σύνοψη" : "Summary",
    materialCost: isGR ? "Κόστος υλικού" : "Material cost",
    timeCost: isGR ? "Φθορά μηχανής" : "Machine wear cost",
    estimated: isGR ? "Εκτιμώμενη Τιμή" : "Estimated Price",
    disclaimer: isGR
      ? "Μόνο εκτιμώμενη τιμή. Αυτή η τιμή αφορά μόνο την εκτύπωση και όχι τη σχεδίαση ή τον χρόνο μας."
      : "Estimated price only. This price is only for the printing not the design or our time",
    upload: isGR ? "Ανεβάστε το αρχείο σας" : "Upload your file",
    accepted: isGR ? "Αποδεκτά" : "Accepted",
    selectFile: isGR ? "Επιλέξτε αρχείο" : "Select file",
    yourInfo: isGR ? "Τα στοιχεία σας" : "Your information",
    name: isGR ? "Όνομα" : "Name",
    email: "Email",
    phone: isGR ? "Τηλέφωνο" : "Phone",
    notes: isGR ? "Σημειώσεις" : "Notes",
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
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">{L.kicker}</span>
          </div>
          <h1 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,6vw,5rem)] tracking-tighter mb-6 max-w-3xl">
            {L.title}
          </h1>
          <p className="text-foreground/60 max-w-xl mb-12">{L.intro}</p>

          {sent ? (
            <div className="glass-panel grain p-12 max-w-2xl">
              <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-primary mb-4">// 200 OK</div>
              <p className="font-display text-2xl md:text-3xl leading-tight">{L.sent}</p>
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
                    <Row k={L.timeCost} v={`€${timeCost.toFixed(2)}`} />
                  </div>

                  <div className="pt-2">
                    <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                      {L.estimated}
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
                  <Label>{L.notes}</Label>
                  <textarea
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
                    className="px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition blue-glow"
                  >
                    {L.submit} →
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground">
      {children}
    </div>
  );
}

function Input({ name, label, required, type = "text" }: { name: string; label: string; required?: boolean; type?: string }) {
  return (
    <div>
      <Label>{label}{required && <span className="text-primary"> *</span>}</Label>
      <input
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
