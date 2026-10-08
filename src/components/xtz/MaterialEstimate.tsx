import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { estimateMaterial, listSheetOptions } from "@/lib/api/material-estimate.functions";
import type { CustomerEstimateDTO } from "@/lib/material-estimate";

export const MATERIAL_ESTIMATE_DISCLAIMER =
  "Η τιμή είναι ενδεικτική και αφορά αποκλειστικά το υλικό. Δεν περιλαμβάνει εργασία, κοπή, κάμψη, συγκόλληση, κατεργασία, φινίρισμα, μεταφορά ή άλλες εργασίες. Η τελική τιμή θα καθοριστεί στην επίσημη προσφορά.";

type Opt = { code: string; label: string; thickness_mm: number | null; finish: string | null };

const field = "mt-2 w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm rounded-sm";
const lbl = "font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground";

export function MaterialEstimateInputs({ values, onChange }: { values: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const list = useServerFn(listSheetOptions);
  const [opts, setOpts] = useState<Opt[]>([]);
  useEffect(() => { list().then((r) => setOpts(r as Opt[])).catch(() => setOpts([])); }, []); // eslint-disable-line
  const groups = Array.from(new Set(opts.map((o) => o.label)));
  const group = values.me_group ?? "";
  const thicknesses = opts.filter((o) => o.label === group);
  return (
    <div className="glass-panel grain p-5 md:p-8 mt-6 space-y-4">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Ενδεικτική τιμή υλικού</div>
        <p className="text-xs text-foreground/60 mt-1">Προαιρετικό — συμπληρώστε ό,τι γνωρίζετε για να δείτε ενδεικτικό κόστος υλικού στο τελευταίο βήμα.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block"><span className={lbl}>Υλικό</span>
          <select className={field} value={group} onChange={(e) => onChange({ me_group: e.target.value, me_material_code: "", me_thickness_mm: "" })}>
            <option value="">— Επιλέξτε —</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
            <option value="other">Άλλο υλικό / Δεν ξέρω</option>
          </select>
        </label>
        {group === "other" ? (
          <label className="block"><span className={lbl}>Περιγραφή υλικού (αν γνωρίζετε)</span>
            <input className={field} value={values.me_other_material ?? ""} maxLength={120} onChange={(e) => onChange({ me_other_material: e.target.value })} placeholder="π.χ. γαλβανιζέ, αλουμίνιο…" />
          </label>
        ) : (
          <label className="block"><span className={lbl}>Πάχος (mm)</span>
            <select className={field} value={values.me_material_code ?? ""} disabled={!group} onChange={(e) => {
              const o = opts.find((x) => x.code === e.target.value);
              onChange({ me_material_code: e.target.value, me_thickness_mm: o?.thickness_mm ?? "" });
            }}>
              <option value="">{group ? "— Επιλέξτε πάχος —" : "Επιλέξτε πρώτα υλικό"}</option>
              {thicknesses.map((o) => <option key={o.code} value={o.code}>{o.thickness_mm} mm{o.finish ? ` · ${o.finish}` : ""}</option>)}
            </select>
          </label>
        )}
        {group === "other" && (
          <label className="block"><span className={lbl}>Πάχος (mm, αν γνωρίζετε)</span>
            <input type="number" step="0.1" min={0.3} max={30} className={field} value={values.me_thickness_mm ?? ""} onChange={(e) => onChange({ me_thickness_mm: e.target.value })} />
          </label>
        )}
        <label className="block"><span className={lbl}>Πλάτος τεμαχίου (mm)</span>
          <input type="number" min={1} max={6000} className={field} value={values.me_width_mm ?? ""} onChange={(e) => onChange({ me_width_mm: e.target.value })} />
        </label>
        <label className="block"><span className={lbl}>Μήκος τεμαχίου (mm)</span>
          <input type="number" min={1} max={6000} className={field} value={values.me_length_mm ?? ""} onChange={(e) => onChange({ me_length_mm: e.target.value })} />
        </label>
        <label className="block"><span className={lbl}>Ποσότητα τεμαχίων</span>
          <input type="number" min={1} max={10000} className={field} value={values.me_quantity ?? ""} onChange={(e) => onChange({ me_quantity: e.target.value })} />
        </label>
      </div>
      <label className="block"><span className={lbl}>Σύντομη περιγραφή κατασκευής</span>
        <textarea rows={2} maxLength={3000} className={field} value={values.me_description ?? ""} onChange={(e) => onChange({ me_description: e.target.value })} placeholder="π.χ. κουτί 300×200×100 mm με καπάκι, ανοξείδωτο" />
      </label>
      <p className="text-[11px] text-foreground/50">Αν ανεβάσετε σχέδιο (DXF/PDF), θα αξιοποιηθεί για την εκτίμηση.</p>
    </div>
  );
}

/** Reads DXF text and returns the outer bounding box in drawing units (assumed mm). */
async function dxfBBox(file: File): Promise<{ width_mm: number; length_mm: number } | null> {
  if (!/\.dxf$/i.test(file.name) || file.size > 15 * 1024 * 1024) return null;
  try {
    const lines = (await file.text()).split(/\r?\n/).map((l) => l.trim());
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let inEntities = false;
    for (let i = 0; i < lines.length - 1; i += 2) {
      const code = lines[i], val = lines[i + 1];
      if (code === "2" && val === "ENTITIES") inEntities = true;
      if (code === "0" && val === "ENDSEC") inEntities = false;
      if (!inEntities) continue;
      const n = Number(val);
      if (!Number.isFinite(n)) continue;
      if (code === "10" || code === "11") { minX = Math.min(minX, n); maxX = Math.max(maxX, n); }
      if (code === "20" || code === "21") { minY = Math.min(minY, n); maxY = Math.max(maxY, n); }
    }
    const w = maxX - minX, h = maxY - minY;
    if (!(w > 1 && h > 1 && w < 6000 && h < 6000)) return null;
    return { width_mm: Math.round(Math.min(w, h)), length_mm: Math.round(Math.max(w, h)) };
  } catch { return null; }
}

/** Browser-only: downscaled JPEG for images, raw data URL for small PDFs. Null when not analyzable. */
export async function fileToAttachment(file: File): Promise<{ name: string; mime: "image/jpeg" | "application/pdf"; data_url: string } | null> {
  try {
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      if (file.size > 2_000_000) return null;
      const data_url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
      return { name: file.name, mime: "application/pdf", data_url: data_url.replace(/^data:[^;]*;/, "data:application/pdf;") };
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return null;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return { name: file.name, mime: "image/jpeg", data_url: c.toDataURL("image/jpeg", 0.8) };
  } catch { return null; }
}

/** First positive number in free text like "0.8 mm" or "2 τεμ." */
export function firstNum(v: unknown): number | null {
  const m = String(v ?? "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  const x = m ? Number(m[0]) : NaN;
  return Number.isFinite(x) && x > 0 ? x : null;
}
/** "1000x2000", "1000 × 2000 mm", "300*200*100" → numbers (2 or 3), else null. */
export function parseDims(v: unknown): number[] | null {
  const parts = String(v ?? "").toLowerCase().replace(/,/g, ".").split(/\s*[x×*]\s*/).map((p) => firstNum(p));
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => p == null)) return null;
  return parts as number[];
}

const n = (v: unknown) => { const x = Number(v); return v !== "" && v != null && Number.isFinite(x) && x > 0 ? x : null; };
const eur = (v: number) => `€${v.toLocaleString("el-GR")}`;

export function MaterialEstimateCard({ service, details, files, onEstimate, designInputType = null }: {
  designInputType?: "file" | "photo" | "ai_design" | null;
  service: string; details: Record<string, any>; files: File[]; onEstimate: (id: string | null, dto: CustomerEstimateDTO | null) => void;
}) {
  const run = useServerFn(estimateMaterial);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [dto, setDto] = useState<CustomerEstimateDTO | null>(null);
  const key = JSON.stringify([details.me_material_code, details.me_other_material, details.me_thickness_mm, details.me_width_mm, details.me_length_mm, details.me_quantity, details.me_description, files.map((f) => f.name + f.size), designInputType]);

  useEffect(() => {
    let alive = true;
    setState("loading");
    (async () => {
      let bbox: { width_mm: number; length_mm: number } | null = null;
      for (const f of files) { bbox = await dxfBBox(f); if (bbox) break; }
      const attachments: NonNullable<Awaited<ReturnType<typeof fileToAttachment>>>[] = [];
      if (designInputType !== "ai_design") {
        for (const f of files) { if (attachments.length >= 3) break; const a = await fileToAttachment(f); if (a) attachments.push(a); }
      }
      const desc = [details.me_description, details.overall_dimensions ? `Συνολικές διαστάσεις: ${details.overall_dimensions}` : null, details.di_description, details.di_dimensions ? `Διαστάσεις πελάτη: ${details.di_dimensions}` : null, details.description, details.project_description, details.part_description].filter(Boolean).join("\n").slice(0, 3000);
      // Fall back to the main form fields when the optional estimate section is left empty.
      const t = n(details.me_thickness_mm) ?? firstNum(details.material_thickness);
      const q = n(details.me_quantity) ?? firstNum(details.quantity);
      const dims = parseDims(details.overall_dimensions) ?? parseDims(details.di_dimensions);
      const w = n(details.me_width_mm) ?? (dims && dims.length === 2 ? Math.min(dims[0], dims[1]) : null);
      const l = n(details.me_length_mm) ?? (dims && dims.length === 2 ? Math.max(dims[0], dims[1]) : null);
      const r = await run({ data: {
        service,
        material_code: details.me_group === "other" ? "other" : (details.me_material_code || null),
        other_material: details.me_other_material || (typeof details.material === "string" ? details.material : null) || null,
        thickness_mm: t != null && t >= 0.3 && t <= 30 ? t : null,
        width_mm: w != null && w <= 6000 ? w : null, length_mm: l != null && l <= 6000 ? l : null,
        quantity: q != null ? Math.min(10000, Math.floor(q)) : null,
        description: desc || null,
        file_names: files.map((f) => f.name).slice(0, 20),
        drawing_bbox: bbox,
        design_input_type: designInputType,
        attachments,
      } }).catch(() => ({ ok: false as const }));
      if (!alive) return;
      if ((r as any).ok && (r as any).estimate) { setDto((r as any).estimate); setState("done"); onEstimate((r as any).estimate_id, (r as any).estimate); }
      else { setState("error"); onEstimate(null, null); }
    })();
    return () => { alive = false; };
  }, [key]); // eslint-disable-line

  return (
    <div className="border border-primary/50 bg-primary/5 rounded-sm p-5 md:p-6 space-y-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Ενδεικτική τιμή υλικού</div>
      {state === "loading" && <div className="text-sm text-foreground/60 animate-pulse">Υπολογισμός εκτίμησης υλικού…</div>}
      {state === "error" && <div className="text-sm text-foreground/70">Η ενδεικτική τιμή υλικού δεν είναι διαθέσιμη αυτή τη στιγμή. Το αίτημά σας θα υποβληθεί κανονικά και η τιμή θα περιληφθεί στην επίσημη προσφορά.</div>}
      {state === "done" && dto && !["exact", "range", "unpriced", "needs_info"].includes(dto.mode) && (
        <div className="text-sm text-foreground/80">Η ενδεικτική τιμή υλικού θα περιληφθεί στην επίσημη προσφορά.</div>
      )}
      {state === "done" && !dto && <div className="text-sm text-foreground/70">Η ενδεικτική τιμή υλικού δεν είναι διαθέσιμη αυτή τη στιγμή. Το αίτημά σας θα υποβληθεί κανονικά και η τιμή θα περιληφθεί στην επίσημη προσφορά.</div>}
      {state === "done" && dto && (
        <>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <Item k="Υλικό" v={dto.material_label ?? "Προς επιβεβαίωση"} />
            <Item k="Πάχος" v={dto.thickness_mm ? `${dto.thickness_mm} mm` : "—"} />
            <Item k="Ποσότητα" v={`${dto.quantity} τεμ.`} />
            <Item k="Εκτιμώμενο συνολικό βάρος" v={dto.kg_min != null && dto.kg_max != null ? `${dto.kg_min} – ${dto.kg_max} kg` : dto.kg != null ? `${dto.kg} kg` : "—"} />
          </dl>
          <div className="border-t border-border pt-4">
            {(dto.mode === "exact" || dto.mode === "range") && dto.price == null && dto.price_min == null && <div className="text-sm text-foreground/80">Η τιμή υλικού θα περιληφθεί στην επίσημη προσφορά.</div>}
            {dto.mode === "exact" && dto.price != null && <div className="font-display text-4xl font-bold text-primary">{eur(dto.price)}</div>}
            {dto.mode === "range" && dto.price_min != null && <div className="font-display text-3xl md:text-4xl font-bold text-primary">{eur(dto.price_min)} – {eur(dto.price_max!)}</div>}
            {(dto.mode === "exact" || dto.mode === "range") && <div className="text-[11px] font-mono text-foreground/50 mt-1">ενδεικτικά, μόνο υλικό, χωρίς ΦΠΑ</div>}
            {dto.mode === "unpriced" && <div className="text-sm text-foreground/80">Για το συγκεκριμένο υλικό η τιμή υλικού θα περιληφθεί στην επίσημη προσφορά.</div>}
            {dto.mode === "needs_info" && (
              <div className="text-sm text-foreground/80">
                Για ενδεικτική τιμή χρειαζόμαστε:
                <ul className="list-disc ml-5 mt-1">{(dto.missing.length ? dto.missing : ["Διαστάσεις και πάχος τεμαχίου"]).map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
          </div>
          {dto.is_assumption && (dto.mode === "exact" || dto.mode === "range") && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-amber-300/90">Βασισμένο σε ενδεικτική γεωμετρική παραδοχή — όχι τελικό σχέδιο.</div>
              {dto.draft && <DraftSketch w={dto.draft.width_mm} l={dto.draft.length_mm} t={dto.thickness_mm} />}
              {dto.geometry_note && <div className="text-xs text-foreground/70">{dto.geometry_note}</div>}
            </div>
          )}
          {dto.notes.length > 0 && <ul className="text-xs text-foreground/60 list-disc ml-5 space-y-0.5">{dto.notes.map((x) => <li key={x}>{x}</li>)}</ul>}
        </>
      )}
      <p className="text-xs text-foreground/70 border-t border-border pt-3">{MATERIAL_ESTIMATE_DISCLAIMER}</p>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return <div className="flex flex-col"><dt className="text-[10px] font-mono uppercase tracking-[0.25em] text-foreground/50">{k}</dt><dd className="text-foreground/90">{v}</dd></div>;
}

function DraftSketch({ w, l, t }: { w: number; l: number; t: number | null }) {
  const W = 240, H = 140;
  const s = Math.min((W - 60) / l, (H - 40) / w);
  const rw = Math.max(10, l * s), rh = Math.max(10, w * s);
  const x = (W - rw) / 2, y = (H - rh) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm text-primary" role="img" aria-label={`Ενδεικτικό ανάπτυγμα ${w}×${l} mm`}>
      <rect x={x} y={y} width={rw} height={rh} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeDasharray="4 3" />
      <text x={W / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="monospace">{l} mm</text>
      <text x={x + rw + 6} y={H / 2} fontSize="10" fill="currentColor" fontFamily="monospace">{w} mm</text>
      {t && <text x={W / 2} y={y + rh + 14} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity={0.7} fontFamily="monospace">t = {t} mm · ενδεικτικό</text>}
    </svg>
  );
}
