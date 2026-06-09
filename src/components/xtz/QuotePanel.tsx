import { useMemo, useState } from "react";

const materials = ["Stainless Steel", "Aluminium", "Brass", "Titanium", "Acrylic", "Carbon Fiber"];
const thicknesses = ["1 mm", "2 mm", "4 mm", "6 mm", "10 mm", "20 mm"];

export function QuotePanel() {
  const [material, setMaterial] = useState(materials[0]);
  const [thickness, setThickness] = useState(thicknesses[2]);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [qty, setQty] = useState(1);

  const estimate = useMemo(() => {
    const base = { "Stainless Steel": 0.18, Aluminium: 0.12, Brass: 0.32, Titanium: 0.65, Acrylic: 0.08, "Carbon Fiber": 0.55 }[material]!;
    const t = parseInt(thickness);
    const area = (width * height) / 1_000_000;
    return Math.round(area * t * base * 240 * qty);
  }, [material, thickness, width, height, qty]);

  return (
    <section id="quote" className="relative min-h-screen w-full inox-surface py-32 overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 50%, oklch(0.45 0.2 245 / 0.5), transparent 60%)" }} />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="flex items-center gap-4 mb-8">
          <span className="font-mono text-xs text-primary tracking-[0.3em]">06 /</span>
          <span className="h-px w-16 bg-primary" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Control Panel</span>
        </div>
        <h2 className="font-display font-bold leading-[0.9] text-[clamp(2.5rem,6vw,5rem)] tracking-tighter mb-16 max-w-3xl">
          Configure your project.
        </h2>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* Control panel */}
          <div className="glass-panel grain p-8 md:p-12 relative">
            <div className="absolute top-4 right-4 flex items-center gap-2 font-mono text-[14px] uppercase tracking-[0.3em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary blue-glow animate-pulse-glow" /> System Online
            </div>

            <div className="space-y-10">
              <Field label="Material">
                <div className="grid grid-cols-3 gap-2">
                  {materials.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMaterial(m)}
                      className={`px-3 py-3 text-xs font-mono uppercase tracking-wider border transition-all ${
                        material === m
                          ? "border-primary bg-primary/10 text-primary blue-glow"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Thickness">
                <div className="grid grid-cols-6 gap-2">
                  {thicknesses.map((t) => (
                    <button
                      key={t}
                      onClick={() => setThickness(t)}
                      className={`py-3 text-xs font-mono border transition-all ${
                        thickness === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-6">
                <Field label={`Width · ${width}mm`}>
                  <Slider value={width} min={100} max={2400} step={10} onChange={setWidth} ariaLabel={`Width in millimetres, currently ${width}`} />
                </Field>
                <Field label={`Height · ${height}mm`}>
                  <Slider value={height} min={100} max={1500} step={10} onChange={setHeight} ariaLabel={`Height in millimetres, currently ${height}`} />
                </Field>
              </div>

              <Field label="Quantity">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="h-10 w-10 border border-border font-mono hover:border-primary hover:text-primary transition"
                  >−</button>
                  <div className="flex-1 text-center font-mono text-2xl text-primary">{qty}</div>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="h-10 w-10 border border-border font-mono hover:border-primary hover:text-primary transition"
                  >+</button>
                </div>
              </Field>
            </div>
          </div>

          {/* Live readout */}
          <div className="relative">
            <div className="glass-panel grain p-8 md:p-12 h-full flex flex-col">
              <div className="font-mono text-[14px] uppercase tracking-[0.4em] text-muted-foreground mb-6">
                Live Summary
              </div>

              <div className="relative aspect-[4/3] brushed-metal border border-border mb-8 flex items-center justify-center overflow-hidden">
                <div
                  className="border border-primary/60 blue-glow relative"
                  style={{
                    width: `${Math.min(85, (width / 2400) * 85)}%`,
                    height: `${Math.min(85, (height / 1500) * 85)}%`,
                    transition: "all 0.3s ease",
                  }}
                >
                  <span className="absolute -top-5 left-0 font-mono text-[14px] text-primary">{width}mm</span>
                  <span className="absolute top-0 -right-10 font-mono text-[14px] text-primary">{height}mm</span>
                  <div className="absolute inset-0 bg-primary/5" />
                </div>
                <div className="absolute inset-0 scan-line opacity-40 top-1/2 animate-laser-sweep" />
              </div>

              <dl className="space-y-3 mb-8 font-mono text-sm">
                <Row k="Material" v={material} />
                <Row k="Thickness" v={thickness} />
                <Row k="Dimensions" v={`${width} × ${height} mm`} />
                <Row k="Quantity" v={String(qty)} />
              </dl>

              <div className="mt-auto pt-6 border-t border-border">
                <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  Estimated
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold text-primary text-glow">
                    €{estimate.toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">approx.</span>
                </div>
                <button className="mt-6 w-full py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition blue-glow">
                  Initiate Quote →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[14px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}

function Slider({ value, min, max, step, onChange, ariaLabel }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; ariaLabel?: string }) {
  return (
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(+e.target.value)}
      aria-label={ariaLabel}
      className="w-full accent-primary"
    />
  );
}
