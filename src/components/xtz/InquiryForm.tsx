import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useI18n } from "./i18n";
import { supabase } from "@/integrations/supabase/client";
import { submitForm } from "@/lib/api/submissions.functions";

const services = [
  "Design & Prototype",
  "Fiber Laser Cutting",
  "Sheet Metal Forming",
  "Welding & Assembly",
  "3D Printing",
  "Custom Manufacturing",
];

const materials = [
  "Stainless Steel",
  "Aluminium",
  "Mild Steel",
  "Brass",
  "Titanium",
  "Acrylic",
  "Polymer (3D Print)",
  "Other / Advise",
];

const stages = [
  "Idea",
  "Design Ready",
  "Prototype Needed",
  "Production Needed",
];

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  surname: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(4).max(40),
  company: z.string().trim().max(120).optional(),
  service: z.string().min(1).max(80),
  material: z.string().max(80).optional(),
  stage: z.string().max(40).optional(),
  dimensions: z.string().max(120).optional(),
  quantity: z.string().max(40).optional(),
  description: z.string().trim().max(2000).optional(),
  noDesign: z.boolean().optional(),
  needHelp: z.boolean().optional(),
});

export function InquiryForm() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preselectedService, setPreselectedService] = useState<string>("");

  // Read ?service= from URL on mount to pre-fill the service type.
  // When set, the manual service selector is hidden so we don't ask twice.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = new URLSearchParams(window.location.search).get("service");
    if (s) setPreselectedService(s);
  }, []);





  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<File | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") || ""),
      surname: String(fd.get("surname") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      company: String(fd.get("company") || ""),
      service: String(fd.get("service") || ""),
      material: String(fd.get("material") || ""),
      stage: String(fd.get("stage") || ""),
      dimensions: String(fd.get("dimensions") || ""),
      quantity: String(fd.get("quantity") || ""),
      description: String(fd.get("description") || ""),
      noDesign: fd.get("noDesign") === "on",
      needHelp: fd.get("needHelp") === "on",
    };
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      const file = fileRef.current;
      let filePath: string | null = null;
      let fileName: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `inquiry/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("submission-files")
          .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;
        filePath = path;
        fileName = file.name;
      }

      const res = await submitForm({
        data: {
          source: "inquiry",
          name: data.name,
          surname: data.surname,
          email: data.email,
          phone: data.phone,
          company: data.company || null,
          service: data.service,
          material: data.material || null,
          stage: data.stage || null,
          dimensions: data.dimensions || null,
          quantity: data.quantity || null,
          message: data.description || null,
          file_path: filePath,
          file_name: fileName,
          metadata: {
            noDesign: data.noDesign,
            needHelp: data.needHelp,
          },
        },
      });
      setOrderCode((res as { order_code?: string | null })?.order_code ?? null);
      setSent(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="start-project" className="relative min-h-screen w-full inox-surface py-32 overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 50%, oklch(0.45 0.2 245 / 0.5), transparent 60%)" }} />
      <span className="absolute top-6 right-6 md:top-10 md:right-12 font-mono text-[14px] tracking-[0.4em] text-primary/60">XYZ</span>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="flex items-center gap-4 mb-8">
          <span className="font-mono text-xs text-primary tracking-[0.3em]">07 /</span>
          <span className="h-px w-16 bg-primary" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("inquiry.kicker")}</span>
        </div>
        <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,6vw,5rem)] tracking-tighter mb-6 max-w-3xl">
          {t("inquiry.title")}
        </h2>
        <p className="text-foreground/60 max-w-xl mb-12">{t("inquiry.intro")}</p>

        {sent ? (
          <div className="glass-panel grain p-8 md:p-12 max-w-2xl space-y-6">
            <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-primary">// 200 OK</div>
            <p className="font-display text-2xl md:text-3xl leading-tight">{t("f.sent")}</p>
            {orderCode ? (
              <>
                <div className="border-t border-primary/20 pt-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/50 mb-2">Your Order ID</div>
                  <div className="font-mono text-2xl md:text-3xl tracking-[0.15em] text-primary">{orderCode}</div>
                </div>
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/50 mb-2">Current Status</div>
                  <div className="font-mono text-sm uppercase tracking-[0.2em] text-foreground/90">Waiting for Quote</div>
                </div>
                <p className="text-sm text-foreground/60">
                  Please keep this Order ID. You can use it to track your request or contact our team.
                </p>
                <a
                  href={`/track?code=${encodeURIComponent(orderCode)}`}
                  className="inline-block font-mono text-xs uppercase tracking-[0.3em] bg-primary text-primary-foreground px-6 py-3 rounded hover:bg-primary/90 transition"
                >
                  Track your order →
                </a>
              </>
            ) : null}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="glass-panel grain p-8 md:p-12 grid lg:grid-cols-2 gap-x-10 gap-y-8 max-w-5xl">
            <Input name="name" label={t("f.name")} required />
            <Input name="surname" label={t("f.surname")} required />
            <Input name="email" label={t("f.email")} type="email" required />
            <Input name="phone" label={t("f.phone")} required />
            <Input name="company" label={t("f.company")} />
            <FileInput name="file" label={t("f.upload")} onFileChange={(f) => { fileRef.current = f; }} />

            {preselectedService ? (
              <div>
                <Label>{t("f.service")}</Label>
                <div className="mt-3 flex items-center justify-between gap-3 border border-primary/40 bg-primary/5 px-4 py-2.5">
                  <span className="font-sans text-base text-foreground">{preselectedService}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">SELECTED</span>
                </div>
                <input type="hidden" name="service" value={preselectedService} />
              </div>
            ) : (
              <Select name="service" label={t("f.service")} options={services} placeholder={t("f.select")} required />
            )}
            <Select name="material" label={t("f.material")} options={materials} placeholder={t("f.select")} />
            <Select name="stage" label={t("f.stage")} options={stages} placeholder={t("f.select")} />
            <Input name="dimensions" label={t("f.dimensions")} placeholder="e.g. 1200 × 800 × 4 mm" />
            <Input name="quantity" label={t("f.quantity")} placeholder="1" />

            <div className="lg:col-span-2 space-y-3 pt-2">
              <Check name="noDesign" label={t("f.help1")} />
              <Check name="needHelp" label={t("f.help2")} />
            </div>

            <div className="lg:col-span-2">
              <Label>{t("f.desc")}</Label>
              <textarea
                name="description"
                placeholder={t("f.desc.ph")}
                rows={6}
                maxLength={2000}
                className="mt-3 w-full bg-transparent border border-border focus:border-primary outline-none px-4 py-3 font-sans text-sm resize-y transition-colors"
              />
            </div>

            {error && (
              <div className="lg:col-span-2 font-mono text-xs text-destructive">// {error}</div>
            )}

            <div className="lg:col-span-2 pt-4 border-t border-border flex items-center justify-between gap-4">
              <span className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground">
                {t("f.review")}
              </span>
              <button
                type="submit"
                className="px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition blue-glow"
              >
                {t("f.submit")}&nbsp;→
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground">
      {children}
    </div>
  );
}

function Input({ name, label, required, type = "text", placeholder }: { name: string; label: string; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={255}
        placeholder={placeholder}
        className="mt-3 w-full bg-transparent border-b border-border focus:border-primary outline-none px-1 py-2 font-sans text-base transition-colors"
      />
    </div>
  );
}

function FileInput({ name, label, onFileChange }: { name: string; label: string; onFileChange?: (f: File | null) => void }) {
  const [fname, setFname] = useState<string>("");
  return (
    <div>
      <Label>{label}</Label>
      <label className="mt-3 flex items-center justify-between gap-3 border border-dashed border-border hover:border-primary/60 px-4 py-2.5 cursor-pointer transition-colors">
        <span className="font-mono text-xs text-muted-foreground truncate">{fname || ".dwg · .step · .stl · .pdf"}</span>
        <span className="font-mono text-[14px] tracking-[0.3em] text-primary">SELECT</span>
        <input
          name={name}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFname(f?.name ?? "");
            onFileChange?.(f);
          }}
        />
      </label>
    </div>
  );
}

function Select({ name, label, options, placeholder, required }: { name: string; label: string; options: string[]; placeholder: string; required?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="mt-3 w-full bg-transparent border-b border-border focus:border-primary outline-none px-1 py-2 font-sans text-base transition-colors"
      >
        <option value="" disabled className="bg-background">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-background">{o}</option>
        ))}
      </select>
    </div>
  );
}

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input type="checkbox" name={name} className="peer sr-only" />
      <span className="h-4 w-4 border border-border peer-checked:bg-primary peer-checked:border-primary transition-colors flex-shrink-0" />
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </label>
  );
}
